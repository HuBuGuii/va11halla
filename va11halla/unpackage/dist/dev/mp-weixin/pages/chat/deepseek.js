"use strict";
const common_vendor = require("../../common/vendor.js");
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_uni_data_select2 = common_vendor.resolveComponent("uni-data-select");
  const _easycom_uni_forms_item2 = common_vendor.resolveComponent("uni-forms-item");
  const _easycom_uni_forms2 = common_vendor.resolveComponent("uni-forms");
  const _easycom_uni_popup_dialog2 = common_vendor.resolveComponent("uni-popup-dialog");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  (_easycom_uni_icons2 + _easycom_uni_data_select2 + _easycom_uni_forms_item2 + _easycom_uni_forms2 + _easycom_uni_popup_dialog2 + _easycom_uni_popup2)();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_data_select = () => "../../uni_modules/uni-data-select/components/uni-data-select/uni-data-select.js";
const _easycom_uni_forms_item = () => "../../uni_modules/uni-forms/components/uni-forms-item/uni-forms-item.js";
const _easycom_uni_forms = () => "../../uni_modules/uni-forms/components/uni-forms/uni-forms.js";
const _easycom_uni_popup_dialog = () => "../../uni_modules/uni-popup/components/uni-popup-dialog/uni-popup-dialog.js";
const _easycom_uni_popup = () => "../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
if (!Math) {
  (_easycom_uni_icons + _easycom_uni_data_select + _easycom_uni_forms_item + _easycom_uni_forms + _easycom_uni_popup_dialog + _easycom_uni_popup)();
}
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "deepseek",
  setup(__props) {
    const inputText = common_vendor.ref("");
    const uid = common_vendor.ref();
    const messages = common_vendor.ref([]);
    const scrollTop = common_vendor.ref(0);
    const prompt = common_vendor.ref("");
    const userAvatar = common_vendor.ref(
      "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/%23TimBeta.jpg"
    );
    const botAvatar = common_vendor.ref("");
    const inputFocused = common_vendor.ref(true);
    const chatHelper = common_vendor.nr.importObject("chatHelper");
    const session_id = common_vendor.ref("");
    const title = common_vendor.ref("");
    const limit = common_vendor.ref(15);
    const settingRef = common_vendor.ref();
    const formRef = common_vendor.ref();
    const formData = common_vendor.ref({
      modelName: "deepseek-ai/DeepSeek-V3",
      temperature: 0.7,
      maxTokens: 256,
      repeat: 0.7,
      maxMess: 15
    });
    const rules = {
      modelName: {
        rules: [{ required: true, errorMessage: "请选择模型" }]
      },
      temperature: {
        rules: [{ required: true, errorMessage: "请选择随机性" }]
      },
      maxTokens: {
        rules: [{ required: true, errorMessage: "请选择最大输出长度" }]
      },
      repeat: {
        rules: [{ required: true, errorMessage: "请选择重复内容长度" }]
      },
      maxMess: {
        rules: [{ required: true, errorMessage: "请选择最长上下文" }]
      }
    };
    const selectModel = [
      { text: "V3 (默认模型)", value: "deepseek-ai/DeepSeek-V3" },
      { text: "R1 (耗费更大)", value: "deepseek-ai/DeepSeek-R1" }
    ];
    const selectTemperature = [
      { text: "很随机", value: 0.9 },
      { text: "很中立", value: 0.7 },
      { text: "很保守", value: 0.5 }
    ];
    const selectMaxtokens = [
      { text: "比较短", value: 256 },
      { text: "正常值", value: 512 },
      { text: "非常长", value: 2048 }
    ];
    const selectRepeat = [
      { text: "较少重复（创造）", value: 0.9 },
      { text: "正常值", value: 0.7 },
      { text: "较多重复（保守）", value: 0.4 }
    ];
    const selectMaxMess = [
      { text: "15条", value: 15 },
      { text: "30条", value: 30 },
      { text: "无限条(不推荐)", value: -1 }
    ];
    common_vendor.onLoad(async (options) => {
      var _a, _b, _c, _d, _e;
      title.value = options.title || "聊天";
      session_id.value = options.id;
      botAvatar.value = options.avatar;
      const info = common_vendor.nr.getCurrentUserInfo();
      uid.value = info.uid;
      prompt.value = await chatHelper.getPrompt(session_id.value);
      const set = await chatHelper.getSettings(uid.value);
      let res = await chatHelper.getMessages({ session_id: session_id.value, limit: limit.value });
      messages.value = res.messages;
      const filteredData = set.map(({ _id, user_id, ...rest }) => rest);
      formData.value = {
        modelName: ((_a = filteredData == null ? void 0 : filteredData[0]) == null ? void 0 : _a.modelName) || "deepseek-ai/DeepSeek-V3",
        temperature: ((_b = filteredData == null ? void 0 : filteredData[0]) == null ? void 0 : _b.temperature) || 0.7,
        maxTokens: ((_c = filteredData == null ? void 0 : filteredData[0]) == null ? void 0 : _c.maxTokens) || 256,
        repeat: ((_d = filteredData == null ? void 0 : filteredData[0]) == null ? void 0 : _d.repeat) || 0.7,
        maxMess: ((_e = filteredData == null ? void 0 : filteredData[0]) == null ? void 0 : _e.maxMess) || 15
      };
      common_vendor.index.__f__("log", "at pages/chat/deepseek.vue:227", formData.value);
    });
    const scrollToBottom = () => {
      common_vendor.nextTick$1(() => {
        scrollTop.value = Math.random() * 1e6;
      });
    };
    const closeSetting = () => {
      var _a;
      (_a = settingRef.value) == null ? void 0 : _a.close();
    };
    const confirmSetting = () => {
      var _a;
      chatHelper.saveSettings(formData.value, uid.value);
      (_a = settingRef.value) == null ? void 0 : _a.close();
    };
    const openSettings = () => {
      var _a;
      (_a = settingRef.value) == null ? void 0 : _a.open("center");
      common_vendor.index.__f__("log", "at pages/chat/deepseek.vue:248", formData.value);
    };
    const sendMessage = async () => {
      const text = inputText.value.trim();
      if (!text)
        return;
      inputFocused.value = false;
      messages.value.push({ role: "user", content: text });
      inputText.value = "";
      chatHelper.saveMessage({ session_id: session_id.value, role: "user", content: text });
      scrollToBottom();
      messages.value.push({ role: "assistant", content: "正在思考中...请耐心等待" });
      scrollToBottom();
      const reply = await sendMessageToGPT(messages.value);
      messages.value[messages.value.length - 1] = {
        role: "assistant",
        content: reply
      };
      chatHelper.saveMessage({ session_id: session_id.value, role: "assistant", content: reply });
      scrollToBottom();
      common_vendor.nextTick$1(() => {
        inputFocused.value = true;
      });
    };
    const sendMessageToGPT = async (messages2) => {
      var _a, _b, _c, _d;
      let sendMes = [];
      const max = formData.value.maxMess;
      const transformedMessages = messages2.filter((m) => !(m.role === "assistant" && m.content === "正在思考中...请耐心等待")).map((m) => ({
        role: m.role,
        content: typeof m.content === "object" && m.content.value !== void 0 ? m.content.value : m.content
      }));
      if (max === -1) {
        sendMes = [
          { role: "system", content: prompt.value },
          ...transformedMessages
        ];
      } else {
        sendMes = [
          { role: "system", content: prompt.value },
          ...transformedMessages.slice(-max)
        ];
      }
      common_vendor.index.__f__("log", "at pages/chat/deepseek.vue:304", sendMes);
      common_vendor.index.__f__("log", "at pages/chat/deepseek.vue:305", formData.value.modelName);
      const sendRequest = {
        url: "https://api.siliconflow.cn/v1/chat/completions",
        method: "POST",
        header: {
          Authorization: "Bearer sk-lgquhuftllbtjnwauywqnmwujsowlkrlddgyovlevkbmnxxj",
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        data: {
          model: formData.value.modelName,
          messages: sendMes,
          stream: false,
          max_tokens: formData.value.maxTokens,
          temperature: formData.value.temperature,
          top_p: 0.9,
          top_k: 50,
          frequency_penalty: formData.value.repeat,
          n: 1,
          response_format: {
            type: "text"
          }
        }
      };
      try {
        const res = await common_vendor.index.request(sendRequest);
        const reply = ((_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.message) == null ? void 0 : _d.content) || "AI 无回复";
        return reply;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/chat/deepseek.vue:338", "[请求失败]", err);
        return "请求失败，请稍后再试";
      }
    };
    const goBack = () => {
      common_vendor.index.navigateBack({ delta: 1 });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.p({
          type: "left",
          size: "24",
          color: "#333"
        }),
        b: common_vendor.o(goBack),
        c: common_vendor.t(title.value),
        d: common_vendor.p({
          type: "settings",
          size: "24",
          color: "#333"
        }),
        e: common_vendor.o(openSettings),
        f: common_vendor.f(messages.value, (msg, index, i0) => {
          return {
            a: msg.role === "user" ? userAvatar.value : botAvatar.value,
            b: common_vendor.t(msg.content),
            c: index,
            d: common_vendor.n(msg.role === "user" ? "user" : "assistant")
          };
        }),
        g: scrollTop.value,
        h: inputFocused.value,
        i: common_vendor.o(sendMessage),
        j: inputText.value,
        k: common_vendor.o(($event) => inputText.value = $event.detail.value),
        l: common_vendor.o(sendMessage),
        m: common_vendor.o(($event) => formData.value.modelName = $event),
        n: common_vendor.p({
          localdata: selectModel,
          mode: "picker",
          clear: true,
          selectedColor: "#7f5fff",
          placeholder: "请选择你的模型",
          modelValue: formData.value.modelName
        }),
        o: common_vendor.p({
          required: true,
          label: "模型选择",
          name: "modelName"
        }),
        p: common_vendor.o(($event) => formData.value.temperature = $event),
        q: common_vendor.p({
          localdata: selectTemperature,
          mode: "picker",
          clear: true,
          selectedColor: "#7f5fff",
          placeholder: "请选择输出的随机性",
          modelValue: formData.value.temperature
        }),
        r: common_vendor.p({
          required: true,
          label: "随机性",
          name: "temperature"
        }),
        s: common_vendor.o(($event) => formData.value.maxTokens = $event),
        t: common_vendor.p({
          localdata: selectMaxtokens,
          mode: "picker",
          clear: true,
          selectedColor: "#7f5fff",
          placeholder: "输出越长，等待时间也越长哦",
          modelValue: formData.value.maxTokens
        }),
        v: common_vendor.p({
          required: true,
          label: "最大输出长度",
          name: "maxTokens"
        }),
        w: common_vendor.o(($event) => formData.value.repeat = $event),
        x: common_vendor.p({
          localdata: selectRepeat,
          mode: "picker",
          clear: true,
          selectedColor: "#7f5fff",
          placeholder: "请选择重复内容长度",
          modelValue: formData.value.repeat
        }),
        y: common_vendor.p({
          required: true,
          label: "重复内容",
          name: "repeatMes"
        }),
        z: common_vendor.o(($event) => formData.value.maxMess = $event),
        A: common_vendor.p({
          localdata: selectMaxMess,
          mode: "picker",
          clear: true,
          selectedColor: "#7f5fff",
          placeholder: "请选择上传的最长上下文",
          modelValue: formData.value.maxMess
        }),
        B: common_vendor.p({
          required: true,
          label: "最长上下文",
          name: "maxMess"
        }),
        C: common_vendor.sr(formRef, "9c28c345-4,9c28c345-3", {
          "k": "formRef"
        }),
        D: common_vendor.p({
          modelValue: formData.value,
          ["label-width"]: "100px",
          ["label-position"]: "top",
          rules
        }),
        E: common_vendor.o(closeSetting),
        F: common_vendor.o(confirmSetting),
        G: common_vendor.p({
          type: "info",
          title: "设置",
          mode: "base",
          ["before-close"]: true
        }),
        H: common_vendor.sr(settingRef, "9c28c345-2", {
          "k": "settingRef"
        }),
        I: common_vendor.p({
          type: "dialog"
        })
      };
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-9c28c345"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/chat/deepseek.js.map
