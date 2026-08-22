// Registro de features: fuente unica de verdad de "que modulos existen" y de
// como se resuelve el set de entitlements de una cuenta.
//
// Cada ruta del dashboard es un feature vendible. Antes de este archivo la
// lista de modulos estaba duplicada en cuatro lugares (PROTECTED_MODULES,
// ROLE_PERMISSIONS, MODULE_ROUTES del nav y el whitelist del layout) y ya
// habian divergido: 'floor' faltaba en PROTECTED_MODULES, por lo que la pagina
// no pasaba por el chequeo del middleware. Todas derivan de aca.
//
// Puro/isomorfico a proposito: lo importan tanto el middleware (edge) como
// componentes cliente, asi que no puede tocar mongoose ni node builtins.

export const FEATURE_DEFINITIONS = Object.freeze([
  { key: "orders", requiredForCustom: true },
  { key: "active-orders", requiredForCustom: true },
  { key: "products", requiredForCustom: true },
  // Hoy incluido en todos los planes. Marcado como toggleable para dejar
  // preparada la variante en la que un producto se crea sin receta.
  { key: "ingredients", toggleable: true },
  // Parte del funcionamiento base del sistema: nunca se selecciona ni se cobra,
  // se inyecta siempre en el set resuelto.
  { key: "settings", alwaysOn: true },
  { key: "users", alwaysOn: true },
  { key: "dashboard" },
  { key: "floor" },
  { key: "kitchen" },
  // Modulo vendible sin ruta de sede: el editor vive en el panel del dueño y la
  // pagina publica en /m/<slug>. Por eso no entra en PROTECTED_MODULES ni en
  // ROLE_PERMISSIONS, que son ejes de sede.
  { key: "online-menu", companyScoped: true },
]);

export const ALL_FEATURE_KEYS = Object.freeze(
  FEATURE_DEFINITIONS.map((feature) => feature.key)
);

export const ALWAYS_ON_FEATURES = Object.freeze(
  FEATURE_DEFINITIONS.filter((feature) => feature.alwaysOn).map((feature) => feature.key)
);

// El plan custom permite armar el set a medida, pero sin estos tres no hay POS
// que funcione: no se puede vender sin tomar la orden, verla activa y tener
// productos que vender.
export const CUSTOM_REQUIRED_FEATURES = Object.freeze(
  FEATURE_DEFINITIONS.filter((feature) => feature.requiredForCustom).map((feature) => feature.key)
);

// Features que un cliente puede elegir o comprar sueltos: todo lo que no es
// alwaysOn. Es el catalogo del plan custom y de los add-ons.
export const SELECTABLE_FEATURE_KEYS = Object.freeze(
  ALL_FEATURE_KEYS.filter((key) => !ALWAYS_ON_FEATURES.includes(key))
);

// Features que se administran a nivel empresa y no tienen ruta de sede. Se
// venden igual, pero no son un modulo del dashboard de una sede.
export const COMPANY_SCOPED_FEATURES = Object.freeze(
  FEATURE_DEFINITIONS.filter((feature) => feature.companyScoped).map((feature) => feature.key)
);

// Las que si son una ruta de sede. Es lo que deben consumir el matcher de rutas
// protegidas y los permisos por rol: derivar de ALL_FEATURE_KEYS haria que el
// middleware protegiera rutas que no existen.
export const SEDE_ROUTE_FEATURE_KEYS = Object.freeze(
  ALL_FEATURE_KEYS.filter((key) => !COMPANY_SCOPED_FEATURES.includes(key))
);

export const isCompanyScopedFeature = (key) =>
  typeof key === "string" && COMPANY_SCOPED_FEATURES.includes(key);

// Extrae la key del feature de un href de navegacion ("/orders" -> "orders",
// "/es/kitchen/t123" -> "kitchen"). "home" es un alias historico de dashboard.
export const moduleFromHref = (href) => {
  const path = String(href ?? "").toLowerCase();
  const segments = path.split("/").filter(Boolean);

  for (const segment of segments) {
    const key = segment === "home" ? "dashboard" : segment;
    if (ALL_FEATURE_KEYS.includes(key)) {
      return key;
    }
  }

  return null;
};

export const isKnownFeature = (key) =>
  typeof key === "string" && ALL_FEATURE_KEYS.includes(key);

export const getFeatureDefinition = (key) =>
  FEATURE_DEFINITIONS.find((feature) => feature.key === key) ?? null;

// Unico lugar donde se calcula un set de entitlements. Descarta claves
// desconocidas, inyecta los alwaysOn y ordena segun el registro para que dos
// sets equivalentes sean siempre identicos (comparables con ===  tras join).
export function resolveFeatures(list) {
  const requested = new Set(
    (Array.isArray(list) ? list : []).filter((key) => isKnownFeature(key))
  );

  for (const key of ALWAYS_ON_FEATURES) {
    requested.add(key);
  }

  return ALL_FEATURE_KEYS.filter((key) => requested.has(key));
}

export function hasFeature(features, key) {
  if (!isKnownFeature(key)) {
    return false;
  }

  // Los alwaysOn no dependen de que alguien los haya marcado: un set vacio o
  // corrupto no puede dejar a una cuenta sin ajustes ni usuarios.
  if (ALWAYS_ON_FEATURES.includes(key)) {
    return true;
  }

  return Array.isArray(features) && features.includes(key);
}

// Devuelve un string de error o null, siguiendo la convencion de
// validateOrderTypes en lib/tenant/orderTypeSettings.js.
export function validateCustomFeatures(list) {
  if (!Array.isArray(list)) {
    return "features must be an array";
  }

  const unknown = list.find((key) => !isKnownFeature(key));
  if (unknown) {
    return `unknown feature '${unknown}'`;
  }

  const resolved = resolveFeatures(list);

  for (const required of CUSTOM_REQUIRED_FEATURES) {
    if (!resolved.includes(required)) {
      return `features must include '${required}'`;
    }
  }

  return null;
}
