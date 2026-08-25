/** UI 写流程自测 · 提交反馈。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const marker = `[自测]报Bug-${Date.now()}`;
  await ide.ensureLocalOwner();
  await ide.gotoPage('/pages/feedback/index', 'feedback');
  await ide.setData({ content: marker });
  console.log('输入后 content =', JSON.stringify(await ide.getData('content')));
  await ide.callMethod('onSubmit');
  await ide.sleep(1500);
  const list = await ide.bd('feedbacks', 'list', {});
  const hit = ((list && list.data) || []).find(r => r.content === marker);
  if (!hit) return ide.reportFailure('未在库中找到该反馈');
  console.log(`✅ UI 提交已落库: ${hit._id || hit.id}`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
