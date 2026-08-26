/**
 * UI 写流程自测 · 商品选图上传。
 *
 * 这条流程以前列在「不可自动化」：wx.chooseMedia 是原生选择器，旧的 automator 点不了，
 * 所以商品新增测试只能直接把图片网址塞进 data、绕开整个选图路径。
 * 新版 wechatide 可以 mock wx API：让 chooseMedia 回一张合法图片，从「点上传按钮」
 * 到「回调写进 pictureUrls」到「保存落库」整条真实路径就都跑得到了。
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
    await ide.gotoPage('/sub-pages/product/add/index', 'product/add');
    await ide.sleep(800);

    // ① 点真实的上传按钮，走 chooseImage → wx.chooseMedia → success 回调
    await ide.tap('.upload-btn');
    await ide.sleep(800);
    let urls = await ide.getData('currentProduct.pictureUrls');
    if (!Array.isArray(urls) || urls.length !== 1) {
      throw new Error(`点上传后图片没进 data，目前 ${JSON.stringify(urls)}`);
    }
    console.log('点上传后图片数 =', urls.length);

    // ② 一次回 5 张，验的是页面自己的截断逻辑（.slice(0,3)），不是「按钮消失」。
    //    原本用连点四次来验，第四次因为按钮已消失点不到而静默跳过，页面里真正的
    //    remainCount 与 slice 两道限制其实一次都没跑到，删掉它们测试照样绿。
    await ide.restoreWxApi('chooseMedia');
    await ide.mockWxApi('chooseMedia', fakePick(5));
    await ide.tap('.upload-btn');
    await ide.sleep(900);
    urls = await ide.getData('currentProduct.pictureUrls');
    if (!Array.isArray(urls) || urls.length !== 3) {
      throw new Error(`图片上限没守住，应为 3 张，实际 ${Array.isArray(urls) ? urls.length : JSON.stringify(urls)} 张`);
    }
    console.log('一次选 5 张后图片数 =', urls.length, '（被截到上限 3，正确）');

    // ③ 满 3 张后上传按钮要消失（wxml 的 wx:if）
    const btns = await ide.querySelectorAll('.upload-btn');
    const btnCount = (btns && (btns.elements || btns.result || btns)) || [];
    if (Array.isArray(btnCount) && btnCount.length > 0) {
      throw new Error('满 3 张后上传按钮应该消失，却还在');
    }
    console.log('满 3 张后上传按钮已隐藏');

    // ④ 补齐必填栏位后保存
    await ide.setData({
      'currentProduct.title': marker,
      'currentProduct.description': '选图流程自测',
      'currentProduct.sourceNote': '自测来源',
      'currentProduct.priceSetting': [{ minQuantity: 1, unitPrice: 10, totalPrice: 10, description: '1 件起' }],
    });
    await ide.callMethod('addProductToList');
    await ide.sleep(2000);

    // ⑤ 回查：商品落库，而且图片是从选图流程带进去的
    const list = await ide.bd('products', 'listVisible', {});
    const hit = ((list && list.data) || []).find(p => String(p.title) === marker);
    if (!hit) throw new Error('商品没落库');
    if (!Array.isArray(hit.pictureUrls) || hit.pictureUrls.length !== 3) {
      throw new Error(`落库的图片数不对，应为 3 张，实际 ${(hit.pictureUrls || []).length} 张`);
    }
    console.log(`✅ 选图上传全流程生效：${marker} 已落库，带 ${hit.pictureUrls.length} 张图`);
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
