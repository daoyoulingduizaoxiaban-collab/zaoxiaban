/**
 * UI 写流程自测 · 真客户身份 + 分享链接的严格路径。
 *
 * 这条以前列在「不可自动化（需 GUI 重编）」。实际上本机测试身份是存在储存里的
 * （services/auth/localIdentity.js），切完重新登录就生效，不必重编开发者工具——
 * 旧文件讲的「要重编」是指改源码里的 openId，那条路早就被测试身份取代了。
 *
 * owner / admin / 归属团主进下单页会被 getShareAccessError 直接放行，所以这三个
 * 身份**永远测不到** token 校验分支。要覆盖它必须用一个纯 customer 身份。
 *
 * 覆盖三个分支：没带 token → 带错 token → 带对 token 才进得去。
 *
 * 前置：开发者工具开着本专案 ＋ node local-server/server.js
 * 跑法：node local-server/flow-customer-share.js
 */
const ide = require('./lib/ide');

const openOrderPage = async (groupOrderId, shareToken) => {
  const query = shareToken === undefined
    ? `groupOrderId=${encodeURIComponent(groupOrderId)}`
    : `groupOrderId=${encodeURIComponent(groupOrderId)}&shareToken=${encodeURIComponent(shareToken)}`;
  await ide.gotoPage(`/pages/customerOrders/edit/index?${query}`, 'customerOrders/edit');
  await ide.sleep(1200);
  return {
    accessDenied: await ide.getData('accessDenied'),
    pageErrorText: await ide.getData('pageErrorText'),
    rows: await ide.getData('productRows'),
  };
};

let finished = false;

(async () => {
  const stamp = Date.now();
  await ide.ensureLocalOwner();

  // 用 owner 先 seed 一张开放收单的团单，拿到它的分享 token
  const seed = await ide.bd('groupOrders', 'create', {
    title: `分享团${String(stamp).slice(-6)}`, description: '分享路径自测',
    startAt: '2030-09-01 09:00', endAt: '2030-12-31 20:00',
    productList: [{ id: `sh-${stamp}`, title: '样品甲', description: 'd', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10 }] }],
  });
  if (!seed || !seed.success) return ide.reportFailure(`seed 团单失败: ${seed && seed.error}`);
  const groupOrderId = seed.data.id || seed.data._id;
  const shareToken = seed.data.shareToken;
  console.log('seed 团单 OK，shareToken =', shareToken);

  try {
    // 切成一个纯客户身份（客户是预设开放角色，登录即 approved，不需审核）
    const who = await ide.setLocalIdentity(`cust${String(stamp).slice(-6)}`);
    console.log('已切换身份 =', who);

    // ① 不带 token → 应被挡
    const noToken = await openOrderPage(groupOrderId, undefined);
    if (!noToken.accessDenied && !noToken.pageErrorText) {
      throw new Error('客户不带分享 token 竟然进得去下单页');
    }
    console.log('① 不带 token → 被挡：', noToken.pageErrorText || '(accessDenied)');

    // ② 带错 token → 应被挡
    const badToken = await openOrderPage(groupOrderId, 'this-token-is-wrong');
    if (!badToken.accessDenied && !badToken.pageErrorText) {
      throw new Error('客户带错误 token 竟然进得去下单页');
    }
    console.log('② 带错 token → 被挡：', badToken.pageErrorText || '(accessDenied)');

    // ③ 带对 token → 应该进得去，而且看得到在售商品
    const good = await openOrderPage(groupOrderId, shareToken);
    if (good.accessDenied || good.pageErrorText) {
      throw new Error(`客户带正确 token 却进不去：${good.pageErrorText || 'accessDenied'}`);
    }
    if (!Array.isArray(good.rows) || !good.rows.length) {
      throw new Error('带正确 token 进去了但看不到在售商品');
    }
    console.log('③ 带对 token → 进得去，可下单商品数 =', good.rows.length);

    console.log('✅ 客户分享路径三个分支全部符合预期');
    finished = true;
  } finally {
    // 一定要还原成 owner，否则后面所有流程都会用错身份。
    // 还原必须在结束进程之前跑：process.exit() 会直接终止，finally 根本来不及执行。
    await ide.setLocalIdentity('').catch(() => {});
  }
  process.exit(finished ? 0 : 1);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
