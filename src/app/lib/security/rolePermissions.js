import { ALL_FEATURE_KEYS, hasFeature } from "@/lib/features/featureRegistry";

// Que puede ver cada rol. Es un eje ortogonal al plan contratado: el acceso
// efectivo es la interseccion de este permiso con los features de la cuenta.
export const ROLE_PERMISSIONS = {
  admin: ALL_FEATURE_KEYS,
  cashier: ["dashboard", "orders", "active-orders", "floor"],
  kitchen: ["dashboard", "kitchen"],
};

export const DEFAULT_MODULE_PER_ROLE = {
  admin: "dashboard",
  cashier: "orders",
  kitchen: "kitchen",
};

export const canRoleAccessModule = (role, moduleName) => {
  if (!role || !moduleName) {
    return false;
  }

  const allowedModules = ROLE_PERMISSIONS[role];

  if (!Array.isArray(allowedModules)) {
    return false;
  }

  return allowedModules.includes(moduleName);
};

export const getDefaultModuleForRole = (role) => {
  if (!role) {
    return null;
  }

  return DEFAULT_MODULE_PER_ROLE[role] ?? null;
};

// Modulo al que mandar a alguien que intento entrar donde no puede.
//
// El default del rol no siempre sirve: el default de KITCHEN es 'kitchen', y si
// la cuenta no contrato ese modulo redirigir ahi genera un bucle infinito de
// redirecciones. Por eso se cae al primer modulo que el rol permita y la cuenta
// tenga contratado.
export const resolveFallbackModule = (role, features) => {
  const allowed = ROLE_PERMISSIONS[role];
  if (!Array.isArray(allowed)) {
    return null;
  }

  const preferred = getDefaultModuleForRole(role);
  if (preferred && allowed.includes(preferred) && hasFeature(features, preferred)) {
    return preferred;
  }

  return allowed.find((moduleName) => hasFeature(features, moduleName)) ?? null;
};
