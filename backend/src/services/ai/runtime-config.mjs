const aiConfig = {
  activeProvider: process.env.OPENAI_API_KEY ? 'openai' : (process.env.GOOGLE_API_KEY ? 'gemini' : null),
  activeModel: process.env.OPENAI_API_KEY ? 'gpt-4o' : (process.env.GOOGLE_API_KEY ? 'gemini-1.5-pro-latest' : null),
  keys: {
    openai: process.env.OPENAI_API_KEY || null,
    gemini: process.env.GOOGLE_API_KEY || null,
    grok: process.env.GROK_API_KEY || null,
  }
};

export function setActive(provider, model) {
  aiConfig.activeProvider = provider;
  aiConfig.activeModel = model || aiConfig.activeModel;
}

export function setKey(provider, key) {
  aiConfig.keys[provider] = key || null;
}

export function getConfig() {
  return aiConfig;
}

export default { setActive, setKey, getConfig };
