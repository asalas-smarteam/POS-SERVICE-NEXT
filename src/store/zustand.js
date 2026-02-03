import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

export function create(createState) {
  let state;
  const listeners = new Set();

  const setState = (partial, replace) => {
    const nextState =
      typeof partial === "function" ? partial(state) : partial;
    if (Object.is(nextState, state)) {
      return;
    }
    state = replace ? nextState : { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  };

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api = { setState, getState, subscribe };
  state = createState(setState, getState, api);

  const useStore = (selector = (storeState) => storeState) => {
    return useSyncExternalStoreWithSelector(
      subscribe,
      getState,
      getState,
      selector,
      Object.is
    );
  };

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}

export function persist(config, options) {
  return (set, get, api) => {
    const storage =
      options.storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    let hasHydrated = false;

    const setItem = () => {
      if (!storage) {
        return;
      }
      const state = options.partialize ? options.partialize(get()) : get();
      storage.setItem(options.name, JSON.stringify(state));
    };

    const setState = (partial, replace) => {
      set(partial, replace);
      setItem();
    };

    const postRehydrate = options.onRehydrateStorage
      ? options.onRehydrateStorage(set, get)
      : undefined;

    const rehydrate = () => {
      if (!storage) {
        return;
      }
      const stored = storage.getItem(options.name);
      if (stored) {
        const data = JSON.parse(stored);
        // Merge persisted data to keep store methods intact.
        set((currentState) => ({ ...currentState, ...data }));
      }
      hasHydrated = true;
      if (typeof postRehydrate === "function") {
        postRehydrate(get());
      }
    };

    api.persist = {
      rehydrate,
      hasHydrated: () => hasHydrated,
      clearStorage: () => storage?.removeItem(options.name),
    };

    const state = config(setState, get, api);
    if (!options.skipHydration) {
      rehydrate();
    }

    return state;
  };
}
