"use strict";
const common_vendor = require("../../common/vendor.js");
if (!Array) {
  const _easycom_uni_section2 = common_vendor.resolveComponent("uni-section");
  _easycom_uni_section2();
}
const _easycom_uni_section = () => "../../uni_modules/uni-section/components/uni-section/uni-section.js";
if (!Math) {
  _easycom_uni_section();
}
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const banners = [
      {
        image: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/bk1.gif"
      },
      {
        image: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/bk2.gif"
      }
    ];
    const features = [
      {
        name: "牛仔对决",
        icon: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/97b55ac5-2a9a-49e6-bd56-5cf756ec147e.png",
        url: "/pages/game/cowbay",
        tag: "NEW"
      },
      {
        name: "AI助手",
        icon: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/3793c49b-effb-4f0e-b7ef-f04b7eeb43b5.png",
        url: "/pages/chat/index",
        tag: "NEW"
      }
    ];
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({
        url
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.f(banners, (item, index, i0) => {
          return {
            a: item.image,
            b: index
          };
        }),
        b: common_vendor.f(features, (item, index, i0) => {
          return common_vendor.e({
            a: item.icon,
            b: common_vendor.t(item.name),
            c: item.tag
          }, item.tag ? {
            d: common_vendor.t(item.tag)
          } : {}, {
            e: index,
            f: common_vendor.o(($event) => navigateTo(item.url), index)
          });
        }),
        c: common_vendor.p({
          title: "功能入口",
          type: "line"
        })
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
