const PRODUCT_PLACEHOLDER_RE = /^\/static\/(?:logo\/zaoxiaban|avatar1)\.png$/;

export const isProductPlaceholderImage = url => (
  !url || PRODUCT_PLACEHOLDER_RE.test(String(url))
);

export const getProductCoverUrl = (product = {}) => {
  const pictureUrls = Array.isArray(product.pictureUrls) ? product.pictureUrls : [];
  const candidates = [product.coverUrl, ...pictureUrls];
  const usableUrl = candidates.find(url => !isProductPlaceholderImage(url));
  return usableUrl || '';
};

export const normalizeProductImageFields = (product = {}, fallbackText = '暂无商品图片') => {
  const coverUrl = getProductCoverUrl(product);
  const pictureUrls = (Array.isArray(product.pictureUrls) ? product.pictureUrls : [])
    .filter(url => !isProductPlaceholderImage(url));
  let nextPictureUrls = pictureUrls;
  if (!nextPictureUrls.length && coverUrl) {
    nextPictureUrls = [coverUrl];
  }
  const isImageFallback = !coverUrl;

  return {
    ...product,
    coverUrl,
    pictureUrls: nextPictureUrls,
    isImageFallback,
    imageFallbackText: isImageFallback ? (product.imageFallbackText || fallbackText) : '',
  };
};
