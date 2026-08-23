// Autoguardado con debounce y una sola escritura en vuelo.
//
// La parte que no es obvia es la cola de uno. Sin ella, un arrastre rapido
// dispara varios PUT y el borrador que queda en la base es el de la respuesta
// que llegue ultima, no el ultimo estado del editor: HTTP no garantiza orden de
// llegada. Con la cola, la segunda escritura no arranca hasta que la primera
// termino, y siempre lleva el estado mas nuevo que se conozca en ese momento.
//
// El otro criterio deliberado es que un fallo detiene la cadena. Reintentar
// solo contra un endpoint que falla no lo arregla, esconde el problema, y en
// una perdida de red convierte cada cambio en un pedido mas.
//
// Ronda de arreglo 1: cancel() marcaba el estado como "idle" pero no
// invalidaba la cadena que ya estaba en vuelo. Cuando esa promesa vieja
// terminaba -resuelta o rechazada, no importa- seguia escribiendo sobre las
// mismas variables compartidas y resucitaba un estado que ya se habia
// descartado. La solucion es un numero de generacion: cada cancel() lo
// avanza, y una cadena que llega al final (o al catch) en una generacion
// distinta a la vigente no toca nada del estado compartido.
//
// Ronda de arreglo 2: la primera version de ese arreglo reencadenaba el
// trabajo que quedaba pendiente tras una cancelacion desde el callback de
// finally(), sin que nadie lo esperara. Eso rompia a flush(): la promesa que
// flush() espera (inFlight) se resolvia en cuanto la cadena vieja terminaba,
// ANTES de que el guardado nuevo -disparado por afuera, en el finally-
// terminara. flush() devolvia true con un save real todavia viajando. Ahora
// start() es una unica funcion asincronica: si al terminar la cadena queda
// trabajo pendiente, lo relanza con "await start()" DENTRO de la misma
// promesa que ya se le entrego al que llamo. Nadie que este esperando esa
// promesa puede ver un resultado antes de que toda la cadena -incluida
// cualquier continuacion- haya terminado de verdad. De paso, como esa promesa
// se reserva de forma sincronica antes de tocar runChain, una reentrada
// durante el prologo sincronico (por ejemplo un retry() disparado desde el
// propio onStatusChange) recibe esa promesa real en vez de null.
//
// Ronda de arreglo 3: runChain atrapa los errores de save(), pero no
// atrapaba los de setStatus() -que llama a onStatusChange, codigo del
// consumidor-. Si onStatusChange throweaba, runChain rechazaba, y como el
// IIFE de start() no tenia try/catch, la promesa publicada en inFlight se
// quedaba pendiente para siempre (resolvePromise nunca se llamaba) y el IIFE
// generaba un rechazo sin manejar. Dos capas de arreglo:
//   1) La raiz: setStatus aisla la llamada a onStatusChange en su propio
//      try/catch. El autoguardado no puede depender de que el indicador de
//      la UI se dibuje bien; un throw ahi no tiene que poder tumbar la
//      maquina de guardado. Con esto, runChain no deberia poder rechazar
//      nunca por esta via.
//   2) Defensa en profundidad: aunque la raiz este cerrada, el cuerpo del
//      IIFE de start() esta en un try/catch que garantiza que la promesa
//      publicada SIEMPRE se asiente -resuelta o rechazada, nunca colgada- por
//      si algun otro camino inesperado (no necesariamente onStatusChange)
//      llega a tirar. Lo que NO garantiza, y las tres versiones anteriores de
//      este comentario afirmaban de mas, es que ese rechazo tenga siempre
//      dueno: el start() que dispara el debounce en schedule() descarta la
//      promesa que devuelve, asi que por ese unico camino un rechazo queda
//      sin manejar. Se deja documentado y no cerrado: la causa raiz conocida
//      esta cubierta por (1), y este modulo ya lleva tres rondas de arreglo.
export function createAutosave({ save, delay = 1500, onStatusChange } = {}) {
  let timer = null;
  let pending = null;
  let hasPendingPayload = false;
  let inFlight = null;
  let saving = false;
  let inFlightGeneration = null;
  let generation = 0;
  let failed = false;
  let status = "idle";

  const setStatus = (next) => {
    if (status === next) {
      return;
    }
    status = next;
    if (onStatusChange) {
      try {
        onStatusChange(next);
      } catch {
        // Se ignora a proposito: es codigo del consumidor (el indicador de
        // la UI), y un fallo ahi no puede romper la maquina de guardado.
      }
    }
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // Un guardado en vuelo solo cuenta si pertenece a la generacion vigente. Uno
  // que quedo huerfano por un cancel() sigue corriendo de verdad (no se puede
  // abortar un fetch que no expone AbortController), pero para el resto del
  // modulo ya no representa trabajo pendiente.
  const isSavingCurrentGeneration = () =>
    saving && inFlightGeneration === generation;

  async function runChain(myGeneration) {
    while (hasPendingPayload && !failed) {
      const payload = pending;
      pending = null;
      hasPendingPayload = false;
      setStatus("saving");

      if (myGeneration !== generation) {
        // Se cancelo de forma sincronica (por ejemplo desde el propio
        // onStatusChange) antes de siquiera llamar a save: ni eso hace falta.
        return false;
      }

      let errored = false;
      try {
        await save(payload);
      } catch {
        errored = true;
      }

      if (myGeneration !== generation) {
        // Esta cadena quedo cancelada mientras el guardado estaba en vuelo.
        // La respuesta -tarde, exitosa o no- ya no representa el estado
        // vigente: no se reencola el payload ni se toca el status.
        return false;
      }

      if (errored) {
        failed = true;
        // Si no llego nada nuevo mientras fallaba, el payload que fallo vuelve
        // a la cola: sin esto, un retry no tendria que reenviar.
        if (!hasPendingPayload) {
          pending = payload;
          hasPendingPayload = true;
        }
        setStatus("error");
        return false;
      }
    }

    if (myGeneration === generation) {
      setStatus("saved");
    }
    return myGeneration === generation;
  }

  function start() {
    if (saving) {
      return inFlight;
    }
    saving = true;
    const myGeneration = generation;
    inFlightGeneration = myGeneration;

    // La promesa se crea y se publica en inFlight de forma sincronica, antes
    // de que runChain corra una sola linea. Asi, cualquier reentrada que
    // ocurra durante el prologo sincronico de runChain (el tramo hasta el
    // primer await save(...)) encuentra el candado (saving) ya cerrado y una
    // promesa de verdad para devolver -nunca null.
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    inFlight = promise;

    (async () => {
      try {
        let result = await runChain(myGeneration).finally(() => {
          saving = false;
          if (inFlightGeneration === myGeneration) {
            inFlightGeneration = null;
          }
        });

        // Si quedo trabajo pendiente de la generacion vigente -incluso por una
        // cancelacion de por medio mientras esta cadena seguia en vuelo-, nadie
        // mas lo va a disparar: el debounce que lo iba a hacer ya se consumio.
        // Se relanza y se espera ACA, dentro de la misma promesa que ya se le
        // entrego a quien llamo a start(): quien este esperando (flush(), por
        // ejemplo) tiene que ver terminar tambien esta continuacion, no solo la
        // cadena original.
        if (hasPendingPayload && !failed) {
          result = await start();
        } else if (inFlight === promise) {
          inFlight = null;
        }

        resolvePromise(result);
      } catch (error) {
        // Defensa en profundidad: con setStatus() aislando a onStatusChange,
        // runChain no deberia poder rechazar nunca. Pero si algo igual revienta
        // aca -un bug futuro, no necesariamente onStatusChange-, la promesa
        // publicada tiene que enterarse: no puede quedar colgada para siempre
        // ni dejar un rechazo sin manejar.
        saving = false;
        if (inFlightGeneration === myGeneration) {
          inFlightGeneration = null;
        }
        if (inFlight === promise) {
          inFlight = null;
        }
        rejectPromise(error);
      }
    })();

    return promise;
  }

  return {
    schedule(payload) {
      pending = payload;
      hasPendingPayload = true;

      if (failed) {
        // En estado de error no se reprograma nada: el cambio queda guardado en
        // memoria y sale cuando el dueño toque "reintentar".
        return;
      }

      if (!isSavingCurrentGeneration()) {
        // Si ya hay un guardado de la generacion vigente en vuelo, el estado
        // tiene que seguir diciendo "saving": bajarlo a "pending" haria
        // parpadear el indicador en cada tecla mientras el PUT sigue viajando.
        setStatus("pending");
      }
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        start();
      }, delay);
    },

    async flush() {
      clearTimer();
      if (saving) {
        await inFlight;
      }
      if (hasPendingPayload && !failed) {
        await start();
      }
      return !failed && !hasPendingPayload;
    },

    async retry() {
      if (!failed && !hasPendingPayload && !isSavingCurrentGeneration()) {
        // No hubo error ni quedo nada sin guardar: no hay nada que reintentar.
        // Resolver true es correcto ("no quedo nada sin guardar"), pero sin
        // tocar el status ni llamar a save -si no, un doble clic en
        // "reintentar" apagaria un cartel de error que ni siquiera existe, o
        // pintaria "guardado" sin haber guardado nada.
        return true;
      }
      failed = false;
      clearTimer();
      return start();
    },

    cancel() {
      generation += 1;
      clearTimer();
      pending = null;
      hasPendingPayload = false;
      failed = false;
      setStatus("idle");
    },

    hasPending() {
      return hasPendingPayload || isSavingCurrentGeneration();
    },

    getStatus() {
      return status;
    },
  };
}
