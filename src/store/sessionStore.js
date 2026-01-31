import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  token: null,
  user: null,

  login: ({ token, user }) =>
    set({ token, user }),

  logout: () =>
    set({ token: null, user: null }),
}));
