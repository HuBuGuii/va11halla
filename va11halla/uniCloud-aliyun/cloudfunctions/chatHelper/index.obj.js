// chatHelper 云对象中

module.exports = {
  async send(messages) {
    try {
      const res = await uniCloud.httpclient.request(
        "https://api.siliconflow.cn/v1/chat/completions",
        {
          method: "POST",
          dataType: "json", // 自动解析 JSON 返回
          contentType: "json", // 设置请求体为 application/json
          data: {
            model: "deepseek-ai/DeepSeek-R1",
            messages,
            stream: false,
            max_tokens: 512,
            temperature: 0.7,
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5,
            n: 1,
            response_format: {
              type: "text",
            },
          },
          headers: {
            Authorization:
              "Bearer sk-lgquhuftllbtjnwauywqnmwujsowlkrlddgyovlevkbmnxxj",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const reply = res.data?.choices?.[0]?.message?.content || "AI 无回复";
      return res

    } catch (err) {
      console.error("[请求失败]", err);
      return "请求发生错误，请稍后再试";
    }
  },
  async storeMes(role,message){
    
  }
};
