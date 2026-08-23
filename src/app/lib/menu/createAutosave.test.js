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
