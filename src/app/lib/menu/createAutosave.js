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
export function createAutosave({ save, delay = 1500, onStatusChange } = {}) {
  let timer = null;
  let pending = null;
  let hasPendingPayload = false;
  let inFlight = null;
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

  async function runChain() {
    while (hasPendingPayload && !failed) {
      const payload = pending;
      pending = null;
      hasPendingPayload = false;
      setStatus("saving");

      try {
        await save(payload);
      } catch {
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

    if (!failed) {
      setStatus("saved");
    }
    return !failed;
  }

  function start() {
    if (inFlight) {
      return inFlight;
    }
    inFlight = runChain().finally(() => {
      inFlight = null;
    });
    return inFlight;
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

      setStatus("pending");
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        start();
      }, delay);
    },

    async flush() {
      clearTimer();
      if (inFlight) {
        await inFlight;
      }
      if (hasPendingPayload && !failed) {
        await start();
      }
      return !failed && !hasPendingPayload;
    },

    async retry() {
      failed = false;
      clearTimer();
      return start();
    },

    cancel() {
      clearTimer();
      pending = null;
      hasPendingPayload = false;
      failed = false;
      setStatus("idle");
    },

    hasPending() {
      return hasPendingPayload || Boolean(inFlight);
    },

    getStatus() {
      return status;
    },
  };
}
