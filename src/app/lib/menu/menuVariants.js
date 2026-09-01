// Las variantes de presentacion del bloque de categoria. Viven en su propio
// modulo y no en menuSchema.js porque son dos consumidores con necesidades
// distintas: el editor necesita el CATALOGO para armar el select, el
// renderizador necesita solo despachar. Metidas en el esquema, la pagina
// publica importaria tambien la logica de "que le ofrezco al dueno".
export const MENU_VARIANTS = Object.freeze([
  "sizeRows",
  "priceColumns",
  "sizeTable",
  "sizeBadges",
]);

// Reproduce exactamente lo que el renderizador hacia antes de 1b-2. Es toda la
// garantia de compatibilidad de los menus ya publicados: un bloque guardado sin
// `variant` tiene que salir identico, y por eso MENU_SCHEMA_VERSION se pudo
// quedar en 1 sin migracion. No cambiar sin una migracion que lo acompane.
export const DEFAULT_VARIANT = "sizeRows";

export function normalizeVariant(value) {
  return MENU_VARIANTS.includes(value) ? value : DEFAULT_VARIANT;
}

// Una categoria sin talles no tiene nada que elegir: las cuatro variantes se
// distinguen justamente por como muestran los talles. Lo usa el editor para
// decidir si dibuja el select; el renderizador no lo consulta, porque ya
// despacha por `hasSizes`.
//
// La comparacion es estricta (=== true) igual que en renderableBlocks: hasSizes
// sale de un ajuste Mixed y un flag ausente o mal escrito no debe alcanzar para
// ofrecer un selector que despues no aplica.
export function variantsForCategory(hasSizes) {
  return hasSizes === true ? [...MENU_VARIANTS] : [];
}

// priceColumns alinea los precios de cada talle a lo ancho de la seccion.
// Partida en dos columnas deja cuatro numeros en ~110px de un celular y se
// vuelve ilegible, asi que el editor esconde el control en vez de ofrecerlo e
// ignorarlo despues. Un valor desconocido se juzga por el default, que si la
// admite: normalizeVariant ya lo convirtio.
export function supportsColumns(variant) {
  return normalizeVariant(variant) !== "priceColumns";
}
