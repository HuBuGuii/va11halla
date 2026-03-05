"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_checkLog = require("../../utils/checkLog.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "cowbay",
  setup(__props) {
    common_vendor.onLoad(() => {
      if (!utils_checkLog.checkLogin())
        return;
    });
    return (_ctx, _cache) => {
      return {};
    };
  }
});
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/cowbay.js.map
