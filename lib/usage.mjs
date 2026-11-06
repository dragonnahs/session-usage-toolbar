export function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function normalizeUsage(raw = {}) {
  return {
    input: nonNegative(raw.input ?? raw.inputTokens ?? raw.input_tokens),
    cacheRead: nonNegative(raw.cacheRead ?? raw.cacheReadTokens ?? raw.cacheReadInputTokens ?? raw.cache_read_input_tokens),
    cacheCreation: nonNegative(raw.cacheCreation ?? raw.cacheWriteTokens ?? raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens),
    output: nonNegative(raw.output ?? raw.outputTokens ?? raw.output_tokens),
    reasoning: nonNegative(raw.reasoning ?? raw.reasoningTokens ?? raw.reasoning_tokens ?? raw.thinking),
  };
}

function modelName(turn) {
  return String(turn.model ?? turn.modelId ?? turn.modelName ?? turn.providerModel ?? "未知模型");
}

export function aggregateTurns(turns = []) {
  const total = { input: 0, cacheRead: 0, cacheCreation: 0, output: 0, reasoning: 0 };
  const models = new Map();
  const rows = [];
  for (const turn of Array.isArray(turns) ? turns : []) {
    const usage = normalizeUsage(turn?.usage ?? turn?.usage_json ?? turn);
    for (const key of Object.keys(total)) total[key] += usage[key];
    const model = modelName(turn ?? {});
    const bucket = models.get(model) ?? { model, turns: 0, input: 0, cacheRead: 0, cacheCreation: 0, output: 0, reasoning: 0 };
    bucket.turns += 1;
    for (const key of Object.keys(total)) bucket[key] += usage[key];
    models.set(model, bucket);
    rows.push({ id: String(turn?.id ?? turn?.turnId ?? rows.length + 1), model, createdAt: turn?.endedAt ?? turn?.createdAt ?? turn?.startedAt ?? turn?.timestamp ?? null, ...usage });
  }
  const denominator = total.input + total.cacheRead + total.cacheCreation;
  return { status: rows.length ? "ready" : "empty", total, totalTokens: total.input + total.cacheRead + total.cacheCreation + total.output, cacheHitRate: denominator ? total.cacheRead / denominator : 0, models: [...models.values()], rows };
}

export function formatTokenCount(value) {
  const n = nonNegative(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(n);
}
