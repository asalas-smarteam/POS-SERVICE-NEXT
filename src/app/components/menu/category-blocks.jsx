import Image from "next/image";

// Los renderizadores del bloque de categoria viven aparte del despacho: son la
// parte que crece con cada variante de presentacion, y el despacho es la parte
// que tiene que seguir siendo legible de una sola mirada.

export function CategoryBlock({ label, products, showPhotos, showDescriptions, formatPrice }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <ul className="space-y-4">
        {products.map((product) => (
          <li key={product.id} className="flex gap-4">
            {showPhotos && product.image?.url ? (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={product.image.url}
                  alt={product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-neutral-900">{product.name}</p>
                <p className="shrink-0 font-semibold text-neutral-900 tabular-nums">
                  {formatPrice(product.price)}
                </p>
              </div>
              {showDescriptions && product.description ? (
                <p className="mt-1 text-sm text-neutral-500">{product.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Categorias con talles: un plato, varias filas de talle+precio debajo, en
// vez de repetir el plato una vez por talle (ver el agrupado en page.jsx).
export function SizedCategoryBlock({ label, dishes, showPhotos, showDescriptions, formatPrice }) {
  if (!dishes.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <ul className="space-y-5">
        {dishes.map((dish) => (
          <li key={dish.id} className="flex gap-4">
            {showPhotos && dish.image?.url ? (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={dish.image.url}
                  alt={dish.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-900">{dish.name}</p>
              {showDescriptions && dish.description ? (
                <p className="mt-1 text-sm text-neutral-500">{dish.description}</p>
              ) : null}
              <ul className="mt-2 space-y-1">
                {dish.sizes.map((size) => (
                  <li key={size.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-neutral-500">{size.label}</span>
                    <span className="shrink-0 font-semibold text-neutral-900 tabular-nums">
                      {formatPrice(size.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Un Map indexado por sizeId descarta en silencio cualquier entrada repetida
// -se queda con la ultima-, y groupProductsBySize agrupa solo por nombre
// recortado (no hay indice unico sobre categoria+nombre+talle en Product), asi
// que dos productos distintos con el mismo nombre y el mismo talle SI pueden
// llegar aca. Sumale los talles que no resuelven en el ajuste, que tampoco
// pueden tener columna propia (no hay etiqueta para encabezarla, y dos talles
// borrados distintos colisionarian en el mismo lugar). Partir los precios del
// plato en una sola pasada es la unica forma de que ninguno de los dos casos
// desaparezca: lo que no consigue celda se muestra suelto junto al nombre.
// Perder un precio de un menu publico es peor que mostrarlo sin etiqueta.
function splitDishPrices(dish) {
  const inColumns = new Map();
  const loose = [];

  for (const size of dish.sizes) {
    if (size.sizeId && !inColumns.has(size.sizeId)) {
      inColumns.set(size.sizeId, size.price);
    } else {
      loose.push(size);
    }
  }

  return { inColumns, loose };
}

function SizePricePair({ size, formatPrice }) {
  return (
    <span className="whitespace-nowrap">
      {size.label ? <span className="text-neutral-500">{size.label} </span> : null}
      <span className="font-semibold text-neutral-900 tabular-nums">{formatPrice(size.price)}</span>
    </span>
  );
}

// Encabezado con los talles y cada plato con sus precios alineados en columnas.
// No admite doble columna: su razon de ser es alinear los precios a lo ancho de
// la seccion, y partida en dos deja cuatro numeros en ~110px de un celular.
export function PriceColumnsBlock({ label, dishes, sizeColumns, showDescriptions, formatPrice }) {
  if (!dishes.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th scope="col" className="py-2 text-left font-medium">
                {label}
              </th>
              {sizeColumns.map((size) => (
                <th key={size.sizeId} scope="col" className="py-2 pl-3 text-right font-medium">
                  {size.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dishes.map((dish) => {
              const { inColumns, loose } = splitDishPrices(dish);

              return (
                <tr key={dish.id} className="border-b border-neutral-100 align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    <p className="font-medium text-neutral-900">{dish.name}</p>
                    {showDescriptions && dish.description ? (
                      <p className="mt-0.5 text-xs text-neutral-500">{dish.description}</p>
                    ) : null}
                    {loose.map((size) => (
                      <p key={size.id} className="mt-0.5 text-xs">
                        <SizePricePair size={size} formatPrice={formatPrice} />
                      </p>
                    ))}
                  </th>
                  {sizeColumns.map((size) => (
                    <td
                      key={size.sizeId}
                      className="py-2 pl-3 text-right font-semibold text-neutral-900 tabular-nums"
                    >
                      {inColumns.has(size.sizeId) ? formatPrice(inColumns.get(size.sizeId)) : ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Tabla de talles y precios una sola vez arriba; los platos van con nombre e
// ingredientes. El plato que se sale de la tabla lleva sus propios precios en su
// renglon: es la unica forma de ofrecer este patron sin mostrarle a nadie un
// precio que su plato no tiene. La decision de si la tabla sirve o no la toma
// buildSizePriceTable; aca solo se dibuja.
export function SizeTableBlock({ label, table, columns, showDescriptions, formatPrice }) {
  if (!table.dishes.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-neutral-100 px-4 py-3 text-sm">
        {table.sizes.map((size) => (
          <SizePricePair key={size.sizeId} size={size} formatPrice={formatPrice} />
        ))}
      </div>
      <ul className={columns === 2 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "space-y-3"}>
        {table.dishes.map((dish) => (
          <li key={dish.id}>
            <p className="font-medium text-neutral-900">{dish.name}</p>
            {showDescriptions && dish.description ? (
              <p className="mt-0.5 text-sm text-neutral-500">{dish.description}</p>
            ) : null}
            {dish.isException ? (
              <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
                {dish.sizes.map((size) => (
                  <SizePricePair key={size.id} size={size} formatPrice={formatPrice} />
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Tarjeta con foto y descripcion, mas un badge por talle con su precio. La foto
// va arriba y a todo el ancho de la tarjeta, no al costado: es lo que distingue
// esta variante de sizeRows.
export function SizeBadgesBlock({
  label,
  dishes,
  columns,
  showPhotos,
  showDescriptions,
  formatPrice,
}) {
  if (!dishes.length) {
    return null;
  }

  const twoUp = columns === 2;

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <ul className={twoUp ? "grid grid-cols-2 gap-3" : "space-y-4"}>
        {dishes.map((dish) => (
          <li key={dish.id} className="rounded-xl border border-neutral-200 p-3">
            {showPhotos && dish.image?.url ? (
              <div
                className={`relative mb-2 w-full overflow-hidden rounded-lg bg-neutral-100 ${
                  twoUp ? "h-24" : "h-36"
                }`}
              >
                <Image
                  src={dish.image.url}
                  alt={dish.name}
                  fill
                  sizes={twoUp ? "45vw" : "(max-width: 640px) 90vw, 600px"}
                  className="object-cover"
                />
              </div>
            ) : null}
            <p className="font-medium text-neutral-900">{dish.name}</p>
            {showDescriptions && dish.description ? (
              <p className="mt-0.5 text-sm text-neutral-500">{dish.description}</p>
            ) : null}
            <p className="mt-2 flex flex-wrap gap-1.5">
              {dish.sizes.map((size) => (
                <span key={size.id} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                  <SizePricePair size={size} formatPrice={formatPrice} />
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
