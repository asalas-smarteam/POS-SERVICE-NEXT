"use client";

/**
 * Imprime un nodo del DOM (ticket / recibo termico) dentro de un iframe aislado.
 *
 * Por que un iframe y no `window.print()`:
 * el ticket vive dentro de un Dialog de Radix que esta centrado con
 * `transform: translate(-50%, -50%)`. Un `transform` crea un bloque contenedor,
 * asi que cualquier `position: absolute/fixed` del ticket se ancla al dialogo
 * centrado y no a la pagina -> el ticket sale desplazado al centro de la hoja.
 *
 * El iframe nos da un documento limpio: clonamos el nodo, copiamos los estilos
 * (Tailwind + variables de tema) y forzamos `@page { size: 80mm auto; margin: 0 }`
 * para que salga pegado arriba a la izquierda y sin cabeceras del navegador.
 */
export function printThermalNode(node, { width = "80mm" } = {}) {
  if (typeof window === "undefined" || !node) {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDoc) {
    document.body.removeChild(iframe);
    return;
  }

  // Copiar hojas de estilo del documento actual (Tailwind, variables de tema).
  const head = frameDoc.head;
  document
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach((el) => head.appendChild(el.cloneNode(true)));

  const pageStyle = frameDoc.createElement("style");
  pageStyle.textContent = `
    @page { size: ${width} auto; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { width: ${width}; }
    .thermal-print-root { width: ${width}; margin: 0 auto; }
  `;
  head.appendChild(pageStyle);

  // Forzar tema claro (papel blanco) sin arrastrar la clase .dark del padre.
  frameDoc.documentElement.className = "";

  const wrapper = frameDoc.createElement("div");
  wrapper.className = "thermal-print-root";
  wrapper.innerHTML = node.outerHTML;
  frameDoc.body.appendChild(wrapper);

  let hasPrinted = false;
  const triggerPrint = () => {
    if (hasPrinted) {
      return;
    }
    hasPrinted = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      // Dar tiempo al dialogo de impresion antes de limpiar el iframe.
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }
  };

  // Esperar a que carguen las hojas de estilo enlazadas (si las hay).
  const links = Array.from(frameDoc.querySelectorAll('link[rel="stylesheet"]'));
  if (links.length) {
    let pending = links.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        window.setTimeout(triggerPrint, 100);
      }
    };
    links.forEach((link) => {
      link.addEventListener("load", done);
      link.addEventListener("error", done);
    });
    // Salvaguarda por si algun link nunca dispara load/error.
    window.setTimeout(triggerPrint, 800);
  } else {
    window.setTimeout(triggerPrint, 150);
  }
}
