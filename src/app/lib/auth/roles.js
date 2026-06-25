export const USER_ROLES = Object.freeze({
  ADMIN: "ADMIN",
  KITCHEN: "KITCHEN",
  CASHIER: "CASHIER",
});

export const ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

const NAV_ICON_MAP = Object.freeze({
  home: "home",
  orders: "cash-register",
  "active-orders": "receipt-2",
  products: "package",
  ingredients: "salt",
  settings: "settings",
  kitchen: "chef-hat",
  users: "users",
  floor: "layout-grid",
});

const buildNavItem = (label, href, iconKey) => ({
  label,
  href,
  icon: NAV_ICON_MAP[iconKey],
});

export const NAV_BY_ROLE = Object.freeze({
  [USER_ROLES.ADMIN]: [
    buildNavItem("Home", "/dashboard", "home"),
    buildNavItem("Orders", "/orders", "orders"),
    buildNavItem("Active Orders", "/active-orders", "active-orders"),
    buildNavItem("Products", "/products", "products"),
    buildNavItem("Ingredients", "/ingredients", "ingredients"),
    buildNavItem("Settings", "/settings", "settings"),
    buildNavItem("Kitchen", "/kitchen", "kitchen"),
    buildNavItem("Users", "/users", "users"),
    buildNavItem("Floor", "/floor", "floor"),
  ],
  [USER_ROLES.KITCHEN]: [buildNavItem("Kitchen", "/kitchen", "kitchen")],
  [USER_ROLES.CASHIER]: [
    buildNavItem("Orders", "/orders", "orders"),
    buildNavItem("Active Orders", "/active-orders", "active-orders"),
    buildNavItem("Floor", "/floor", "floor"),
  ],
});

export const getRoleNav = (role) => {
  const navItems = NAV_BY_ROLE[role];
  return Array.isArray(navItems) ? navItems : [];
};
