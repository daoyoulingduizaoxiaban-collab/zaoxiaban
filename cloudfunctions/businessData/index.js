// businessData 路由入口。共享层在 lib/core.js；每个资源在 resources/*.js。
// 加/改某资源的动作 → 改对应 resources/X.js；改共享/权限判定 → lib/core.js
//   （权限逻辑与地端 services/auth/roleScope.js 镜像，改动须两边同步，见 DOC/DEVELOPMENT_GUIDE 地端云端双通铁律）。
const { ensureCollections, getCallerProfile, failure, toPublicError } = require('./lib/core');
const userActions = require('./resources/users');
const providerActions = require('./resources/providers');
const productActions = require('./resources/products');
const groupOrderActions = require('./resources/groupOrders');
const customerOrderActions = require('./resources/customerOrders');
const feedbackActions = require('./resources/feedbacks');

const handlers = {
  users: userActions,
  providers: providerActions,
  products: productActions,
  groupOrders: groupOrderActions,
  customerOrders: customerOrderActions,
  feedbacks: feedbackActions,
};

exports.main = async (event = {}) => {
  try {
    await ensureCollections();
    const context = event.context || {};
    const profile = await getCallerProfile(context);
    const { resource, action, data = {} } = event;
    const resourceHandler = handlers[resource];
    const actionHandler = resourceHandler && resourceHandler[action];
    if (!actionHandler) return failure('资料操作不存在');
    return await actionHandler(data, profile);
  } catch (err) {
    return failure(toPublicError(err));
  }
};
