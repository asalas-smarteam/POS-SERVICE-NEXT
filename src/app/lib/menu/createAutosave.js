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
// Ronda de arreglo 1 (revision posterior): `cancel()` marcaba el estado como
// "idle" pero no invalidaba la cadena que ya estaba en vuelo. Cuando esa
// promesa vieja terminaba -resuelta o rechazada, no importa- seguia
// escribiendo sobre las mismas variables compartidas y resucitaba un estado
// que ya se habia descartado. La solucion es un numero de generacion: cada
// `cancel()` lo avanza, y una cadena que llega al final (o al catch) en una
// generacion distinta a la vigente no toca nada del estado compartido.
//
// De paso aparecio un segundo problema: `start()` recien marcaba el candado
// de "guardando" (la variable `inFlight`) despues de que `runChain` ya habia
// corrido su prologo sincronico -el que llama a `setStatus("saving")`-, asi
// que una reentrada sincronica (por ejemplo un `retry()` disparado desde el
// propio `onStatusChange`) todavia veia el candado abierto y arrancaba una
// segunda cadena real. Ahora el candado (`saving`) se reserva de forma
// sincronica antes de invocar `runChain`, asi que ninguna reentrada alcanza a
// colarse.
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
      onStatusChange(next);
    }
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // Un guardado en vuelo solo cuenta si pertenece a la generacion vigente. Uno
  // que quedo huerfano por un `cancel()` sigue corriendo de verdad (no se
  // puede abortar un `fetch` que no expone AbortController), pero para el
  // resto del modulo ya no representa trabajo pendiente.
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

    const promise = runChain(myGeneration).finally(() => {
      saving = false;
      if (inFlightGeneration === myGeneration) {
        inFlightGeneration = null;
      }
      if (inFlight === promise) {
        inFlight = null;
      }
      // Si quedo trabajo pendiente de la generacion vigente -incluso por una
      // cancelacion de por medio mientras esta cadena seguia en vuelo-, nadie
      // mas lo va a disparar: el debounce que lo iba a hacer ya se consumio.
      if (hasPendingPayload && !failed) {
        start();
      }
    });

    inFlight = promise;
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
        // Resolver `true` es correcto ("no quedo nada sin guardar"), pero sin
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
