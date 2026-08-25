/** UI 写流程自测 · 供应商新增。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const marker = `自测供应商${Date.now()}`;
  await ide.ensureLocalOwner();
  await ide.gotoPage('/pages/providers/edit/index', 'providers/edit');
  // 传 v => v === true：canSave 初始值就是 false，用预设判定会第一次就拿到 false、根本没等鉴权。
  const canSave = await ide.dataWhenReady('canSave', 10, 800, v => v === true);
  if (!canSave) return ide.reportFailure('无保存权限（canSave=false）');
  await ide.setData({ formData: { title: marker, contact: '自测联系人', note: '自测备注', statusText: '可显示资料' }, isDirty: true });
  await ide.callMethod('onSave');
  await ide.sleep(2000);
  const list = await ide.bd('providers', 'listVisible', {});
  const hit = ((list && list.data) || []).find(p => String(p.title) === marker);
  if (!hit || String(hit.contact) !== '自测联系人') return ide.reportFailure('未在供应商列表找到');
  console.log(`✅ 供应商新增已落库: ${hit._id || hit.id}`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
