/** UI 写流程自测 · 用户审核。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const targetOpenId = `review-target-${Date.now()}`;
  await ide.callFn('authLogin', {}, targetOpenId);
  const apply = await ide.bd('users', 'applyForRole', { requestedRole: 'guide' }, targetOpenId);
  if (!apply || !apply.success) return ide.reportFailure(`seed 失败: ${apply && apply.error}`);
  await ide.ensureLocalOwner();
  await ide.gotoPage('/pages/userReview/index', 'userReview');
  let users = await ide.dataWhenReady('users');
  for (let i = 0; i < 8 && !(users || []).some(u => String(u.openId) === targetOpenId); i++) {
    await ide.sleep(800);
    users = await ide.getData('users');
  }
  const target = (users || []).find(u => String(u.openId) === targetOpenId);
  if (!target) return ide.reportFailure('审核列表里没找到 target');
  await ide.callMethod('approveUser', { currentTarget: { dataset: { id: target.id || target._id } } });
  await ide.sleep(1800);
  const pending = await ide.bd('users', 'listPending', {});
  const after = ((pending && pending.data) || []).find(u => String(u.openId) === targetOpenId);
  if (!after || String(after.reviewStatus || after.status) !== 'approved') return ide.reportFailure('审核未生效');
  console.log(`✅ 审核通过生效：${targetOpenId} 状态 = approved`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
