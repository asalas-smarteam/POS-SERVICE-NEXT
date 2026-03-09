export const ROLE_PERMISSIONS = {
  admin: [
    "dashboard",
    "orders",
    "kitchen",
    "products",
    "ingredients",
    "users",
    "settings",
    "floor",
  ],
  cashier: ["dashboard", "orders", "floor"],
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
