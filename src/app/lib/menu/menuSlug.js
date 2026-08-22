export const MENU_SLUG_MIN = 3;
export const MENU_SLUG_MAX = 40;

export const MENU_SLUG_ERRORS = Object.freeze({
  TOO_SHORT: "slug_too_short",
  TOO_LONG: "slug_too_long",
  INVALID: "slug_invalid",
  TAKEN: "slug_taken",
});

// Grupos alfanumericos separados por un solo guion: cubre a la vez el set de
// caracteres, el guion al borde y los guiones dobles.
const MENU_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeMenuSlug(value) {
  return String(value ?? "").trim().toLowerCase();
}

// Devuelve un codigo de error o null. Codigo y no frase: el formulario lo
// traduce, para que el servidor no imponga el idioma de la interfaz.
export function validateMenuSlug(value) {
  const slug = normalizeMenuSlug(value);

  if (slug.length < MENU_SLUG_MIN) {
    return MENU_SLUG_ERRORS.TOO_SHORT;
  }

  if (slug.length > MENU_SLUG_MAX) {
    return MENU_SLUG_ERRORS.TOO_LONG;
  }

  if (!MENU_SLUG_PATTERN.test(slug)) {
    return MENU_SLUG_ERRORS.INVALID;
  }

  return null;
}
