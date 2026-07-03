const TAB_PAGE_URLS = new Set([
  '/pages/groupOrder/index',
  '/pages/customerOrders/index',
  '/pages/productManagement/index',
  '/pages/my/index',
]);

const DEFAULT_TAB_URL = '/pages/my/index';

export const normalizeRouteUrl = (value, fallback = DEFAULT_TAB_URL) => {
  let decoded = '';
  try {
    decoded = decodeURIComponent(String(value || '')).trim();
  } catch (err) {
    decoded = '';
  }
  if (!decoded || decoded.indexOf('/') !== 0 || decoded.indexOf('//') === 0) return fallback;
  if (decoded.includes('..')) return fallback;
  return decoded;
};

const getRoutePath = url => normalizeRouteUrl(url).split('?')[0];

export const isTabPageUrl = url => TAB_PAGE_URLS.has(getRoutePath(url));

export const navigateByUrl = (url, options = {}) => {
  const normalizedUrl = normalizeRouteUrl(url, options.fallbackUrl || DEFAULT_TAB_URL);
  const fallbackUrl = normalizeRouteUrl(options.fallbackUrl || DEFAULT_TAB_URL);
  const isTabPage = isTabPageUrl(normalizedUrl);
  const method = isTabPage ? wx.switchTab : wx.navigateTo;
  method({
    url: isTabPage ? getRoutePath(normalizedUrl) : normalizedUrl,
    events: isTabPage ? undefined : options.events,
    success: options.success,
    complete: options.complete,
    fail: () => {
      if (options.fail) {
        options.fail();
        return;
      }
      wx.switchTab({ url: fallbackUrl });
    },
  });
};

export const redirectByUrl = (url, options = {}) => {
  const normalizedUrl = normalizeRouteUrl(url, options.fallbackUrl || DEFAULT_TAB_URL);
  const fallbackUrl = normalizeRouteUrl(options.fallbackUrl || DEFAULT_TAB_URL);
  if (isTabPageUrl(normalizedUrl)) {
    wx.switchTab({
      url: getRoutePath(normalizedUrl),
      success: options.success,
      complete: options.complete,
      fail: () => wx.switchTab({ url: fallbackUrl }),
    });
    return;
  }
  wx.redirectTo({
    url: normalizedUrl,
    success: options.success,
    complete: options.complete,
    fail: () => wx.switchTab({ url: fallbackUrl }),
  });
};

export const navigateBackOrTab = (fallbackUrl = '/pages/groupOrder/index') => {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: normalizeRouteUrl(fallbackUrl, '/pages/groupOrder/index') }),
    });
    return;
  }
  wx.switchTab({ url: normalizeRouteUrl(fallbackUrl, '/pages/groupOrder/index') });
};
