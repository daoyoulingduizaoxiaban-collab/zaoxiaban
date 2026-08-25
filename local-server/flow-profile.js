/** UI 写流程自测 · 个人资料自编辑。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const newName = `自测昵称${Date.now()}`;
  const login = await ide.callFn('authLogin', {}, ide.OWNER);
  const ownerId = login && login.profile && login.profile.id;
  if (!ownerId) return ide.reportFailure(`取 owner id 失败: ${login && login.error}`);
  await ide.ensureLocalOwner();
  await ide.gotoPage('/pages/my/info-edit/index', 'my/info-edit');
  if (!(await ide.dataWhenReady('canEdit'))) return ide.reportFailure('无编辑权限（canEdit=false）');
  await ide.setData({ 'personInfo.name': newName, 'personInfo.phone': '13800000000' });
  await ide.callMethod('onSaveInfo');
  await ide.sleep(2000);
  const after = await ide.bd('users', 'getById', { id: ownerId });
  const name = after && after.data ? after.data.displayName : '(读取失败)';
  if (name !== newName) return ide.reportFailure(`未生效，displayName = ${name}`);
  console.log(`✅ 个人资料编辑生效：displayName = ${name}`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
