const TAB_PAGE_URLS = new Set([
  '/pages/groupOrder/index',
  '/pages/customerOrders/index',
  '/pages/productManagement/index',
  '/pages/userReview/index',
  '/pages/my/index',
]);

const DEFAULT_TAB_URL = '/pages/my/index';
const TAB_ROUTE_QUERY_PREFIX = 'dao_you_ling_tab_route_query:';

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
const getRouteQuery = url => {
  const parts = normalizeRouteUrl(url).split('?');
  return parts.length > 1 ? parts.slice(1).join('?') : '';
};

export const isTabPageUrl = url => TAB_PAGE_URLS.has(getRoutePath(url));

const openFallbackUrl = (url) => {
  const normalizedUrl = normalizeRouteUrl(url, DEFAULT_TAB_URL);
  if (isTabPageUrl(normalizedUrl)) {
    wx.switchTab({ url: getRoutePath(normalizedUrl) });
    return;
  }
  wx.redirectTo({
    url: normalizedUrl,
    fail: () => wx.switchTab({ url: DEFAULT_TAB_URL }),
  });
};

const rememberTabRouteQuery = (url) => {
  const routePath = getRoutePath(url);
  const query = getRouteQuery(url);
  if (!query) return;
  try {
    wx.setStorageSync(`${TAB_ROUTE_QUERY_PREFIX}${routePath}`, query);
  } catch (err) {
    // Best effort only; the tab still opens even if storage is unavailable.
  }
};

export const consumeTabRouteQuery = (routePath) => {
  const normalizedPath = getRoutePath(routePath);
  const key = `${TAB_ROUTE_QUERY_PREFIX}${normalizedPath}`;
  try {
    const query = wx.getStorageSync(key) || '';
    if (query) wx.removeStorageSync(key);
    return query;
  } catch (err) {
    return '';
  }
};

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value || '');
  } catch (err) {
    return '';
  }
};

export const parseRouteQuery = (query = '') => String(query || '')
  .split('&')
  .filter(Boolean)
  .reduce((params, pair) => {
    const [rawKey, ...rawValue] = pair.split('=');
    const key = safeDecode(rawKey);
    if (!key) return params;
    return {
      ...params,
      [key]: safeDecode(rawValue.join('=')),
    };
  }, {});

export const navigateByUrl = (url, options = {}) => {
  const normalizedUrl = normalizeRouteUrl(url, options.fallbackUrl || DEFAULT_TAB_URL);
  const fallbackUrl = normalizeRouteUrl(options.fallbackUrl || DEFAULT_TAB_URL);
  const isTabPage = isTabPageUrl(normalizedUrl);
  if (isTabPage) rememberTabRouteQuery(normalizedUrl);
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
      openFallbackUrl(fallbackUrl);
    },
  });
};

export const redirectByUrl = (url, options = {}) => {
  const normalizedUrl = normalizeRouteUrl(url, options.fallbackUrl || DEFAULT_TAB_URL);
  const fallbackUrl = normalizeRouteUrl(options.fallbackUrl || DEFAULT_TAB_URL);
  if (isTabPageUrl(normalizedUrl)) {
    rememberTabRouteQuery(normalizedUrl);
    wx.switchTab({
      url: getRoutePath(normalizedUrl),
      success: options.success,
      complete: options.complete,
      fail: () => openFallbackUrl(fallbackUrl),
    });
    return;
  }
  wx.redirectTo({
    url: normalizedUrl,
    success: options.success,
    complete: options.complete,
    fail: () => openFallbackUrl(fallbackUrl),
  });
};

export const navigateBackOrTab = (fallbackUrl = DEFAULT_TAB_URL) => {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    wx.navigateBack({
      delta: 1,
      fail: () => openFallbackUrl(fallbackUrl),
    });
    return;
  }
  openFallbackUrl(fallbackUrl);
};
