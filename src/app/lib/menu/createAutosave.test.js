import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "@/lib/menu/createAutosave";

// Un `save` controlable a mano: cada llamada queda pendiente hasta que el test
// la resuelve. Es lo que permite probar el solapamiento, que es todo el punto
// de este modulo.
function deferredSaver() {
  const calls = [];
  const save = (payload) => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    calls.push({ payload, resolve, reject });
    return promise;
  };
  return { save, calls };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutosave", () => {
  it("no guarda nada antes de que venza el debounce", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1499);

    expect(calls).toHaveLength(0);
    expect(autosave.getStatus()).toBe("pending");
  });

  it("colapsa varios cambios seguidos en un solo guardado, con el ultimo valor", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(500);
    autosave.schedule({ n: 2 });
    await vi.advanceTimersByTimeAsync(500);
    autosave.schedule({ n: 3 });
    await vi.advanceTimersByTimeAsync(1500);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toEqual({ n: 3 });
  });

  it("nunca tiene dos guardados en vuelo a la vez", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    expect(calls).toHaveLength(1);

    autosave.schedule({ n: 2 });
    await vi.advanceTimersByTimeAsync(1500);

    // El primero sigue sin resolver: el segundo tiene que estar esperando.
    expect(calls).toHaveLength(1);

    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 2 });
  });

  it("encola solo el ultimo cambio, no todos los que llegaron mientras guardaba", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);

    autosave.schedule({ n: 2 });
    autosave.schedule({ n: 3 });
    autosave.schedule({ n: 4 });
    await vi.advanceTimersByTimeAsync(1500);

    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 4 });
  });

  it("pasa a saved cuando no queda nada pendiente", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(autosave.getStatus()).toBe("saved");
    expect(autosave.hasPending()).toBe(false);
  });

  it("un fallo detiene la cadena y no reintenta solo", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].reject(new Error("red caida"));
    await vi.advanceTimersByTimeAsync(0);

    expect(autosave.getStatus()).toBe("error");

    autosave.schedule({ n: 2 });
    await vi.advanceTimersByTimeAsync(10000);

    expect(calls).toHaveLength(1);
    expect(autosave.getStatus()).toBe("error");
  });

  it("retry vuelve a mandar el ultimo estado, no el que fallo", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].reject(new Error("red caida"));
    await vi.advanceTimersByTimeAsync(0);

    autosave.schedule({ n: 2 });
    const retried = autosave.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 2 });

    calls[1].resolve();
    await expect(retried).resolves.toBe(true);
    expect(autosave.getStatus()).toBe("saved");
  });

  it("retry reenvia el payload que fallo si no hubo cambios despues", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].reject(new Error("red caida"));
    await vi.advanceTimersByTimeAsync(0);

    autosave.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls[1].payload).toEqual({ n: 1 });
  });

  it("flush guarda sin esperar el debounce", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    const flushed = autosave.flush();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(1);

    calls[0].resolve();
    await expect(flushed).resolves.toBe(true);
  });

  it("flush espera al guardado en vuelo y despues al encolado", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    autosave.schedule({ n: 2 });

    const flushed = autosave.flush();
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    calls[1].resolve();
    await expect(flushed).resolves.toBe(true);
  });

  it("flush devuelve false si el guardado falla", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    const flushed = autosave.flush();
    await vi.advanceTimersByTimeAsync(0);
    calls[0].reject(new Error("red caida"));

    await expect(flushed).resolves.toBe(false);
  });

  it("flush sin nada pendiente resuelve true sin llamar a save", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    await expect(autosave.flush()).resolves.toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("cancel descarta lo pendiente", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    autosave.cancel();
    await vi.advanceTimersByTimeAsync(5000);

    expect(calls).toHaveLength(0);
    expect(autosave.hasPending()).toBe(false);
  });

  it("avisa cada cambio de estado", async () => {
    const { save, calls } = deferredSaver();
    const seen = [];
    const autosave = createAutosave({
      save,
      delay: 1500,
      onStatusChange: (status) => seen.push(status),
    });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(seen).toEqual(["pending", "saving", "saved"]);
  });
});

