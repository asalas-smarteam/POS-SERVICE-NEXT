import { describe, expect, it } from "vitest";
import { requireRole } from "./authorizeRequest";

describe("requireRole", () => {
  it("deja pasar el rol permitido", () => {
    const payload = { userId: "1", role: "admin" };
    expect(requireRole(payload, ["admin"])).toBe(payload);
  });

  it("normaliza mayusculas en el rol del token y en la lista", () => {
    const payload = { role: "ADMIN" };
    expect(requireRole(payload, ["Admin"])).toBe(payload);
  });

  it("rechaza un rol que no esta en la lista", () => {
    expect(() => requireRole({ role: "cashier" }, ["admin"])).toThrowError(
      expect.objectContaining({ status: 403 })
    );
  });

  it("rechaza cuando el token no trae rol", () => {
    expect(() => requireRole({}, ["admin"])).toThrowError(
      expect.objectContaining({ status: 403 })
    );
  });

  it("rechaza cuando no se declara ninguna lista de roles", () => {
    expect(() => requireRole({ role: "admin" })).toThrowError(
      expect.objectContaining({ status: 403 })
    );
  });
});
