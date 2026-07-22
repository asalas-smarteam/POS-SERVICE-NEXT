export const filterCompatibleHalfProducts = ({ products, currentProduct }) => {
  const productList = Array.isArray(products) ? products : [];
  const currentProductId =
    currentProduct?.productId ?? currentProduct?._id ?? currentProduct?.id;

  return productList.filter((product) => {
    if (!product?.allowsHalf) {
      return false;
    }

    const candidateId = product?._id ?? product?.id;
    if (!candidateId || candidateId === currentProductId) {
      return false;
    }

    if (!currentProduct?.sizeId || product.sizeId !== currentProduct.sizeId) {
      return false;
    }

    // Portion (Settings > Product Sizes), e.g. Pequeña/Mediana/Grande — must
    // match exactly, including when neither product has a portion set.
    if ((product?.productSizeId ?? null) !== (currentProduct?.productSizeId ?? null)) {
      return false;
    }

    if (
      currentProduct?.categoryId &&
      product?.categoryId &&
      product.categoryId !== currentProduct.categoryId
    ) {
      return false;
    }

    return true;
  });
};