// Ronda de arreglo 1: la revision encontro un Critical y tres Important, cada
// uno con un caso reproducible verificado corriendo el codigo viejo. Estos
// tests fijan el comportamiento correcto para que no vuelvan a colarse.
describe("createAutosave — ronda de arreglo 1", () => {
  describe("Critical: cancel() no invalidaba la cadena en vuelo", () => {
    it("un rechazo tardio despues de cancel no reencola el payload cancelado ni revive el estado", async () => {
      const { save, calls } = deferredSaver();
      const autosave = createAutosave({ save, delay: 1500 });

      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500); // save({n:1}) en vuelo
      autosave.cancel();
      expect(autosave.getStatus()).toBe("idle");

      calls[0].reject(new Error("red caida"));
      await vi.advanceTimersByTimeAsync(0);

      // El payload cancelado no puede resucitar en "error" ni volver a la cola.
      expect(autosave.getStatus()).toBe("idle");
      expect(autosave.hasPending()).toBe(false);

      // Confirmacion adicional: un guardado nuevo manda el payload nuevo, no
      // reenvia por atras el {n:1} que quedo huerfano.
      autosave.schedule({ n: 2 });
      await vi.advanceTimersByTimeAsync(1500);

      expect(calls).toHaveLength(2);
      expect(calls[1].payload).toEqual({ n: 2 });
    });

    it("un exito tardio despues de cancel no revive el estado a saved", async () => {
      const { save, calls } = deferredSaver();
      const autosave = createAutosave({ save, delay: 1500 });

      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500); // save({n:1}) en vuelo
      autosave.cancel();

      calls[0].resolve();
      await vi.advanceTimersByTimeAsync(0);

      expect(autosave.getStatus()).toBe("idle");
      expect(autosave.hasPending()).toBe(false);
    });

    it("cancelar con un guardado en vuelo deja hasPending y getStatus consistentes de inmediato", async () => {
      const { save, calls } = deferredSaver();
      const autosave = createAutosave({ save, delay: 1500 });

      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500); // save({n:1}) en vuelo, todavia sin resolver

      autosave.cancel();

      // No hay que esperar a que la promesa vieja resuelva: cancelar tiene que
      // dejar el estado consistente ya mismo.
      expect(autosave.getStatus()).toBe("idle");
      expect(autosave.hasPending()).toBe(false);
    });
  });

  describe("Important: la garantia de 'uno en vuelo' se podia romper por reentrada", () => {
    it("un retry() disparado desde onStatusChange durante el cambio a saving no crea una segunda cadena real", async () => {
      const { save, calls } = deferredSaver();
      let fired = false;
      const autosave = createAutosave({
        save,
        delay: 1500,
        onStatusChange: (s) => {
          if (s === "saving" && !fired) {
            fired = true;
            autosave.retry();
          }
        },
      });

      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500); // dispara start(), retry() reentra durante setStatus("saving")
      expect(calls).toHaveLength(1);

      autosave.schedule({ n: 2 });
      await vi.advanceTimersByTimeAsync(1500);

      // Solo un guardado real en vuelo: el segundo no se manda hasta que el
      // primero (todavia sin resolver) termine.
      expect(calls).toHaveLength(1);
    });
  });

  describe("Important: schedule() durante saving degradaba el estado a pending", () => {
    it("programar un cambio mientras hay un guardado en vuelo mantiene el estado en saving", async () => {
      const { save, calls } = deferredSaver();
      const seen = [];
      const autosave = createAutosave({
        save,
        delay: 1500,
        onStatusChange: (s) => seen.push(s),
      });

      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500); // save({n:1}) en vuelo
      expect(autosave.getStatus()).toBe("saving");

      autosave.schedule({ n: 2 });
      expect(autosave.getStatus()).toBe("saving"); // no tiene que bajar a "pending"

      calls[0].resolve();
      await vi.advanceTimersByTimeAsync(1500);
      calls[1].resolve();
      await vi.advanceTimersByTimeAsync(0);

      expect(seen).toEqual(["pending", "saving", "saved"]);
    });
  });

  describe("Important: retry() sin nada pendiente reportaba exito sin haber guardado nunca", () => {
    it("retry() sin error y sin cambios pendientes no llama a save ni pinta saved", async () => {
      const { save, calls } = deferredSaver();
      const autosave = createAutosave({ save, delay: 1500 });

      await expect(autosave.retry()).resolves.toBe(true);

      expect(calls).toHaveLength(0);
      expect(autosave.getStatus()).toBe("idle");
    });

    it("retry() despues de cancel() en estado de error tampoco guarda ni pinta saved", async () => {
      const { save, calls } = deferredSaver();
      const autosave = createAutosave({ save, delay: 1500 });

      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500);
      calls[0].reject(new Error("red caida"));
      await vi.advanceTimersByTimeAsync(0);
      expect(autosave.getStatus()).toBe("error");

      autosave.cancel();
      expect(autosave.getStatus()).toBe("idle");

      await expect(autosave.retry()).resolves.toBe(true);

      expect(calls).toHaveLength(1); // ningun guardado nuevo
      expect(autosave.getStatus()).toBe("idle");
    });
  });
});

