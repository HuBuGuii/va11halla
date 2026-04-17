const chatHelper = uniCloud.importObject("chatHelper");

export async function getPersonas(options = {}) {
  const result = await chatHelper.getPersonas(options);
  return result?.personas || [];
}

export async function getFeaturedPersonas(titles = []) {
  const personas = await getPersonas({
    includePrivate: true,
  });
  const personaMap = new Map(personas.map((item) => [String(item.title || ""), item]));

  return titles
    .map((title) => personaMap.get(String(title || "")))
    .filter(Boolean)
    .map((item) => ({
      id: String(item.id || ""),
      title: String(item.title || "Persona"),
      avatar: String(item.avatar || ""),
      desc: String(item.description || ""),
    }));
}

export async function createPersonaTemplate({
  title = "",
  systemText = "",
  showPub = "private",
  avatar = "",
  tags = [],
} = {}) {
  return chatHelper.createPersona({
    title,
    description: String(systemText || "").slice(0, 60),
    systemText,
    showPub,
    avatar,
    tags: Array.isArray(tags) ? tags : [],
  });
}

export async function clonePersonaToSession(personaId, showPub = "private") {
  return chatHelper.clonePersonaToSession(personaId, showPub);
}
