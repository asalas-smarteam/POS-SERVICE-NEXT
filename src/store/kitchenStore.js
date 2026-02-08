import { create } from "./zustand";
import { useAuthStore } from "./authStore";

const getTenantHeader = () => {
  const tenant = useAuthStore.getState().tenant;
  const tenantSlug = tenant?.slug ?? tenant ?? null;
  return tenantSlug ? { "x-tenant": tenantSlug } : {};
};

const normalizeTicketId = (ticket) => ticket?._id ?? ticket?.id;

export const useKitchenStore = create((set, get) => ({
  tickets: [],
  loading: false,
  error: null,
  now: Date.now(),
  timerId: null,
  startTimer: () => {
    const existing = get().timerId;
    if (existing) {
      return;
    }
    const id = setInterval(() => {
      set({ now: Date.now() });
    }, 1000);
    set({ timerId: id });
  },
  stopTimer: () => {
    const id = get().timerId;
    if (id) {
      clearInterval(id);
    }
    set({ timerId: null });
  },
  fetchTickets: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/kitchen", {
        headers: {
          ...getTenantHeader(),
        },
      });
      if (!response.ok) {
        throw new Error("No se pudieron cargar los tickets.");
      }
      const data = await response.json();
      set({ tickets: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      set({
        error: error?.message || "Error al cargar tickets.",
        loading: false,
      });
    }
  },
  updateTicketStatus: async (ticketId, status) => {
    const previousTickets = get().tickets;
    const normalizedId = String(ticketId);

    set({
      tickets: previousTickets.map((ticket) =>
        String(normalizeTicketId(ticket)) === normalizedId
          ? { ...ticket, status }
          : ticket
      ),
    });

    try {
      const response = await fetch(`/api/kitchen/${ticketId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeader(),
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado.");
      }
      const updated = await response.json();
      set({
        tickets: get().tickets.map((ticket) =>
          String(normalizeTicketId(ticket)) === normalizedId ? updated : ticket
        ),
      });
      return { ok: true };
    } catch (error) {
      set({ tickets: previousTickets });
      return { ok: false, message: error?.message };
    }
  },
}));
