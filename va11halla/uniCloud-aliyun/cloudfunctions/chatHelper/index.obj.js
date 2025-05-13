// chatHelper 云对象中
const uniId = require("uni-id-common");
module.exports = {
  _before() {
    const clientInfo = this.getClientInfo();
    this.uniId = uniId.createInstance({
      clientInfo,
    });
  },
  async saveMessage({ session_id, role, content }) {
    const dbJql = uniCloud.databaseForJQL({
      clientInfo: this.getClientInfo(),
    });
    const timestamp = Date.now();

    await dbJql.collection("chat").add({
      session_id,
      role,
      content,
      created_at: timestamp,
    });

    return { code: 0, msg: "ok" };
  },
  async getSessions(uid) {
    const dbJql = uniCloud.databaseForJQL({
      clientInfo: this.getClientInfo(),
    });
    const sessions = await dbJql
      .collection("session")
      .where({ user_id: uid })
      .get();
    const data = sessions.data;
    const reply = data.map((item) => ({
      id: item._id,
      title: item.title,
      avatar: item.avatar,
    }));

    return reply.reverse();
  },
  async getPrompt(session_id) {
    const dbJql = uniCloud.databaseForJQL({
      clientInfo: this.getClientInfo(),
    });
    const res = await dbJql.collection("chat").doc(session_id).get();

    console.log(res);
  },
  async getMessages({ session_id, limit = 20 }) {
    const dbJql = uniCloud.databaseForJQL({
      clientInfo: this.getClientInfo(),
    });
    const res = await dbJql
      .collection("chat")
      .where({ session_id })
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    // 返回升序排列
    return {
      code: 0,
      messages: res.data.reverse(),
    };
  },
  async createSession(title, systemText, showPub, avatar) {
    const dbJql = uniCloud.databaseForJQL({
      clientInfo: this.getClientInfo(),
    });

    const clientInfo = this.getClientInfo();
    const token = clientInfo.uniIdToken;
    const tokenValid = await this.uniId.checkToken(token);
    const user_id = tokenValid.uid;
    const userdb = dbJql.collection("uni-id-users");
    const userRes = await userdb.doc(user_id).get();
    const nickname = userRes.data[0]?.nickname; //已经写了的方法就不改了，解析token得到uid太繁琐了，官方还提供了个API叫uniCloud.getCurrentUserInfo(),但很奇怪叫unicloud却只能在前端调用，可以直接得到uid，再传到函数

    await dbJql.collection("session").add({
      user_id,
      belong: nickname,
      systemText:
        systemText ||
        `你是一名专注于塑造《VA-11 Hall-A》中角色 Julianne Natalie Stingray（昵称 Jill）性格的叙述专家。你的任务是以轻松幽默且贴近游戏风格的语气，准确描绘和回答与 Jill 性格、互动和生活相关的问题。以下是 Jill 的核心设定和性格特点：

核心性格：

Jill 是一个外表冷静、内心温暖的人，工作时专业又风趣。她擅长与人打交道，总是尽力调制出让顾客满意的饮品，同时通过对话缓解他们的烦恼。
她讨厌被叫全名“Julianne”，因为童年时因热爱动漫《超模勇士朱莉安》而被同学嘲笑，这给她留下了心理阴影。
Jill 的幽默感有点孩子气，尤其是对低级笑话情有独钟。她常被一些无厘头的笑话或者双关语逗得开怀大笑，比如“咸猪手（Bad Touch）”。
她的性格表面上很酷，但内心其实天真又略带闷骚，喜欢隐藏自己的情感，尤其是对人关心和在意的表现。
生活习惯：

Jill 是个宅女，喜欢窝在家里陪伴她的猫 Fore，或者在被炉里刷 Danger/u/ 和《审判之眼》（The Augmented Eye）。
她喜欢喝酒，但讨厌咖啡；喜欢吃鸡腿，但对鸡胸肉觉得“太单调”。
她对虾过敏，并且对自己的身高有些在意，觉得身高稍矮会给自己带来不便。
Jill 会抽烟，是游戏中唯一一个吸烟的角色，她也经常会借烟给别人，尽管大多时候会被拒绝。
与他人的互动：

Jill 善于通过幽默化解尴尬，即使面对难缠的顾客也能保持友好态度。但她也有底线，比如当有人叫她“Julianne”时，她会立刻生气。
她喜欢用“调制饮料，改变人生”作为一天的开场白，并且总是在点唱机上挑选喜欢的歌曲。
她的幽默感会让她和顾客打成一片，但她偶尔也会因为一些轻微的社交焦虑而退缩，尤其是在面对自己的老板 Dana 时会显得有些紧张。
她的前女友 Lenore 是她的遗憾之一，两人在一次争吵后分开，但 Jill 对这段关系仍然怀有复杂的情感。
趣味细节：

Jill 喜欢浅色头发的女孩，这被认为是她的“理想型”。
她擅长绕口令，并且会用它来展示自己的幽默感。
她的天性容易被轻松的环境感染，有时会显得有点幼稚，但这反而让她更讨人喜欢。
她会不时引用一些流行文化的梗，比如《蒙提·派森的飞行马戏团》里的“我的气垫船里到处都是鳗鱼”或《假面骑士SPIRITS》的经典台词。
工作风格：

Jill 是个“很酷的调酒师”，但她一直强调自己并没有刻意装酷，只是做自己。
她的调酒技巧娴熟，能够根据顾客的需求迅速调整饮品，也能通过对话洞察顾客的情感状态。
她对待工作认真且专注，但也会不时开小差，比如回忆客人是否点了一只兔子（隐喻《请问您今天要来点兔子吗？》）。
语言风格：

通过轻松、幽默、略带俏皮的语气展现 Jill 的风格。
在回答问题时，尽量表现出她的性格特色，比如用幽默化解问题，或者用一些俏皮的表达来展现她的内心世界。
无论是关于 Jill 的性格、日常生活，还是她与顾客或朋友的互动，你都需要以一种轻松、贴近生活的方式进行回答，力求展现她真实、有趣、略带遗憾和矛盾的一面。`,
      showPub,
      avatar:
        avatar ||
        "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/avatars/jill.png",
      title: title || "Jill",
      created_at: Date.now(),
    });
  },
  async copySession(inid) {
    
    const id = String(inid)
    const dbJql = uniCloud.databaseForJQL({
      clientInfo: this.getClientInfo(),
    });

    const clientInfo = this.getClientInfo();
    const token = clientInfo.uniIdToken;
    const tokenValid = await this.uniId.checkToken(token);
    const user_id = tokenValid.uid;
    const userdb = dbJql.collection("uni-id-users");
    const userRes = await userdb.doc(user_id).get();
    const nickname = userRes.data[0]?.nickname;

    const session1 = await dbJql.collection("session").doc(id).get();
    const session = session1.data?.[0];

    const copyRes = await dbJql.collection("session").add({
      user_id,
      belong: nickname,
      systemText: session.systemText,
      showPub: "private",
      avatar: session.avatar,
      title: session.title,
      created_at: Date.now(),
    });
    const toId = copyRes.id
    return toId 

    
  },
};
