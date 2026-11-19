// iFly · 意图识别小模型运行时
//
// 加载由 tools/train_intent_model.mjs 训练生成的 nlp/intent_model.json，
// 提供字符 n-gram 特征 + softmax 回归的在线推理能力：
//   - classifyIntent(text) -> { label, confidence }  意图分类
//   - classifyYesNo(text)  -> { label, confidence }  确认/否定分类
//   - classifyRole(text)   -> { label, confidence }  语义角色（from/to/none）
//
// 模型未加载成功时，调用方回退到 app.js 内的关键词/正则规则兜底。

const IntentClassifier = (() => {
  let _model = null;       // 完整模型对象 { vocab, intent, yesno, role, threshold }
  let _vocab = null;       // token -> index
  let _loadPromise = null;

  // 与训练脚本保持完全一致：数字归一为 #，仅保留中文/字母/#，'@' 是角色分类的占位符需保留
  function normalize(text) {
    return String(text).toLowerCase()
      .replace(/\d+/g, '#')
      .replace(/[^\u4e00-\u9fa5a-z#@]/g, '');
  }

  function tokenize(text) {
    const s = '^' + normalize(text) + '$';
    const toks = [];
    for (let i = 0; i < s.length; i++) toks.push(s[i]);
    for (let i = 0; i < s.length - 1; i++) toks.push(s.slice(i, i + 2));
    return toks;
  }

  // 稀疏特征向量 { index: value }，做 L2 归一化
  function featurize(text) {
    const counts = {};
    for (const tk of tokenize(text)) {
      const idx = _vocab[tk];
      if (idx != null) counts[idx] = (counts[idx] || 0) + 1;
    }
    let norm = 0;
    for (const k in counts) norm += counts[k] * counts[k];
    norm = Math.sqrt(norm);
    if (norm === 0) return {};
    const vec = {};
    for (const k in counts) vec[k] = counts[k] / norm;
    return vec;
  }

  function softmax(W, b, x) {
    const K = W.length;
    const logits = new Array(K);
    let max = -Infinity;
    for (let k = 0; k < K; k++) {
      let s = b[k];
      const row = W[k];
      for (const idx in x) s += row[idx] * x[idx];
      logits[k] = s;
      if (s > max) max = s;
    }
    let sum = 0;
    const probs = new Array(K);
    for (let k = 0; k < K; k++) { probs[k] = Math.exp(logits[k] - max); sum += probs[k]; }
    for (let k = 0; k < K; k++) probs[k] /= sum;
    return probs;
  }

  function classify(modelKey, text) {
    if (!_model) return null;
    const m = _model[modelKey];
    const x = featurize(text);
    const probs = softmax(m.W, m.b, x);
    let best = 0;
    for (let k = 1; k < probs.length; k++) if (probs[k] > probs[best]) best = k;
    return { label: m.labels[best], confidence: probs[best] };
  }

  async function load() {
    if (_model) return true;
    if (!_loadPromise) {
      _loadPromise = (async () => {
        try {
          const url = new URL('./intent_model.json', import.meta.url);
          // 超时保护：最多等待 8 秒，避免网络异常时 fetch 无限挂起导致页面卡住
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) return false;
          const data = await res.json();
          _model = data;
          _vocab = data.vocab;
          return true;
        } catch (e) {
          return false;
        }
      })();
    }
    return _loadPromise;
  }

  return {
    load,
    isReady: () => !!_model,
    get threshold() { return _model ? _model.threshold : 0.5; },
    classifyIntent: (text) => classify('intent', text),
    classifyYesNo: (text) => classify('yesno', text),
    classifyRole: (text) => classify('role', text),
  };
})();

export { IntentClassifier };