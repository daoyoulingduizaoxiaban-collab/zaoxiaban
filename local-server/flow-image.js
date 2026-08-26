/**
 * UI 写流程自测 · 开团页内嵌新增商品的选图上传。
 *
 * 这条流程以前列在「不可自动化」：wx.chooseMedia 是原生选择器，旧的 automator 点不了。
 * 新版 wechatide 可以 mock wx API：让 chooseMedia 回一张合法图片，从「点上传按钮」
 * 到「回调写进 pictureUrls」到「加入商品、开团落库」整条真实路径就都跑得到了。
 *
 * 原本测的是商品库的商品表单。商品库已整个删除（开团一律内嵌新增商品），
 * 同一条路径改测开团页的内嵌新增区。
 *
 * 另外顺带验前端的 3 张上限——那条只有前端有，后端不挡（见 FIELD_DICT C13）。
 *
 * 前置：开发者工具开着本专案 ＋ node local-server/server.js
 * 跑法：node local-server/flow-image.js
 */
const ide = require('./lib/ide');

// 回合法的 https 位址：后端只收 cloud:// / https:// / 空（hasOnlyDurableAssetUrls），
// 真实的临时档路径本来就存不进去，本机也没有云存储可以上传。
const fakePick = (n) => ({
  errMsg: 'chooseMedia:ok',
  tempFiles: Array.from({ length: n }, (_, i) => ({ tempFilePath: `https://example.com/pick-${Date.now()}-${i}.jpg` })),
});

let finished = false;

(async () => {
  const marker = `自测选图${String(Date.now()).slice(-6)}`;
  await ide.ensureLocalOwner();
  await ide.mockWxApi('chooseMedia', fakePick(1));

  try {
    await ide.gotoPage('/sub-pages/groupOrder/add/index', 'groupOrder/add');
    await ide.dataWhenReady('pageState');
    await ide.sleep(500);

    // ① 点真实的上传按钮，走 chooseInlineImage → wx.chooseMedia → success 回调
    await ide.tap('.inline-images__add');
    await ide.sleep(800);
    let urls = await ide.getData('newProduct.pictureUrls');
    if (!Array.isArray(urls) || urls.length !== 1) {
      throw new Error(`点上传后图片没进 data，目前 ${JSON.stringify(urls)}`);
    }
    console.log('点上传后图片数 =', urls.length);

    // ② 一次回 5 张，验的是页面自己的截断逻辑（remain + .slice(0,3)），不是「按钮消失」。
    //    用连点来验的话，按钮消失后点不到会静默跳过，那两道限制其实一次都没跑到。
    await ide.restoreWxApi('chooseMedia');
    await ide.mockWxApi('chooseMedia', fakePick(5));
    await ide.tap('.inline-images__add');
    await ide.sleep(900);
    urls = await ide.getData('newProduct.pictureUrls');
    if (!Array.isArray(urls) || urls.length !== 3) {
      throw new Error(`图片上限没守住，应为 3 张，实际 ${Array.isArray(urls) ? urls.length : JSON.stringify(urls)} 张`);
    }
    console.log('一次选 5 张后图片数 =', urls.length, '（被截到上限 3，正确）');

    // ③ 满 3 张后上传按钮要消失（wxml 的 wx:if）
    const btns = await ide.querySelectorAll('.inline-images__add');
    const found = (btns && (btns.elements || btns.result || btns)) || [];
    if (Array.isArray(found) && found.length > 0) {
      throw new Error('满 3 张后上传按钮应该消失，却还在');
    }
    console.log('满 3 张后上传按钮已隐藏');

    // ④ 填名称与一档价格，把这件商品加进本团
    await ide.setData({
      'newProduct.title': marker,
      'newProduct.tiers': [{ minQuantity: 1, totalPrice: 10 }],
    });
    await ide.callMethod('addProductInline');
    await ide.sleep(1200);
    const goods = await ide.getData('selectedGoods');
    const added = (goods || []).find(g => String(g.title) === marker);
    if (!added) throw new Error('内嵌新增没把商品加进 selectedGoods');
    if (!Array.isArray(added.pictureUrls) || added.pictureUrls.length !== 3) {
      throw new Error(`加入的商品图片数不对，应为 3 张，实际 ${(added.pictureUrls || []).length} 张`);
    }

    // ⑤ 存团单，回查图片真的跟着商品一起落库
    const groupMarker = `自测选图团${String(Date.now()).slice(-6)}`;
    await ide.setData({
      'formData.title': groupMarker,
      'formData.startAt': '2030-09-01 09:00',
      'formData.endAt': '2030-09-30 20:00',
    });
    await ide.callMethod('onSave');
    await ide.sleep(2500);

    const list = await ide.bd('groupOrders', 'listVisible', {});
    const order = ((list && list.data) || []).find(o => String(o.title) === groupMarker);
    if (!order) throw new Error('团单没落库');
    const hit = (order.productList || []).find(p => String(p.title) === marker);
    if (!hit) throw new Error('团单落库了但商品不在里面');
    if (!Array.isArray(hit.pictureUrls) || hit.pictureUrls.length !== 3) {
      throw new Error(`落库的图片数不对，应为 3 张，实际 ${(hit.pictureUrls || []).length} 张`);
    }
    console.log(`✅ 选图上传全流程生效：${marker} 已随团单 ${groupMarker} 落库，带 ${hit.pictureUrls.length} 张图`);
    finished = true;
  } finally {
    // 还原一定要在结束进程之前跑：process.exit() 会直接终止，finally 根本来不及执行。
    // 还原失败不准吞掉——没还原的话，之后每一支流程的原生弹窗都会被自动按确定。
    try {
      await ide.restoreWxApi('chooseMedia');
    } catch (e) {
      console.error(`❌ 还原 chooseMedia 失败，请手动重启开发者工具：${e && e.message}`);
      finished = false;
    }
  }
  process.exit(finished ? 0 : 1);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
