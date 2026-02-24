import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

export function createJSONStorage(getStorage) {
  return {
    getItem: (name) => {
      const storage = getStorage?.();
      if (!storage) {
        return null;
      }

      const value = storage.getItem(name);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      const storage = getStorage?.();
      if (!storage) {
        return;
      }

      storage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name) => {
      const storage = getStorage?.();
      storage?.removeItem(name);
    },
  };
}

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

      if (typeof storage.setItem === "function") {
        storage.setItem(options.name, state);
        return;
      }

      window?.localStorage?.setItem?.(options.name, JSON.stringify(state));
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
        hasHydrated = true;
        if (typeof postRehydrate === "function") {
          postRehydrate(get());
        }
        return;
      }

      let stored = storage.getItem(options.name);

      if (typeof stored === "string") {
        try {
          stored = JSON.parse(stored);
        } catch {
          stored = null;
        }
      }

      if (stored) {
        // Merge persisted data to keep store methods intact.
        set((currentState) => ({ ...currentState, ...stored }));
      }
      hasHydrated = true;
      if (typeof postRehydrate === "function") {
        postRehydrate(get());
      }
    };

    api.persist = {
      rehydrate,
      hasHydrated: () => hasHydrated,
      clearStorage: () => storage?.removeItem?.(options.name),
    };

    const state = config(setState, get, api);
    if (!options.skipHydration) {
      rehydrate();
    }

    return state;
  };
}
