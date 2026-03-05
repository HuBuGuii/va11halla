"use strict";
const common_vendor = require("../../common/vendor.js");
if (!Array) {
  const _easycom_uni_list_chat2 = common_vendor.resolveComponent("uni-list-chat");
  const _easycom_uni_list_item2 = common_vendor.resolveComponent("uni-list-item");
  const _easycom_uni_list2 = common_vendor.resolveComponent("uni-list");
  const _easycom_uni_popup_dialog2 = common_vendor.resolveComponent("uni-popup-dialog");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  const _easycom_uni_file_picker2 = common_vendor.resolveComponent("uni-file-picker");
  const _easycom_uni_easyinput2 = common_vendor.resolveComponent("uni-easyinput");
  const _easycom_uni_forms_item2 = common_vendor.resolveComponent("uni-forms-item");
  const _easycom_uni_data_checkbox2 = common_vendor.resolveComponent("uni-data-checkbox");
  const _easycom_uni_forms2 = common_vendor.resolveComponent("uni-forms");
  const _easycom_uni_section2 = common_vendor.resolveComponent("uni-section");
  (_easycom_uni_list_chat2 + _easycom_uni_list_item2 + _easycom_uni_list2 + _easycom_uni_popup_dialog2 + _easycom_uni_popup2 + _easycom_uni_file_picker2 + _easycom_uni_easyinput2 + _easycom_uni_forms_item2 + _easycom_uni_data_checkbox2 + _easycom_uni_forms2 + _easycom_uni_section2)();
}
const _easycom_uni_list_chat = () => "../../uni_modules/uni-list/components/uni-list-chat/uni-list-chat.js";
const _easycom_uni_list_item = () => "../../uni_modules/uni-list/components/uni-list-item/uni-list-item.js";
const _easycom_uni_list = () => "../../uni_modules/uni-list/components/uni-list/uni-list.js";
const _easycom_uni_popup_dialog = () => "../../uni_modules/uni-popup/components/uni-popup-dialog/uni-popup-dialog.js";
const _easycom_uni_popup = () => "../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
const _easycom_uni_file_picker = () => "../../uni_modules/uni-file-picker/components/uni-file-picker/uni-file-picker.js";
const _easycom_uni_easyinput = () => "../../uni_modules/uni-easyinput/components/uni-easyinput/uni-easyinput.js";
const _easycom_uni_forms_item = () => "../../uni_modules/uni-forms/components/uni-forms-item/uni-forms-item.js";
const _easycom_uni_data_checkbox = () => "../../uni_modules/uni-data-checkbox/components/uni-data-checkbox/uni-data-checkbox.js";
const _easycom_uni_forms = () => "../../uni_modules/uni-forms/components/uni-forms/uni-forms.js";
const _easycom_uni_section = () => "../../uni_modules/uni-section/components/uni-section/uni-section.js";
if (!Math) {
  (_easycom_uni_list_chat + _easycom_uni_list_item + _easycom_uni_list + _easycom_uni_popup_dialog + _easycom_uni_popup + _easycom_uni_file_picker + _easycom_uni_easyinput + _easycom_uni_forms_item + _easycom_uni_data_checkbox + _easycom_uni_forms + _easycom_uni_section)();
}
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const dialogRef = common_vendor.ref(null);
    const diyRef = common_vendor.ref(null);
    const formRef = common_vendor.ref(null);
    const list = common_vendor.ref([]);
    const chatHelper = common_vendor.nr.importObject("chatHelper");
    const showPubOptions = [
      { text: "公开", value: "public" },
      { text: "私人", value: "private" }
    ];
    const chatList = common_vendor.ref([
      {
        id: 1,
        title: "Jill",
        avatar: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/9696dbcc-65c7-4b17-9d05-d81928976694.png",
        desc: "调制饮品，改变人生"
      },
      {
        id: 2,
        title: "Evil-Neuro",
        avatar: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/97b55ac5-2a9a-49e6-bd56-5cf756ec147e.png",
        desc: "Abber Demon!"
      }
    ]);
    const formData = common_vendor.ref({
      title: "",
      systemText: "",
      showPub: "",
      imageFiles: []
    });
    const rules = {
      showPub: {
        rules: [{ required: true, errorMessage: "必须确认私人或公开" }]
      },
      title: {
        rules: [{ required: true, errorMessage: "必须确认标题" }]
      },
      systemText: {
        rules: [{ required: true, errorMessage: "必须确认设定词" }]
      }
    };
    const getSessions = async () => {
      const info = common_vendor.nr.getCurrentUserInfo();
      const uid = info.uid;
      const reply = await chatHelper.getSessions(uid);
      return reply;
    };
    const openSession = (item) => {
      let id = "";
      let title = item.title;
      let avatar = item.avatar;
      if (item.id === 1) {
        id = chatHelper.copySession("68208911652341756270645a");
      }
      if (item.id === 2) {
        id = chatHelper.copySession("68219010b9fb230b03d63ced");
      }
      common_vendor.index.navigateTo({ url: `/pages/chat/deepseek?id=${id}&title=${title}&avatar=${avatar}` });
    };
    const continueSession = (item) => {
      let id = item.id;
      let title = item.title;
      let avatar = item.avatar;
      common_vendor.index.navigateTo({ url: `/pages/chat/deepseek?id=${id}&title=${title}&avatar=${avatar}` });
    };
    const progress = (e) => {
      common_vendor.index.__f__("log", "at pages/chat/index.vue:212", "上传进度", e);
    };
    const success = (e) => {
      common_vendor.index.__f__("log", "at pages/chat/index.vue:215", "上传成功");
    };
    const initSession = () => {
      var _a;
      (_a = dialogRef.value) == null ? void 0 : _a.open("center");
    };
    const DIYchat = () => {
      var _a, _b;
      (_a = dialogRef.value) == null ? void 0 : _a.close();
      (_b = diyRef.value) == null ? void 0 : _b.open("center");
    };
    const chatMarket = () => {
      common_vendor.index.__f__("log", "at pages/chat/index.vue:226", "chatmarket");
    };
    const cleanForm = () => {
      formData.value = {
        title: "",
        systemText: "",
        showPub: "",
        imageFiles: []
      };
    };
    const confirmDIY = async () => {
      var _a, _b;
      await ((_a = formRef.value) == null ? void 0 : _a.validate());
      common_vendor.index.__f__("log", "at pages/chat/index.vue:240", formData.value.imageFiles);
      await chatHelper.createSession(
        formData.value.title,
        formData.value.systemText,
        formData.value.showPub,
        formData.value.imageFiles[0].url
      );
      common_vendor.index.showToast({
        title: "创建成功",
        icon: "success"
      });
      cleanForm();
      (_b = diyRef.value) == null ? void 0 : _b.close();
    };
    const closeDIY = () => {
      var _a;
      common_vendor.index.__f__("log", "at pages/chat/index.vue:260", "close");
      (_a = diyRef.value) == null ? void 0 : _a.close();
    };
    common_vendor.onLoad(async (options) => {
      const res = await getSessions();
      list.value = res;
      common_vendor.index.__f__("log", "at pages/chat/index.vue:267", list.value);
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(initSession),
        b: common_vendor.f(chatList.value, (item, k0, i0) => {
          return {
            a: item.id,
            b: common_vendor.o(($event) => openSession(item), item.id),
            c: "5a559478-4-" + i0 + ",5a559478-3",
            d: common_vendor.p({
              title: item.title,
              avatar: item.avatar,
              note: item.desc,
              clickable: true
            })
          };
        }),
        c: common_vendor.o(DIYchat),
        d: common_vendor.p({
          clickable: true,
          title: "自定义ai",
          note: "可以选择自己设置提示词，头像等功能，也可以选择上传至服务器供他人参考"
        }),
        e: common_vendor.o(chatMarket),
        f: common_vendor.p({
          clickable: true,
          title: "公开市场",
          note: "查看所有公开的ai"
        }),
        g: common_vendor.p({
          type: "info",
          title: "可用ai列表"
        }),
        h: common_vendor.sr(dialogRef, "5a559478-1,5a559478-0", {
          "k": "dialogRef"
        }),
        i: common_vendor.p({
          type: "dialog"
        }),
        j: common_vendor.o(progress),
        k: common_vendor.o(success),
        l: common_vendor.o(($event) => formData.value.imageFiles = $event),
        m: common_vendor.p({
          title: "设置头像",
          limit: 1,
          ["file-mediatype"]: "image",
          modelValue: formData.value.imageFiles
        }),
        n: common_vendor.o(($event) => formData.value.title = $event),
        o: common_vendor.p({
          type: "text",
          modelValue: formData.value.title
        }),
        p: common_vendor.p({
          required: true,
          label: "设置标题",
          name: "title"
        }),
        q: common_vendor.o(($event) => formData.value.systemText = $event),
        r: common_vendor.p({
          type: "textarea",
          maxlength: -1,
          placeholder: "使用过程中不能重复设置",
          modelValue: formData.value.systemText
        }),
        s: common_vendor.p({
          required: true,
          label: "设置提示词",
          name: "systemText"
        }),
        t: common_vendor.o(($event) => formData.value.showPub = $event),
        v: common_vendor.p({
          localdata: showPubOptions,
          mode: "default",
          selectedColor: "#2979ff",
          modelValue: formData.value.showPub
        }),
        w: common_vendor.p({
          required: true,
          label: "设置私密性",
          name: "showPub"
        }),
        x: common_vendor.sr(formRef, "5a559478-10,5a559478-8", {
          "k": "formRef"
        }),
        y: common_vendor.p({
          modelValue: formData.value,
          ["label-width"]: "100px",
          ["label-position"]: "top",
          rules
        }),
        z: common_vendor.o(closeDIY),
        A: common_vendor.o(confirmDIY),
        B: common_vendor.p({
          type: "info",
          title: "认真DIY中",
          mode: "base",
          ["before-close"]: true
        }),
        C: common_vendor.sr(diyRef, "5a559478-7,5a559478-0", {
          "k": "diyRef"
        }),
        D: common_vendor.p({
          type: "dialog"
        }),
        E: common_vendor.p({
          title: "新建对话",
          type: "line"
        }),
        F: list.value.length === 0
      }, list.value.length === 0 ? {} : {
        G: common_vendor.f(list.value, (item, k0, i0) => {
          return {
            a: item.id,
            b: common_vendor.o(($event) => continueSession(item), item.id),
            c: "5a559478-19-" + i0 + ",5a559478-18",
            d: common_vendor.p({
              title: item.title,
              avatar: item.avatar,
              clickable: true
            })
          };
        })
      }, {
        H: common_vendor.p({
          title: "对话列表",
          type: "line"
        })
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-5a559478"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/chat/index.js.map
