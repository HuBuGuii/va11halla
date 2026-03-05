"use strict";
const common_vendor = require("../common/vendor.js");
function checkLogin(whiteList = []) {
  const token = common_vendor.index.getStorageSync("uni_id_token");
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const route = "/" + current.route;
  const query = Object.entries(current.options || {}).map(([k, v]) => `${k}=${v}`).join("&");
  const fullPath = query ? `${route}?${query}` : route;
  if (!token && !whiteList.includes(route)) {
    common_vendor.index.redirectTo({
      url: `/uni_modules/uni-id-pages/pages/login/login-withpwd?redirect=${encodeURIComponent(fullPath)}`
    });
    return false;
  }
  return true;
}
exports.checkLogin = checkLogin;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/checkLog.js.map
