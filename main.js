let aggregateTurns;
let activeSession = null;
let onActivated;
let onTurnEnded;

function ensureMethod(method) {
  if (method !== "getActiveSession" && method !== "getUsage") {
    const error = new Error(`Unsupported renderer method: ${method}`);
    error.code = "PLUGIN_CALL_NO_HANDLER";
    throw error;
  }
}

async function readTurns(sessionId) {
  const turns = [];
  let cursor;
  do {
    const page = await pi.usage.listTurns({ sessionId, limit: 500, cursor });
    if (Array.isArray(page?.turns)) turns.push(...page.turns);
    cursor = page?.nextCursor ?? null;
  } while (cursor);
  return turns;
}

async function onRendererCall(method, args = {}) {
  ensureMethod(method);
  if (method === "getActiveSession") return activeSession;
  const sessionId = String(args?.sessionId ?? "");
  if (!activeSession || sessionId !== activeSession.sessionId) {
    return { status: "empty", reason: "session-not-active", total: { input: 0, cacheRead: 0, cacheCreation: 0, output: 0, reasoning: 0 }, totalTokens: 0, cacheHitRate: 0, models: [], rows: [] };
  }
  return aggregateTurns(await readTurns(sessionId));
}

async function syncActive() {
  activeSession = await pi.session.getActive();
}

async function onLoad() {
  ({ aggregateTurns } = await import("./lib/usage.mjs"));
  onActivated = (snapshot) => { activeSession = snapshot; };
  onTurnEnded = () => { void syncActive(); };
  pi.events.on("session:activated", onActivated);
  pi.events.on("session:turnEnded", onTurnEnded);
  await syncActive();
  await pi.commands.register({ id: "token-usage.open", title: "会话用量：打开", keywords: ["token", "usage", "用量"], run: () => pi.ui.showToast("请点击输入框工具栏的 Token/用量按钮") });
}

async function onUnload() {
  if (onActivated) pi.events.off("session:activated", onActivated);
  if (onTurnEnded) pi.events.off("session:turnEnded", onTurnEnded);
  await pi.commands.unregister("token-usage.open");
  activeSession = null;
  aggregateTurns = undefined;
}

module.exports = { onLoad, onUnload, onRendererCall };