// Ronda de arreglo 2: la re-revision confirmo los cuatro hallazgos de la
// ronda 1 como resueltos, pero encontro una rotura nueva dentro de ese mismo
// arreglo: el reencadenado de trabajo pendiente tras un cancel() colgaba del
// callback de finally() sin que flush() lo esperara.
describe("createAutosave — ronda de arreglo 2", () => {
  it("flush() no resuelve mientras el guardado que reemplaza a uno cancelado sigue en vuelo", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500); // save({n:1}) en vuelo
    autosave.cancel();
    autosave.schedule({ n: 2 });

    const flushed = autosave.flush();
    let settled = false;
    flushed.then(() => {
      settled = true;
    });

    // El guardado huerfano ({n:1}) llega tarde: no puede ser lo que destrabe
    // flush(), porque ya no representa el estado vigente.
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 2 });
    // El guardado real que SI importa ({n:2}) sigue sin resolver: flush() no
    // puede haber terminado todavia.
    expect(settled).toBe(false);

    calls[1].resolve();
    await expect(flushed).resolves.toBe(true);
    expect(settled).toBe(true);
  });

  it("un retry() reentrante durante el prologo sincronico espera al guardado real y no resuelve antes de tiempo (no null)", async () => {
    // Nota sobre esta aserción (ronda 3): `toBeInstanceOf(Promise)` sobre el
    // valor de retorno NO detecta el bug de la ronda 1, porque retry() es
    // `async` y por eso SIEMPRE devuelve una Promise, incluso cuando por
    // adentro start() devolvia `null` (retry() haria `return null;`, y una
    // funcion async que retorna un valor no-thenable sencillamente resuelve
    // su propia promesa con ese valor). Lo que sí distingue el bug es CUÁNDO
    // resuelve: con el bug, resolvía casi al instante (a `null`), sin
    // esperar el guardado real; arreglado, se queda pendiente hasta que el
    // guardado real (deduplicado, un solo `calls[...]`) termina.
    const { save, calls } = deferredSaver();
    const retryResults = [];
    let fired = false;
    const autosave = createAutosave({
      save,
      delay: 1500,
      onStatusChange: (s) => {
        if (s === "saving" && !fired) {
          fired = true;
          // retry() llama a start() reentrante, dentro del propio prologo
          // sincronico de la cadena que dispara este callback.
          retryResults.push(autosave.retry());
        }
      },
    });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);

    expect(retryResults).toHaveLength(1);
    expect(calls).toHaveLength(1); // sigue habiendo un solo guardado real

    let settled = false;
    let settledValue;
    retryResults[0].then((value) => {
      settled = true;
      settledValue = value;
    });

    // Antes de que el guardado real resuelva, la promesa reentrante todavia
    // tiene que seguir viva.
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(settled).toBe(true);
    expect(settledValue).toBe(true);
  });
});

// Ronda de arreglo 3: runChain atrapa los rechazos de save(), pero no los
// throws de setStatus() -que llama a onStatusChange, codigo del consumidor.
// Un throw ahi hacia rechazar runChain; como el IIFE de start() no tenia
// try/catch, la promesa publicada en inFlight quedaba pendiente para siempre
// (nunca se llamaba a resolvePromise) y el IIFE generaba un rechazo sin
// manejar. Afecta justo a flush() ("antes de publicar", "antes de cerrar la
// pestaña") y a retry().
describe("createAutosave — ronda de arreglo 3", () => {
  it("un onStatusChange que lanza en 'saved' no cuelga flush() ni deja un rechazo sin manejar", async () => {
    const { save, calls } = deferredSaver();
    const boom = new Error("boom-saved");
    const autosave = createAutosave({
      save,
      delay: 1500,
      onStatusChange: (s) => {
        if (s === "saved") {
          throw boom;
        }
      },
    });

    const unhandled = [];
    const onUnhandledRejection = (reason) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      autosave.schedule({ n: 1 });
      const flushed = autosave.flush();

      let settled = false;
      let settledValue;
      flushed.then(
        (value) => {
          settled = true;
          settledValue = value;
        },
        (error) => {
          settled = true;
          settledValue = error;
        },
      );

      await vi.advanceTimersByTimeAsync(0); // flush() no espera el debounce
      expect(calls).toHaveLength(1);

      calls[0].resolve();
      await vi.advanceTimersByTimeAsync(0);

      // No puede quedar colgado -ni rechazado-: el autoguardado no depende de
      // que el indicador de la UI se dibuje bien.
      expect(settled).toBe(true);
      expect(settledValue).toBe(true);
      expect(autosave.getStatus()).toBe("saved");
      expect(autosave.hasPending()).toBe(false);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    expect(unhandled).toHaveLength(0);
  });

  it("un onStatusChange que lanza en 'saving' no cuelga retry() ni deja un rechazo sin manejar", async () => {
    const { save, calls } = deferredSaver();
    const boom = new Error("boom-saving");
    let throwOnSaving = false;
    const autosave = createAutosave({
      save,
      delay: 1500,
      onStatusChange: (s) => {
        if (s === "saving" && throwOnSaving) {
          throw boom;
        }
      },
    });

    const unhandled = [];
    const onUnhandledRejection = (reason) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      autosave.schedule({ n: 1 });
      await vi.advanceTimersByTimeAsync(1500);
      calls[0].reject(new Error("red caida"));
      await vi.advanceTimersByTimeAsync(0);
      expect(autosave.getStatus()).toBe("error");

      throwOnSaving = true;
      const retried = autosave.retry();

      let settled = false;
      let settledValue;
      retried.then(
        (value) => {
          settled = true;
          settledValue = value;
        },
        (error) => {
          settled = true;
          settledValue = error;
        },
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toHaveLength(2); // reintento el payload que fallo

      calls[1].resolve();
      await vi.advanceTimersByTimeAsync(0);

      expect(settled).toBe(true);
      expect(settledValue).toBe(true);
      expect(autosave.getStatus()).toBe("saved");
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    expect(unhandled).toHaveLength(0);
  });
});
