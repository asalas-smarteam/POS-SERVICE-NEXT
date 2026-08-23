import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";
import { defaultLocale } from "../../../../i18n";

// El menu publico vive fuera de [locale] y siempre formatea con el locale por
// defecto. La vista previa del editor, en cambio, corre dentro de [locale], asi
// que si formateara con el locale de la sesion un dueño en ingles veria numeros
// distintos de los que ve su cliente. Por eso las dos vistas pasan por aca.
export function createMenuPriceFormatter(currency) {
  return (amount) => formatCurrencyAmount(amount, currency, defaultLocale);
}
