import Image from "next/image";

export function HeroBlock({ data }) {
  if (!data.title && !data.subtitle) {
    return null;
  }

  return (
    <header className="border-b border-neutral-200 px-5 py-10 text-center">
      {data.title ? (
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{data.title}</h1>
      ) : null}
      {data.subtitle ? (
        <p className="mt-2 text-sm text-neutral-500">{data.subtitle}</p>
      ) : null}
    </header>
  );
}

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

export function FooterBlock({ data }) {
  if (!data.text && !data.phone && !data.address) {
    return null;
  }

  return (
    <footer className="border-t border-neutral-200 px-5 py-8 text-center text-sm text-neutral-500">
      {data.text ? <p>{data.text}</p> : null}
      {data.address ? <p className="mt-1">{data.address}</p> : null}
      {data.phone ? (
        <p className="mt-1">
          <a className="underline" href={`tel:${data.phone}`}>{data.phone}</a>
        </p>
      ) : null}
    </footer>
  );
}
