// iFly · 对话功能端到端测试脚本
//
// 忠实复刻 app.js 的自然语言管线（模型分类 + 关键词兜底 + 对话状态机），
// 用内存数据存储模拟 SQLite 后端，跑通「添加 / 修改 / 删除」等完整对话，
// 并记录每一步的模型反馈（意图/角色/确认置信度）与功能实现结果。
//
// 运行：node tools/test_conversation.mjs

import fs from 'node:fs';

// ==================== 1. 加载意图小模型 ====================
const model = JSON.parse(
  fs.readFileSync(new URL('../js/nlp/intent_model.json', import.meta.url), 'utf8'),
);
const vocab = model.vocab;
const threshold = model.threshold || 0.5;

// 与 js/nlp/intent_model.js 完全一致的特征工程
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
function featurize(text) {
  const counts = {};
  for (const tk of tokenize(text)) {
    const idx = vocab[tk];
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
  const m = model[modelKey];
  const x = featurize(text);
  const probs = softmax(m.W, m.b, x);
  let best = 0;
  for (let k = 1; k < probs.length; k++) if (probs[k] > probs[best]) best = k;
  return { label: m.labels[best], confidence: probs[best] };
}
const IntentClassifier = {
  isReady: () => true,
  threshold,
  classifyIntent: (t) => classify('intent', t),
  classifyYesNo: (t) => classify('yesno', t),
  classifyRole: (t) => classify('role', t),
};

// ==================== 2. 机场数据库（与 app.js 一致）====================
const AirportDB = {
  PEK: { name: '北京首都', lat: 40.08, lon: 116.58 },
  PKX: { name: '北京大兴', lat: 39.51, lon: 116.41 },
  SHA: { name: '上海虹桥', lat: 31.20, lon: 121.34 },
  PVG: { name: '上海浦东', lat: 31.14, lon: 121.81 },
  CAN: { name: '广州白云', lat: 23.39, lon: 113.30 },
  SZX: { name: '深圳宝安', lat: 22.64, lon: 113.81 },
  CTU: { name: '成都双流', lat: 30.58, lon: 103.95 },
  TFU: { name: '成都天府', lat: 30.32, lon: 104.44 },
  CKG: { name: '重庆江北', lat: 29.72, lon: 106.64 },
  HGH: { name: '杭州萧山', lat: 30.23, lon: 120.43 },
  WUH: { name: '武汉天河', lat: 30.78, lon: 114.21 },
  XIY: { name: '西安咸阳', lat: 34.45, lon: 108.75 },
  KMG: { name: '昆明长水', lat: 25.10, lon: 102.93 },
  HAK: { name: '海口美兰', lat: 19.93, lon: 110.46 },
  SYX: { name: '三亚凤凰', lat: 18.30, lon: 109.41 },
  URC: { name: '乌鲁木齐', lat: 43.91, lon: 87.47 },
  NRT: { name: '东京成田', lat: 35.76, lon: 140.39 },
  HND: { name: '东京羽田', lat: 35.55, lon: 139.78 },
  ICN: { name: '首尔仁川', lat: 37.46, lon: 126.44 },
  SIN: { name: '新加坡樟宜', lat: 1.36, lon: 103.99 },
  BKK: { name: '曼谷素万那普', lat: 13.69, lon: 100.75 },
  LAX: { name: '洛杉矶', lat: 33.94, lon: -118.41 },
  SFO: { name: '旧金山', lat: 37.62, lon: -122.38 },
  JFK: { name: '纽约肯尼迪', lat: 40.64, lon: -73.78 },
  LHR: { name: '伦敦希思罗', lat: 51.47, lon: -0.46 },
  CDG: { name: '巴黎戴高乐', lat: 49.01, lon: 2.55 },
  DXB: { name: '迪拜', lat: 25.25, lon: 55.36 },
  SYD: { name: '悉尼', lat: -33.95, lon: 151.18 },
  FRA: { name: '法兰克福', lat: 50.03, lon: 8.57 },
  AMS: { name: '阿姆斯特丹', lat: 52.31, lon: 4.76 },
  HKG: { name: '香港', lat: 22.31, lon: 113.91 },
  TPE: { name: '台北桃园', lat: 25.08, lon: 121.23 },
  YVR: { name: '温哥华', lat: 49.19, lon: -123.18 },
  IKT: { name: '伊尔库茨克', lat: 52.27, lon: 104.39 },
  DME: { name: '莫斯科多莫杰多沃', lat: 55.41, lon: 37.90 },
  LED: { name: '圣彼得堡', lat: 59.80, lon: 30.26 },
  OVB: { name: '新西伯利亚', lat: 55.01, lon: 82.65 },
  ADD: { name: '亚的斯亚贝巴', lat: 8.98, lon: 38.80 },
  ABJ: { name: '阿比让', lat: 5.26, lon: -3.93 },
  SEA: { name: '西雅图', lat: 47.45, lon: -122.31 },
};

const AirportAliases = {
  PEK: ['北京', '首都', '首都机场', '北京首都机场', '北京首都国际机场'],
  PKX: ['大兴', '大兴机场', '北京大兴', '北京大兴机场', '北京大兴国际机场'],
  SHA: ['上海', '虹桥', '虹桥机场', '上海虹桥机场'],
  PVG: ['浦东', '浦东机场', '上海浦东机场'],
  CAN: ['广州', '广州白云机场'],
  SZX: ['深圳', '深圳宝安机场'],
  CTU: ['成都', '成都双流机场'],
  TFU: ['天府', '天府机场', '成都天府机场'],
  CKG: ['重庆', '重庆江北机场'],
  HGH: ['杭州', '杭州萧山机场'],
  WUH: ['武汉', '武汉天河机场'],
  XIY: ['西安', '西安咸阳机场'],
  KMG: ['昆明', '昆明长水机场'],
  HAK: ['海口', '海口美兰机场'],
  SYX: ['三亚', '三亚凤凰机场'],
  URC: ['乌鲁木齐', '地窝堡', '乌鲁木齐地窝堡'],
  NRT: ['东京', '成田', '成田机场', '东京成田机场'],
  HND: ['羽田', '羽田机场', '东京羽田机场'],
  ICN: ['首尔', '仁川', '仁川机场', '首尔仁川机场'],
  SIN: ['新加坡', '樟宜', '樟宜机场', '新加坡樟宜机场'],
  BKK: ['曼谷', '素万那普', '曼谷素万那普机场'],
  LAX: ['洛杉矶', '洛杉矶机场'],
  SFO: ['旧金山', '三藩市', '旧金山机场'],
  JFK: ['纽约', '肯尼迪', '肯尼迪机场', '纽约肯尼迪机场'],
  LHR: ['伦敦', '希思罗', '伦敦希思罗机场'],
  CDG: ['巴黎', '戴高乐', '巴黎戴高乐机场'],
  DXB: ['迪拜', '迪拜机场'],
  SYD: ['悉尼', '悉尼机场'],
  FRA: ['法兰克福', '法兰克福机场'],
  AMS: ['阿姆斯特丹', '史基浦', '阿姆斯特丹机场'],
  HKG: ['香港', '赤鱲角', '香港机场'],
  TPE: ['台北', '桃园', '桃园机场', '台北桃园机场'],
  YVR: ['温哥华', '温哥华机场'],
  IKT: ['伊尔库茨克', '伊尔库茨克机场'],
  DME: ['莫斯科', '多莫杰多沃', '莫斯科多莫杰多沃机场'],
  LED: ['圣彼得堡', '普尔科沃', '圣彼得堡机场'],
  OVB: ['新西伯利亚', '新西伯利亚机场'],
  ADD: ['亚的斯亚贝巴', '亚的斯亚贝巴机场'],
  ABJ: ['阿比让', '阿比让机场'],
  SEA: ['西雅图', '西雅图机场'],
};

const CityAirports = {
  '北京': ['PEK', 'PKX'],
  '上海': ['SHA', 'PVG'],
  '成都': ['CTU', 'TFU'],
  '东京': ['NRT', 'HND'],
};

function buildAirportAliasIndex() {
  const index = {};
  const add = (code, alias) => {
    const key = alias.trim();
    if (key && !index[key]) index[key] = code;
  };
  for (const [code, info] of Object.entries(AirportDB)) {
    add(code, code);
    add(code, info.name);
    (AirportAliases[code] || []).forEach((a) => add(code, a));
  }
  return index;
}
const AirportAliasIndex = buildAirportAliasIndex();

// ==================== 3. 基础解析函数（与 app.js 一致）====================
const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function cnToNumber(s) {
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (s === '十') return 10;
  if (s.startsWith('十')) return 10 + (CN_DIGIT[s[1]] || 0);
  if (s.includes('十')) {
    const [t, o] = s.split('十');
    return (CN_DIGIT[t] || 0) * 10 + (CN_DIGIT[o] || 0);
  }
  return CN_DIGIT[s] !== undefined ? CN_DIGIT[s] : null;
}

function padDate(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function extractDate(text) {
  let m = text.match(/(\d{4})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*[日号]?/);
  if (m) return padDate(m[1], m[2], m[3]);
  m = text.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  if (m) return padDate(m[1], m[2], m[3]);
  m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  if (m) return padDate(String(new Date().getFullYear()), m[1], m[2]);
  const now = new Date();
  const shift = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return fmtDate(d); };
  if (/大前天/.test(text)) return shift(-3);
  if (/前天/.test(text)) return shift(-2);
  if (/昨天/.test(text)) return shift(-1);
  if (/明天/.test(text)) return shift(1);
  if (/后天/.test(text)) return shift(2);
  if (/今天/.test(text)) return shift(0);
  return null;
}
// 中文航司名称 → IATA 二字码（支持「国航1372」自动匹配为 CA1372）
const AIRLINE_ALIASES = {
  '中国国际航空': 'CA', '中国国航': 'CA', '国际航空': 'CA', '国航': 'CA',
  '中国东方航空': 'MU', '中国东航': 'MU', '东方航空': 'MU', '东航': 'MU',
  '中国南方航空': 'CZ', '中国南航': 'CZ', '南方航空': 'CZ', '南航': 'CZ',
  '海南航空': 'HU', '海航': 'HU',
  '四川航空': '3U', '川航': '3U',
  '深圳航空': 'ZH', '深航': 'ZH',
  '厦门航空': 'MF', '厦航': 'MF',
  '山东航空': 'SC', '山航': 'SC',
  '上海航空': 'FM', '上航': 'FM',
  '吉祥航空': 'HO', '吉祥': 'HO',
  '春秋航空': '9C', '春秋': '9C',
  '国泰航空': 'CX', '国泰': 'CX',
  '港龙航空': 'KA', '港龙': 'KA',
  '天津航空': 'GS', '首都航空': 'JD', '长龙航空': 'GJ', '成都航空': 'EU',
  '华夏航空': 'G5', '西部航空': 'PN', '祥鹏航空': '8L', '北部湾航空': 'GX',
  '昆明航空': 'KY', '奥凯航空': 'BK', '幸福航空': 'JR', '金鹏航空': 'Y8',
};

// 从航班号中提取航司二字码（兼容 CA123 / 3U1372 / 9C8801 / 5J123）
function airlineCodeFromFlightNo(flightNo) {
  if (!flightNo) return null;
  const m = String(flightNo).match(/^[A-Z0-9]{2}/);
  return m ? m[0].toUpperCase() : null;
}

function extractFlightNo(text) {
  // 1. 中文航司名 + 数字：如「国航1372」→ CA1372
  const aliases = Object.keys(AIRLINE_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    let idx = text.indexOf(alias);
    while (idx !== -1) {
      const after = text.slice(idx + alias.length);
      const num = after.match(/^\s*(\d{2,4}[A-Za-z]?)/);
      if (num) return AIRLINE_ALIASES[alias] + num[1].toUpperCase();
      idx = text.indexOf(alias, idx + 1);
    }
  }
  // 2. 已有二字码/数字字母格式：CA123、MU583、3U1372、5J123 等
  const m = text.match(/\b(?:[A-Z]{2}\s?\d{2,4}[A-Z]?|\d[A-Z]\s?\d{3,4})\b/i);
  return m ? m[0].replace(/\s/g, '').toUpperCase() : null;
}
function extractDuration(text) {
  let m;
  m = text.match(/([0-9一两二三四五六七八九十]+)\s*个?\s*小时\s*(?:([0-9一两二三四五六七八九十]+)\s*(?:分钟|分))?/);
  if (m) return Math.round((cnToNumber(m[1]) || 0) * 60 + (cnToNumber(m[2]) || 0));
  m = text.match(/([0-9一两二三四五六七八九十]+)\s*个半\s*小时/);
  if (m) return Math.round((cnToNumber(m[1]) || 0) * 90);
  if (/半\s*小时/.test(text)) return 30;
  m = text.match(/([0-9一两二三四五六七八九十]+)\s*(?:分钟|分)/);
  if (m) return Math.round(cnToNumber(m[1]) || 0);
  m = text.match(/(\d+(?:\.\d+)?)\s*h\s*(?:(\d+)\s*m?)?/i);
  if (m) return Math.round((parseFloat(m[1]) || 0) * 60 + (parseInt(m[2]) || 0));
  m = text.match(/(\d+)\s*m/i);
  if (m) return parseInt(m[1]);
  m = text.match(/(\d+(?:\.\d+)?)\s*小时/);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  return null;
}
function extractAircraft(text) {
  const m = text.match(/\b(?:[ABE]\d{3}(?:-\d{3,4})?|7\d{2}(?:-\d{3,4})?)\b/i);
  return m ? m[0].toUpperCase() : null;
}
function findAirportMentions(text) {
  const mentions = [];
  const occupied = new Set();
  const aliases = Object.keys(AirportAliasIndex).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    let idx = text.indexOf(alias);
    while (idx !== -1) {
      let free = true;
      for (let i = idx; i < idx + alias.length; i++) {
        if (occupied.has(i)) { free = false; break; }
      }
      if (free) {
        for (let i = idx; i < idx + alias.length; i++) occupied.add(i);
        const candidates = (CityAirports[alias] && CityAirports[alias].length > 1) ? CityAirports[alias] : null;
        mentions.push({ pos: idx, code: AirportAliasIndex[alias], alias, candidates });
      }
      idx = text.indexOf(alias, idx + 1);
    }
  }
  const codeRe = /\b[A-Za-z]{3}\b/g;
  let m;
  while ((m = codeRe.exec(text))) {
    const code = m[0].toUpperCase();
    if (AirportDB[code]) {
      let free = true;
      for (let i = m.index; i < m.index + 3; i++) {
        if (occupied.has(i)) { free = false; break; }
      }
      if (free) {
        for (let i = m.index; i < m.index + 3; i++) occupied.add(i);
        mentions.push({ pos: m.index, code, alias: code, candidates: null });
      }
    }
  }
  mentions.sort((a, b) => a.pos - b.pos);
  return mentions;
}

function routeRole(text, pos, end) {
  const roleText = text.slice(0, pos) + '@' + text.slice(end);
  if (IntentClassifier.isReady()) {
    const m = IntentClassifier.classifyRole(roleText);
    if (m && m.confidence >= IntentClassifier.threshold) {
      return m.label === 'none' ? null : m.label;
    }
  }
  return routeRoleKeyword(text, pos, end);
}

function routeRoleKeyword(text, pos, end) {
  const before = text.slice(0, pos);
  const after = text.slice(end);
  let fromIdx = -1, toIdx = -1;
  for (const m of ['从', '由']) { const i = before.lastIndexOf(m); if (i > fromIdx) fromIdx = i; }
  const TO_MULTI = ['飞往', '前往', '去往', '到达', '飞向', '抵达'];
  const TO_SINGLE = ['到', '至', '抵'];
  for (const m of TO_MULTI) { const i = before.lastIndexOf(m); if (i > toIdx) toIdx = i; }
  for (const m of TO_SINGLE) { const i = before.lastIndexOf(m); if (i > toIdx) toIdx = i; }
  for (const m of ['去', '飞']) {
    let i = before.lastIndexOf(m);
    while (i >= 0) {
      const next = before[i + 1];
      if ((m === '去' && next === '年') || (m === '飞' && next === '机')) {
        i = before.lastIndexOf(m, i - 1);
        continue;
      }
      if (i > toIdx) toIdx = i;
      break;
    }
  }
  if (fromIdx < 0 && toIdx < 0) {
    for (const m of ['到达', '抵达']) {
      if (after.indexOf(m) === 0) return 'to';
    }
    for (const m of ['飞往', '前往', '去往', '飞向', '出发', '到', '至', '抵']) {
      if (after.indexOf(m) === 0) return 'from';
    }
    for (const m of ['去', '飞']) {
      if (after.indexOf(m) !== 0) continue;
      const next = after[1];
      if ((m === '去' && next === '年') || (m === '飞' && next === '机')) continue;
      return 'from';
    }
  }
  if (fromIdx < 0 && toIdx < 0) return null;
  if (toIdx < 0) return 'from';
  if (fromIdx < 0) return 'to';
  return fromIdx > toIdx ? 'from' : 'to';
}

function extractRoute(text) {
  const mentions = findAirportMentions(text);
  const result = { from: null, to: null, fromCandidates: null, toCandidates: null, fromAlias: null, toAlias: null };
  if (mentions.length === 0) return result;
  const roles = mentions.map((m) => routeRole(text, m.pos, m.pos + m.alias.length));
  const used = new Set();
  let fromM = null, toM = null;
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'from' && fromM == null) { fromM = i; used.add(i); }
  }
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'to' && toM == null) { toM = i; used.add(i); }
  }
  if (fromM == null) {
    const i = mentions.findIndex((_m, idx) => roles[idx] === null && !used.has(idx));
    if (i >= 0) { fromM = i; used.add(i); }
  }
  if (toM == null) {
    const i = mentions.findIndex((_m, idx) => roles[idx] === null && !used.has(idx));
    if (i >= 0) { toM = i; used.add(i); }
  }
  const setField = (idx, field) => {
    if (idx == null) return;
    const m = mentions[idx];
    if (m.candidates) {
      result[field + 'Candidates'] = m.candidates;
      result[field + 'Alias'] = m.alias;
    } else {
      result[field] = m.code;
    }
  };
  setField(fromM, 'from');
  setField(toM, 'to');
  return result;
}

function extractFlightInfo(text) {
  const info = {
    flightNo: null, airline: null, from: null, to: null, date: null,
    aircraft: null, durationMin: null, fromCandidates: null, toCandidates: null,
    fromAlias: null, toAlias: null,
  };
  info.date = extractDate(text);
  info.flightNo = extractFlightNo(text);
  if (info.flightNo) info.airline = airlineCodeFromFlightNo(info.flightNo);
  info.durationMin = extractDuration(text);
  info.aircraft = extractAircraft(text);
  const route = extractRoute(text);
  info.from = route.from;
  info.to = route.to;
  info.fromCandidates = route.fromCandidates;
  info.toCandidates = route.toCandidates;
  info.fromAlias = route.fromAlias;
  info.toAlias = route.toAlias;
  return info;
}

function airportName(code) {
  return (AirportDB[code] && AirportDB[code].name) || code;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function airportLabel(code) {
  if (!code) return '?';
  return escapeHtml(airportName(code)) + ' (' + escapeHtml(code) + ')';
}
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + 'm';
  if (m === 0) return h + 'h';
  return h + 'h ' + m + 'm';
}
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ==================== 4. 意图识别（模型 + 关键词兜底）====================
function parseYesNoKeyword(text) {
  const t = text.replace(/[，。！？!?\s]/g, '');
  if (/^(是|对|好|好的|可以|行|嗯|没错|是的|确定|确认|同意|ok|yes|y)/i.test(t)) return 'yes';
  if (/^(否|不|不用|不要|别|算了|取消|不是|不对|错误|no|n)/i.test(t)) return 'no';
  return null;
}
function parseYesNo(text) {
  if (IntentClassifier.isReady()) {
    const m = IntentClassifier.classifyYesNo(text);
    if (m && m.confidence >= (IntentClassifier.threshold || 0.5)) return m.label;
  }
  return parseYesNoKeyword(text);
}

const ACTION_GROUPS = {
  unsupported: ['订票', '买票', '购票', '抢票', '改签', '退票', '退款', '值机', '选座', '选位', '托运', '延误', '天气', '中转', '经停', '贵宾厅', '登机口', '行李', '里程', '积分', '航班状态'],
  delete: ['删除', '删掉', '删去', '删了', '移除', '去掉', '清除', '删'],
  modify: ['修改', '更改', '更新', '编辑', '变更', '调整', '更正', '改成', '改为', '换成', '换为', '换到', '变更为', '改一下', '改改', '换个', '换一下', '改'],
  add: ['添加', '新增', '录入', '加入', '登记', '记录', '记一下', '记一笔', '记个', '加一条', '添加一条', '保存一条', '记'],
  query: ['查询', '查看', '列出', '看看', '看一下', '列一下', '查一下', '查查', '显示', '查', '找'],
};
const VERB_LIST = [];
for (const [intent, verbs] of Object.entries(ACTION_GROUPS)) {
  for (const v of verbs) VERB_LIST.push({ intent, verb: v });
}
for (const w of ['改天', '记得', '记住', '记性', '检查', '调查', '查证']) {
  VERB_LIST.push({ intent: 'noise', verb: w });
}
VERB_LIST.sort((a, b) => b.verb.length - a.verb.length);

function isNegatedAt(text, pos) {
  const pre = text.slice(Math.max(0, pos - 6), pos);
  if (/(不如|要不|要么|无非)[^，。；！？\s]*$/.test(pre)) return false;
  return /(不要|不用|别|不|没|未|莫|勿|别把|不需|不必|不想|别要)[^，。；！？\s]*$/.test(pre);
}
function scanVerbs(text) {
  const found = [];
  let i = 0;
  while (i < text.length) {
    let hit = null;
    for (const v of VERB_LIST) {
      if (text.startsWith(v.verb, i)) { hit = v; break; }
    }
    if (hit) {
      if (hit.intent !== 'noise') {
        const before = text.slice(Math.max(0, i - 2), i);
        const isNounRecord = (hit.verb === '记录') && (before === '航班' || before === '飞行' || text[i - 1] === '的');
        if (!isNounRecord) found.push({ intent: hit.intent, verb: hit.verb, pos: i, negated: isNegatedAt(text, i) });
      }
      i += hit.verb.length;
    } else {
      i++;
    }
  }
  return found;
}
function isQuestion(text) {
  return /[？?]$/.test(text)
    || /(吗|呢|么)\s*$/.test(text)
    || /(什么|怎么|为什么|哪|多少|几点|几时|什么时候|何时|是不是|有没有|能否|可以吗|行不行|在哪里|哪个|哪些|多久|多长时间)/.test(text);
}
function isGreeting(text) {
  const t = text.replace(/[，。！？!?、\s]/g, '');
  return /^(你好|您好|你好呀|您好呀|hi|hello|hey|嗨|哈喽|在吗|在不在|早上好|上午好|中午好|下午好|晚上好|早安|午安|晚安)$/i.test(t);
}
function detectIntentKeyword(text) {
  const t = text.trim();
  if (isGreeting(t)) return 'greet';
  const verbs = scanVerbs(t);
  const question = isQuestion(t);
  const unsup = verbs.find((v) => v.intent === 'unsupported' && !v.negated);
  if (unsup) return 'unsupported';
  if (question) {
    if (/(有哪些|有没有|多少条|几条|哪些|几个|有什么|所有航班|全部航班)/.test(t)) return 'query';
    const action = verbs.find((v) => (v.intent === 'delete' || v.intent === 'modify' || v.intent === 'add') && !v.negated);
    if (action) return action.intent;
    if (/(几点|几时|什么时候|何时|多少钱|价格|票价|多久|多长时间|延误|晚点|天气|怎么|为什么)/.test(t)) return 'unsupported';
    const q = verbs.find((v) => v.intent === 'query' && !v.negated);
    if (q) return 'query';
    if (/[A-Za-z]{2}\s?\d|\d\s?[A-Za-z]|到|从|去|飞|航班/.test(t)) return 'query';
    return 'unsupported';
  }
  const main = verbs.find((v) => v.intent !== 'unsupported' && !v.negated);
  if (main) return main.intent;
  if (verbs.some((v) => v.negated)) return 'negated';
  return null;
}
function detectIntent(text) {
  if (IntentClassifier.isReady()) {
    const m = IntentClassifier.classifyIntent(text);
    if (m && m.confidence >= IntentClassifier.threshold) return m.label === 'none' ? null : m.label;
  }
  return detectIntentKeyword(text);
}

// ==================== 5. 对话状态机（与 app.js 一致）====================
const state = { flights: [] };

const assistantCtx = {
  intent: null, phase: 'idle', data: {}, target: null, candidates: [],
  pendingChanges: null, selecting: false, currentQuestion: null, pendingAmbiguity: [],
};
function resetAssistantCtx() {
  Object.assign(assistantCtx, {
    intent: null, phase: 'idle', data: {}, target: null, candidates: [],
    pendingChanges: null, selecting: false, currentQuestion: null, pendingAmbiguity: [],
  });
}

const ADD_REQUIRED = ['flightNo', 'from', 'to', 'date'];

function pickFields(info) {
  return {
    flightNo: info.flightNo, airline: info.airline, from: info.from, to: info.to,
    date: info.date, aircraft: info.aircraft, durationMin: info.durationMin,
  };
}
function collectMissing(data) { return ADD_REQUIRED.filter((k) => !data[k]); }
function collectRecap(ctx) {
  const d = ctx.data;
  const parts = [];
  if (d.flightNo) parts.push('航班号 ' + escapeHtml(d.flightNo));
  if (d.from) parts.push('从 ' + airportLabel(d.from));
  if (d.to) parts.push('到 ' + airportLabel(d.to));
  if (d.date) parts.push(escapeHtml(d.date));
  return parts.length ? '已了解：' + parts.join('，') + '。<br>' : '';
}
function askField(key) {
  const prompts = {
    flightNo: '请问航班号是多少？例如 CA123 或 MU583。',
    from: '请问从哪个机场出发？例如「北京」或「PEK」。',
    to: '请问到达哪个机场？例如「上海」或「SHA」。',
    date: '请问航班日期是哪天？例如「2024年5月1日」。',
  };
  return prompts[key] || '';
}
function mergeAddFields(ctx, info, skip) {
  // 覆盖式合并：已录入字段若再次给出新值，则视为更正并覆盖，
  // 支持「添加过程中修改已输入的信息」。
  for (const k of ['flightNo', 'from', 'to', 'date', 'aircraft', 'durationMin']) {
    if (skip === 'route' && (k === 'from' || k === 'to')) continue;
    if (info[k] != null) ctx.data[k] = info[k];
  }
  if (info.airline) ctx.data.airline = info.airline;
}
function detectAmbiguity(info) {
  const amb = [];
  if (info.from == null && info.fromCandidates && info.fromCandidates.length > 1) {
    amb.push({ field: 'from', alias: info.fromAlias, candidates: info.fromCandidates });
  }
  if (info.to == null && info.toCandidates && info.toCandidates.length > 1) {
    amb.push({ field: 'to', alias: info.toAlias, candidates: info.toCandidates });
  }
  return amb;
}
function askAmbiguity(item) {
  const opts = item.candidates.map((c, i) => `${i + 1}. ${airportLabel(c)}`).join('，');
  return `「${escapeHtml(item.alias || '该城市')}」有多个机场，请问是哪一个？<br>${opts}<br>（可回复序号、机场名或三字码）`;
}
function parseAirportChoice(text, candidates) {
  const t = text.trim();
  const m = t.match(/第?\s*([1-9一二三四五六七八九十])\s*个?/);
  if (m) {
    const n = cnToNumber(m[1]);
    if (n && n >= 1 && n <= candidates.length) return candidates[n - 1];
  }
  const codeRe = /\b[A-Za-z]{3}\b/g;
  let cm;
  while ((cm = codeRe.exec(t))) {
    const c = cm[0].toUpperCase();
    if (candidates.includes(c)) return c;
  }
  for (const c of candidates) {
    const aliases = (AirportAliases[c] || []).filter((a) => !CityAirports[a]);
    if (aliases.some((a) => t.includes(a))) return c;
  }
  return null;
}
function mergeResolvedFields(ctx, info, skipFields) {
  for (const k of ['flightNo', 'from', 'to', 'date', 'aircraft', 'durationMin']) {
    if (skipFields.includes(k)) continue;
    if (info[k] != null) ctx.data[k] = info[k];
  }
  if (info.airline) ctx.data.airline = info.airline;
}
function flightSummary(f) {
  return `${f.flightNo} ${airportName(f.from)}→${airportName(f.to)} ${f.date || ''}`.trim();
}
function flightSummaryDetailed(f) {
  const rows = [
    '航班号：<strong>' + escapeHtml(f.flightNo) + '</strong>',
    '出发：' + airportLabel(f.from),
    '到达：' + airportLabel(f.to),
    '日期：' + escapeHtml(f.date || '—'),
  ];
  if (f.aircraft) rows.push('机型：' + escapeHtml(f.aircraft));
  if (f.durationMin) rows.push('时长：' + formatDuration(f.durationMin));
  return rows.join('<br>');
}
function buildAddConfirm(ctx) {
  const d = ctx.data;
  const rows = [];
  if (d.flightNo) rows.push('航班号：<strong>' + escapeHtml(d.flightNo) + '</strong>');
  if (d.from) rows.push('出发：' + airportLabel(d.from));
  if (d.to) rows.push('到达：' + airportLabel(d.to));
  if (d.date) rows.push('日期：' + escapeHtml(d.date));
  if (d.aircraft) rows.push('机型：' + escapeHtml(d.aircraft));
  if (d.durationMin != null) rows.push('时长：' + formatDuration(d.durationMin));
  return '已为您整理航班信息：<br>' + rows.join('<br>') + '<br><br>确认添加吗？（回复「是」确认，「否」取消）';
}
function buildCandidateList(list) {
  return '找到 ' + list.length + ' 条匹配记录：<br>' +
    list.map((f, i) => `${i + 1}. ${escapeHtml(flightSummary(f))}`).join('<br>');
}
function filterFlights(list, key) {
  return list.filter((f) => {
    if (key.flightNo && (f.flightNo || '').toUpperCase() !== key.flightNo) return false;
    if (key.from && f.from !== key.from) return false;
    if (key.to && f.to !== key.to) return false;
    if (key.date && f.date !== key.date) return false;
    return true;
  });
}
function matchFlightsByKey(key) { return filterFlights(state.flights, key); }
function splitModifyInfo(info) {
  let matchKey = null;
  if (info.flightNo) matchKey = { flightNo: info.flightNo };
  else if (info.from && info.to) matchKey = { from: info.from, to: info.to };
  else if (info.from) matchKey = { from: info.from };
  else if (info.to) matchKey = { to: info.to };
  else if (info.date) matchKey = { date: info.date };
  const changes = {};
  for (const k of ['date', 'aircraft', 'durationMin', 'from', 'to']) {
    if (info[k] == null) continue;
    if (matchKey && matchKey.from && k === 'from') continue;
    if (matchKey && matchKey.to && k === 'to') continue;
    changes[k] = info[k];
  }
  return { matchKey, changes };
}
function buildModifyConfirm(ctx) {
  const t = ctx.target;
  const changes = ctx.data || {};
  const fields = [
    ['date', '日期', (f) => f.date || '—'],
    ['aircraft', '机型', (f) => f.aircraft || '—'],
    ['durationMin', '时长', (f) => (f.durationMin != null ? formatDuration(f.durationMin) : '—')],
    ['from', '出发', (f) => airportName(f.from)],
    ['to', '到达', (f) => airportName(f.to)],
  ];
  const diffs = [];
  for (const [key, label, get] of fields) {
    if (!(key in changes)) continue;
    const oldVal = get(t);
    const newVal = key === 'durationMin' ? formatDuration(changes[key])
      : (key === 'from' || key === 'to') ? airportName(changes[key]) : changes[key];
    diffs.push(`${label}：${escapeHtml(oldVal)} → <strong>${escapeHtml(newVal)}</strong>`);
  }
  if (diffs.length === 0) return '请说明要修改的内容。';
  return '确认修改「' + escapeHtml(flightSummary(t)) + '」：<br>' +
    diffs.join('<br>') + '<br><br>确认修改吗？（回复「是」确认，「否」取消）';
}
function buildDeleteConfirm(ctx) {
  return '确认删除以下航班吗？<br>' + flightSummaryDetailed(ctx.target) +
    '<br><br>确认删除吗？（回复「是」确认，「否」取消）';
}

function greetReply() {
  return '你好！我是 iFly 航班记录助手，可以帮你：<br>· 添加航班：…<br>· 修改航班：…<br>· 删除航班：…<br>· 查询航班：…<br>直接告诉我想做什么吧。';
}
function unsupportedReply() {
  return '抱歉，这个功能我暂时还不支持。目前我可以帮你：添加、修改、删除航班，以及查询已有航班记录。你可以先试试这些。';
}
function notUnderstandReply() {
  return '抱歉，我没太听懂你的意思，这类请求我暂时还不支持。<br>目前我可以帮你：添加、修改、删除航班，以及查询已有航班记录。';
}
function flightQueryLine(f) {
  let s = flightSummary(f);
  if (f.aircraft) s += ' · ' + f.aircraft;
  if (f.durationMin) s += ' · ' + formatDuration(f.durationMin);
  return s;
}
function handleQuery(info) {
  const key = extractKey(info);
  const hasKey = Object.keys(key).length > 0;
  const matches = hasKey ? matchFlightsByKey(key) : state.flights;
  if (matches.length === 0) {
    return hasKey
      ? '没有找到匹配的航班记录，你可以换个航班号、航线或日期试试。'
      : '目前还没有任何航班记录。你可以直接告诉我航班信息来添加，例如「记录 5月1日 CA123 北京到上海」。';
  }
  const header = hasKey ? '为你找到 ' + matches.length + ' 条匹配记录：<br>' : '当前共有 ' + matches.length + ' 条航班记录：<br>';
  return header + matches.map((f, i) => `${i + 1}. ${escapeHtml(flightQueryLine(f))}`).join('<br>');
}
function startAdd(ctx, info) {
  ctx.intent = 'add';
  ctx.data = pickFields(info);
  const amb = detectAmbiguity(info);
  if (amb.length) {
    ctx.pendingAmbiguity = amb;
    ctx.phase = 'collect';
    return askAmbiguity(amb[0]);
  }
  const missing = collectMissing(ctx.data);
  if (missing.length === 0) {
    ctx.phase = 'confirm';
    return buildAddConfirm(ctx);
  }
  ctx.phase = 'collect';
  ctx.currentQuestion = missing[0];
  return collectRecap(ctx) + askField(missing[0]);
}
function startDelete(ctx, info) {
  ctx.intent = 'delete';
  const key = extractKey(info);
  const amb = detectAmbiguity(info);
  if (amb.length) {
    ctx.data = key;
    ctx.pendingAmbiguity = amb;
    ctx.phase = 'collect';
    return askAmbiguity(amb[0]);
  }
  return deleteByKey(ctx, key);
}
function deleteByKey(ctx, key) {
  if (Object.keys(key).length === 0) {
    ctx.phase = 'collect';
    ctx.currentQuestion = 'flightNo';
    return '请问您要删除哪条航班？请提供航班号，或航线、日期。';
  }
  const candidates = matchFlightsByKey(key);
  if (candidates.length === 0) {
    resetAssistantCtx();
    return '我没有找到匹配的航班记录，请确认航班号或航线是否正确。';
  }
  if (candidates.length > 1) {
    ctx.candidates = candidates;
    ctx.phase = 'collect';
    ctx.selecting = true;
    return buildCandidateList(candidates) + '<br>请回复序号选择要删除的航班。';
  }
  ctx.target = candidates[0];
  ctx.phase = 'confirm';
  return buildDeleteConfirm(ctx);
}
function startModify(ctx, info) {
  ctx.intent = 'modify';
  const { matchKey, changes } = splitModifyInfo(info);
  ctx.pendingChanges = changes;
  if (!matchKey) {
    ctx.phase = 'collect';
    ctx.currentQuestion = 'flightNo';
    return '请问您要修改哪条航班？请提供航班号（例如 CA123）或出发/到达机场。';
  }
  const candidates = matchFlightsByKey(matchKey);
  if (candidates.length === 0) {
    resetAssistantCtx();
    return '我没有找到匹配的航班记录，请确认航班号或航线是否正确。';
  }
  if (candidates.length > 1) {
    ctx.candidates = candidates;
    ctx.pendingChanges = changes;
    ctx.phase = 'collect';
    ctx.selecting = true;
    return buildCandidateList(candidates) + '<br>请回复序号选择，或提供航班号/日期进一步定位。';
  }
  ctx.target = candidates[0];
  ctx.data = changes;
  if (Object.keys(changes).length === 0) {
    ctx.phase = 'collect';
    ctx.currentQuestion = 'change';
    return `请问要修改「${flightSummary(ctx.target)}」的哪些信息？例如日期、机型、时长或航线。`;
  }
  ctx.phase = 'confirm';
  return buildModifyConfirm(ctx);
}
function handleSelection(ctx, t) {
  const idx = parseInt(t, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= ctx.candidates.length) {
    const chosen = ctx.candidates[idx - 1];
    ctx.candidates = [];
    ctx.selecting = false;
    if (ctx.intent === 'delete') {
      ctx.target = chosen;
      ctx.phase = 'confirm';
      return buildDeleteConfirm(ctx);
    }
    ctx.target = chosen;
    ctx.data = ctx.pendingChanges || {};
    ctx.pendingChanges = null;
    if (Object.keys(ctx.data).length === 0) {
      ctx.phase = 'collect';
      ctx.currentQuestion = 'change';
      return `请告诉我「${flightSummary(chosen)}」需要修改哪些信息？`;
    }
    ctx.phase = 'confirm';
    return buildModifyConfirm(ctx);
  }
  const info = extractFlightInfo(t);
  const key = {};
  if (info.flightNo) key.flightNo = info.flightNo;
  if (info.from) key.from = info.from;
  if (info.to) key.to = info.to;
  if (info.date) key.date = info.date;
  if (Object.keys(key).length) {
    const narrowed = filterFlights(ctx.candidates, key);
    if (narrowed.length === 0) return '没有找到匹配的航班，请回复序号或提供更准确的信息。';
    if (narrowed.length === 1) {
      ctx.candidates = [];
      ctx.selecting = false;
      ctx.target = narrowed[0];
      if (ctx.intent === 'delete') {
        ctx.phase = 'confirm';
        return buildDeleteConfirm(ctx);
      }
      ctx.data = ctx.pendingChanges || {};
      ctx.pendingChanges = null;
      if (Object.keys(ctx.data).length === 0) {
        ctx.phase = 'collect';
        ctx.currentQuestion = 'change';
        return `请告诉我「${flightSummary(ctx.target)}」需要修改哪些信息？`;
      }
      ctx.phase = 'confirm';
      return buildModifyConfirm(ctx);
    }
    ctx.candidates = narrowed;
    return buildCandidateList(narrowed) + '<br>请回复序号选择。';
  }
  return '请回复序号（如 1、2），或提供航班号/日期进一步定位。';
}
function extractKey(info) {
  const key = {};
  if (info.flightNo) key.flightNo = info.flightNo;
  if (info.from) key.from = info.from;
  if (info.to) key.to = info.to;
  if (info.date) key.date = info.date;
  return key;
}
function handleCollect(ctx, t) {
  const info = extractFlightInfo(t);
  if (ctx.intent === 'delete') return handleCollectDelete(ctx, info);
  if (ctx.intent === 'modify') return handleCollectModify(ctx, info);
  return handleCollectAdd(ctx, info);
}
function handleCollectDelete(ctx, info) {
  const amb = detectAmbiguity(info);
  if (amb.length) {
    Object.assign(ctx.data, extractKey(info));
    ctx.pendingAmbiguity = amb;
    ctx.phase = 'collect';
    return askAmbiguity(amb[0]);
  }
  const key = extractKey(info);
  Object.assign(ctx.data, key);
  return deleteByKey(ctx, key);
}
function handleCollectModify(ctx, info) {
  if (!ctx.target) {
    const key = extractKey(info);
    if (Object.keys(key).length === 0) {
      return '请问您要修改哪条航班？请提供航班号（例如 CA123）或出发/到达机场。';
    }
    const candidates = matchFlightsByKey(key);
    if (candidates.length === 0) {
      resetAssistantCtx();
      return '我没有找到匹配的航班记录，请确认航班号或航线是否正确。';
    }
    if (candidates.length > 1) {
      ctx.candidates = candidates;
      ctx.selecting = true;
      ctx.phase = 'collect';
      return buildCandidateList(candidates) + '<br>请回复序号选择，或提供航班号/日期进一步定位。';
    }
    ctx.target = candidates[0];
    if (ctx.pendingChanges && Object.keys(ctx.pendingChanges).length) {
      ctx.data = ctx.pendingChanges;
      ctx.pendingChanges = null;
      ctx.phase = 'confirm';
      return buildModifyConfirm(ctx);
    }
    ctx.phase = 'collect';
    ctx.currentQuestion = 'change';
    return `已找到「${escapeHtml(flightSummary(ctx.target))}」。请问要修改哪些信息？例如日期、机型、时长或航线。`;
  }
  for (const k of ['date', 'aircraft', 'durationMin', 'from', 'to']) {
    if (info[k] != null) ctx.data[k] = info[k];
  }
  if (Object.keys(ctx.data).length === 0) {
    return '抱歉，我没有识别到要修改的内容。请说明，例如「机型改成A350」或「日期改为5月2日」。';
  }
  ctx.phase = 'confirm';
  ctx.currentQuestion = null;
  return buildModifyConfirm(ctx);
}
function handleCollectAdd(ctx, info) {
  const amb = detectAmbiguity(info);
  if (amb.length) {
    mergeResolvedFields(ctx, info, amb.map((a) => a.field));
    ctx.pendingAmbiguity = amb;
    ctx.phase = 'collect';
    return askAmbiguity(amb[0]);
  }
  const q = ctx.currentQuestion;
  if (q === 'from' || q === 'to') {
    const answeredRoute = !!(info.from || info.to);
    if (info.from && info.to) {
      ctx.data.from = info.from;
      ctx.data.to = info.to;
    } else if (info.from || info.to) {
      ctx.data[q] = info.from || info.to;
    }
    // 即使本条消息没有答上机场，也要合并航班号/日期/机型/时长等可能的更正信息
    mergeAddFields(ctx, info, 'route');
    if (!answeredRoute && !info.flightNo && !info.date && info.aircraft == null && info.durationMin == null) {
      return '抱歉，我没有识别到机场，请用机场名或三字码（例如「北京」或「PEK」）。';
    }
  } else {
    mergeAddFields(ctx, info, null);
  }

  const missing = collectMissing(ctx.data);
  if (missing.length === 0) {
    ctx.phase = 'confirm';
    ctx.currentQuestion = null;
    return buildAddConfirm(ctx);
  }
  ctx.currentQuestion = missing[0];
  return collectRecap(ctx) + askField(missing[0]);
}
function handleAirportChoice(ctx, t) {
  const item = ctx.pendingAmbiguity[0];
  const chosen = parseAirportChoice(t, item.candidates);
  if (!chosen) {
    return '抱歉，我没有识别到您的选择。' + askAmbiguity(item);
  }
  ctx.data[item.field] = chosen;
  ctx.pendingAmbiguity.shift();
  if (ctx.pendingAmbiguity.length) {
    return askAmbiguity(ctx.pendingAmbiguity[0]);
  }
  if (ctx.intent === 'delete') return continueDeleteAfterResolve(ctx);
  return continueAddAfterResolve(ctx);
}
function continueDeleteAfterResolve(ctx) {
  const key = {};
  if (ctx.data.flightNo) key.flightNo = ctx.data.flightNo;
  if (ctx.data.from) key.from = ctx.data.from;
  if (ctx.data.to) key.to = ctx.data.to;
  if (ctx.data.date) key.date = ctx.data.date;
  return deleteByKey(ctx, key);
}
function continueAddAfterResolve(ctx) {
  const missing = collectMissing(ctx.data);
  if (missing.length === 0) {
    ctx.phase = 'confirm';
    ctx.currentQuestion = null;
    return buildAddConfirm(ctx);
  }
  ctx.currentQuestion = missing[0];
  return collectRecap(ctx) + askField(missing[0]);
}

// 添加流程确认阶段的修正：覆盖已填字段后重新整理/追问
function handleAddConfirmCorrection(ctx, info) {
  const amb = detectAmbiguity(info);
  if (amb.length) {
    mergeResolvedFields(ctx, info, amb.map(a => a.field));
    ctx.pendingAmbiguity = amb;
    ctx.phase = 'collect';
    return askAmbiguity(amb[0]);
  }
  mergeAddFields(ctx, info, null);
  const missing = collectMissing(ctx.data);
  if (missing.length === 0) {
    ctx.phase = 'confirm';
    ctx.currentQuestion = null;
    return buildAddConfirm(ctx);
  }
  ctx.phase = 'collect';
  ctx.currentQuestion = missing[0];
  return collectRecap(ctx) + askField(missing[0]);
}

async function getAssistantReply(text) {
  const t = text.trim();
  const ctx = assistantCtx;
  if (ctx.phase === 'confirm') {
    // 添加流程确认阶段：优先识别「修正」类输入（含航班信息），
    // 避免「日期改成5月2日」等被是/否分类器误判为「是」。
    if (ctx.intent === 'add') {
      const info = extractFlightInfo(t);
      if (info.flightNo || info.from || info.to || info.date || info.aircraft || info.durationMin != null || info.fromCandidates || info.toCandidates) {
        return handleAddConfirmCorrection(ctx, info);
      }
    }
    const ans = parseYesNo(t);
    if (ans === 'yes') {
      const msg = await executeConfirmed(ctx);
      resetAssistantCtx();
      return msg;
    }
    if (ans === 'no') {
      resetAssistantCtx();
      return '好的，已取消，未做任何改动。还有什么可以帮您的吗？';
    }
    resetAssistantCtx();
  }
  if (ctx.phase === 'collect' && /^(取消|算了|不弄了|不要了|放弃|退出|不做了)$/.test(t.replace(/[，。！？!?、\s]/g, ''))) {
    resetAssistantCtx();
    return '好的，已取消当前操作。还有什么可以帮您的吗？';
  }
  if (ctx.phase === 'collect' && ctx.pendingAmbiguity.length) {
    return handleAirportChoice(ctx, t);
  }
  if (ctx.phase === 'collect' && ctx.selecting) {
    return handleSelection(ctx, t);
  }
  if (ctx.phase === 'collect') {
    return handleCollect(ctx, t);
  }
  return handleNewIntent(ctx, t);
}
function handleNewIntent(ctx, t) {
  const intent = detectIntent(t);
  const info = extractFlightInfo(t);
  if (intent === 'greet') return greetReply();
  if (intent === 'unsupported') return unsupportedReply();
  if (intent === 'negated') return '好的，我没有执行这个操作。有什么需要我帮你添加、修改、删除或查询的吗？';
  if (intent === 'query') return handleQuery(info);
  const hasInfo = info.flightNo || info.from || info.to || info.date || info.fromCandidates || info.toCandidates;
  if (!intent && !hasInfo) return notUnderstandReply();
  const action = intent || 'add';
  if (action === 'add') return startAdd(ctx, info);
  if (action === 'delete') return startDelete(ctx, info);
  return startModify(ctx, info);
}

// 内存数据存储（模拟 SQLite 后端）
async function saveFlight(flight) {
  flight.id = state.flights.length + 1;
  state.flights.push(flight);
}
async function updateFlight(id, patch) {
  const f = state.flights.find((x) => x.id === id);
  if (f) Object.assign(f, patch);
}
async function deleteFlight(id) {
  state.flights = state.flights.filter((x) => x.id !== id);
}

async function executeConfirmed(ctx) {
  if (ctx.intent === 'add') return doAdd(ctx);
  if (ctx.intent === 'modify') return doModify(ctx);
  if (ctx.intent === 'delete') return doDelete(ctx);
  return '操作已取消。';
}
async function doAdd(ctx) {
  const d = ctx.data;
  const distance = (d.from && d.to)
    ? haversineDistance(AirportDB[d.from].lat, AirportDB[d.from].lon, AirportDB[d.to].lat, AirportDB[d.to].lon)
    : 0;
  const flight = {
    flightNo: d.flightNo, airline: d.airline || null, from: d.from, to: d.to,
    fromName: airportName(d.from), toName: airportName(d.to), date: d.date,
    aircraft: d.aircraft || null,
    durationMin: d.durationMin != null ? d.durationMin : (d.from && d.to ? Math.round(distance / 800 * 60) : 0),
    distance,
  };
  await saveFlight(flight);
  return '已添加航班：<br>' + flightSummaryDetailed(flight);
}
async function doModify(ctx) {
  const id = ctx.target.id;
  const changes = ctx.data || {};
  const patch = {};
  if (changes.from) { patch.from = changes.from; patch.fromName = airportName(changes.from); }
  if (changes.to) { patch.to = changes.to; patch.toName = airportName(changes.to); }
  if (changes.date) patch.date = changes.date;
  if (changes.aircraft) patch.aircraft = changes.aircraft;
  if (changes.durationMin != null) patch.durationMin = changes.durationMin;
  const from = patch.from || ctx.target.from;
  const to = patch.to || ctx.target.to;
  if ((patch.from || patch.to) && from && to) {
    patch.distance = haversineDistance(AirportDB[from].lat, AirportDB[from].lon, AirportDB[to].lat, AirportDB[to].lon);
  }
  await updateFlight(id, patch);
  return '已更新航班记录。';
}
async function doDelete(ctx) {
  await deleteFlight(ctx.target.id);
  return '已删除航班记录。';
}

// ==================== 6. 分析工具 ====================
function pct(x) { return x == null ? '—' : Math.round(x * 100) + '%'; }
function stripHtml(s) {
  return String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
}

function analyze(text) {
  const mi = IntentClassifier.classifyIntent(text);
  const finalIntent = detectIntent(text);
  const my = IntentClassifier.classifyYesNo(text);
  const finalYesNo = parseYesNo(text);
  const info = extractFlightInfo(text);
  const roles = findAirportMentions(text).map((m) => {
    const roleText = text.slice(0, m.pos) + '@' + text.slice(m.pos + m.alias.length);
    const mr = IntentClassifier.classifyRole(roleText);
    const finalRole = routeRole(text, m.pos, m.pos + m.alias.length);
    return { alias: m.alias, code: m.code, roleText, modelLabel: mr && mr.label, modelConf: mr && mr.confidence, finalRole };
  });
  return { intentModel: mi, intentFinal: finalIntent, yesnoModel: my, yesnoFinal: finalYesNo, info, roles };
}

// ==================== 7. 测试运行器 ====================
const scenarios = [];

function scenario(name, seed, turns, verify) {
  scenarios.push({ name, seed, turns, verify });
}

// ---- 场景 1：添加航班（城市名 → 触发机场歧义追问）----
scenario('添加航班（城市名，触发多机场歧义追问）', [], [
  '记录 5月1日 CA123 北京到上海 A321 2小时45分',
  '1',
  '2',
  '是',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'CA123' && f.from === 'PEK' && f.to === 'PVG' && f.date === '2026-05-01' && f.aircraft === 'A321' && f.durationMin === 165;
});

// ---- 场景 2：添加航班（三字码 → 一步到位）----
scenario('添加航班（三字码，一步到位）', [], [
  '记录 5月2日 MU583 PEK 到 SHA',
  '好',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'MU583' && f.from === 'PEK' && f.to === 'SHA';
});

// ---- 场景 3：修改航班（机型）----
scenario('修改航班（机型 A321 → A350）', [
  { id: 1, flightNo: 'CA123', airline: 'CA', from: 'PEK', to: 'SHA', fromName: '北京首都', toName: '上海虹桥', date: '2026-05-01', aircraft: 'A321', durationMin: 165, distance: 1080 },
], [
  '把 CA123 的机型改成 A350',
  '是',
], (flights) => {
  return flights.length === 1 && flights[0].aircraft === 'A350';
});

// ---- 场景 4：修改航班（日期）----
scenario('修改航班（日期 → 5月3日）', [
  { id: 1, flightNo: 'CA123', airline: 'CA', from: 'PEK', to: 'SHA', fromName: '北京首都', toName: '上海虹桥', date: '2026-05-01', aircraft: 'A350', durationMin: 165, distance: 1080 },
], [
  '把 CA123 的日期改为 5月3日',
  '是的',
], (flights) => {
  return flights.length === 1 && flights[0].date === '2026-05-03';
});

// ---- 场景 5：删除航班 ----
scenario('删除航班（CA123）', [
  { id: 1, flightNo: 'CA123', airline: 'CA', from: 'PEK', to: 'SHA', fromName: '北京首都', toName: '上海虹桥', date: '2026-05-01', aircraft: 'A350', durationMin: 165, distance: 1080 },
], [
  '删除 CA123',
  '是',
], (flights) => {
  return flights.length === 0;
});

// ---- 场景 6：否定删除（不执行）----
scenario('否定删除（不执行，记录应保留）', [
  { id: 1, flightNo: 'CA123', airline: 'CA', from: 'PEK', to: 'SHA', fromName: '北京首都', toName: '上海虹桥', date: '2026-05-01', aircraft: 'A350', durationMin: 165, distance: 1080 },
], [
  '不要删除 CA123',
], (flights) => {
  return flights.length === 1 && flights[0].flightNo === 'CA123';
});

// ---- 场景 7：方向词在提及后（上下文感知回归验证）----
scenario('添加航班（方向词在提及后：飞往）', [], [
  '记录 5月3日 CZ345 广州飞往深圳',
  '好',
], (flights) => {
  const f = flights[0];
  return f && f.from === 'CAN' && f.to === 'SZX';
});

// ---- 场景 8：添加航班（不按顺序输入：先日期/航线，后航班号）----
scenario('添加航班（不按顺序输入：日期与航线先给，航班号后补）', [], [
  '记录 5月2日 PEK到SHA',
  'MU583',
  '好',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'MU583' && f.from === 'PEK' && f.to === 'SHA' && f.date === '2026-05-02';
});

// ---- 场景 9：添加航班（信息多次分散输入：一轮只给一个字段）----
scenario('添加航班（信息分散多次输入）', [], [
  '我要记录 CA123',
  '从PEK出发',
  '到SHA',
  '5月4日',
  '是的',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'CA123' && f.from === 'PEK' && f.to === 'SHA' && f.date === '2026-05-04';
});

// ---- 场景 10：添加中途取消（信息收集阶段）----
scenario('添加中途取消（信息收集阶段）', [], [
  '记录 CA123 PEK到SHA',
  '算了',
], (flights) => flights.length === 0);

// ---- 场景 11：添加中途取消（确认阶段）----
scenario('添加中途取消（确认阶段）', [], [
  '记录 CA123 PEK到SHA 5月5日',
  '不用了',
], (flights) => flights.length === 0);

// ---- 场景 12：添加过程中修改已输入的信息（更正出发机场 PEK→CAN）----
scenario('添加过程中更正已输入的航线（PEK 改为 CAN）', [], [
  '记录 CA123 PEK 5月8日',
  '不对，从CAN到SHA',
  '是',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'CA123' && f.from === 'CAN' && f.to === 'SHA' && f.date === '2026-05-08';
});

// ---- 场景 13：确认阶段更正日期（非航线字段，覆盖式合并）----
scenario('确认阶段更正日期（5月1日 改为 5月2日）', [], [
  '记录 CA123 PEK到SHA 5月1日',
  '日期改成5月2日',
  '是',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'CA123' && f.from === 'PEK' && f.to === 'SHA' && f.date === '2026-05-02';
});

// ---- 场景 14：收集阶段更正航班号（CA123 改为 CA456）----
scenario('收集阶段更正航班号（CA123 改为 CA456）', [], [
  '记录 CA123 PEK 5月3日',
  '航班号改成CA456',
  'SHA',
  '是',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'CA456' && f.from === 'PEK' && f.to === 'SHA' && f.date === '2026-05-03';
});

// ---- 场景 15：中文航司名自动匹配（国航1372 → CA1372）----
scenario('中文航司名自动匹配（国航1372 → CA1372）', [], [
  '记录 国航1372 PEK到SHA 5月6日',
  '是',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === 'CA1372' && f.airline === 'CA' && f.from === 'PEK' && f.to === 'SHA' && f.date === '2026-05-06';
});

// ---- 场景 16：中文航司名自动匹配（川航 → 3U，数字前缀代码）----
scenario('中文航司名自动匹配（川航 → 3U）', [], [
  '记录 川航8899 CAN到SHA 5月7日',
  '是',
], (flights) => {
  const f = flights[0];
  return f && f.flightNo === '3U8899' && f.airline === '3U' && f.from === 'CAN' && f.to === 'SHA';
});

function resetStore() {
  state.flights = [];
  resetAssistantCtx();
}

async function runScenario(sc) {
  resetStore();
  state.flights = sc.seed.map((f) => ({ ...f }));

  console.log('\n' + '='.repeat(66));
  console.log('【场景】' + sc.name);
  console.log('='.repeat(66));
  if (sc.seed.length) {
    console.log('  初始数据：' + sc.seed.map((f) => `${f.flightNo} ${f.from}→${f.to} ${f.date}`).join(' | '));
  }

  for (const [i, input] of sc.turns.entries()) {
    console.log(`\n  ── 第 ${i + 1} 轮 · 用户：${input}`);
    const a = analyze(input);

    // 模型反馈
    console.log(`    [意图] 模型=${a.intentModel.label}(${pct(a.intentModel.confidence)})  最终=${a.intentFinal ?? '(null)'}`);
    if (a.roles.length) {
      for (const r of a.roles) {
        console.log(`    [角色] 「${r.alias}」 roleText="${r.roleText}"  模型=${r.modelLabel}(${pct(r.modelConf)})  最终=${r.finalRole ?? '(null)'}`);
      }
    } else if (/^(是|好|好的|是的|对|可以|行|嗯|不|否|不用|算了|取消)/.test(input)) {
      console.log(`    [确认] 模型=${a.yesnoModel.label}(${pct(a.yesnoModel.confidence)})  最终=${a.yesnoFinal ?? '(null)'}`);
    }

    const reply = await getAssistantReply(input);
    console.log('    [回复] ' + stripHtml(reply).replace(/\n/g, '\n            '));

    const ctxPhase = assistantCtx.phase;
    const ctxIntent = assistantCtx.intent;
    if (ctxPhase !== 'idle') console.log(`    [状态] phase=${ctxPhase} intent=${ctxIntent ?? '(null)'}`);
  }

  const ok = sc.verify(state.flights);
  console.log(`\n  ▶ 结果：${ok ? '✅ 通过' : '❌ 失败'}`);
  if (state.flights.length) {
    console.log('    当前记录：' + state.flights.map((f) => `${f.flightNo} ${f.from}→${f.to} ${f.date} ${f.aircraft || ''}`.trim()).join(' | '));
  } else {
    console.log('    当前记录：（空）');
  }
  return ok;
}

// ---- 附：单独的角色上下文回归表 ----
function roleRegressionTable() {
  console.log('\n' + '='.repeat(66));
  console.log('【附】语义角色上下文感知回归（@ 占位 → 角色）');
  console.log('='.repeat(66));
  const cases = [
    '从北京到上海', '北京到上海', '上海飞往北京', '北京飞上海',
    '从上海到北京', '飞往上海的航班', '去年北京', '飞机北京',
  ];
  for (const text of cases) {
    const mentions = findAirportMentions(text);
    const roles = mentions.map((m) => {
      const roleText = text.slice(0, m.pos) + '@' + text.slice(m.pos + m.alias.length);
      const mr = IntentClassifier.classifyRole(roleText);
      return `${m.alias}(${mr.label}/${pct(mr.confidence)})`;
    });
    console.log(`  「${text}」 → ${roles.join(' , ') || '（无机场提及）'}`);
  }
}

async function main() {
  console.log('iFly · 对话功能端到端测试');
  console.log('模型：js/nlp/intent_model.json  threshold=' + threshold);
  console.log('当前日期基准：' + new Date().toISOString().slice(0, 10));

  let pass = 0;
  for (const sc of scenarios) {
    const ok = await runScenario(sc);
    if (ok) pass++;
  }

  roleRegressionTable();

  console.log('\n' + '='.repeat(66));
  console.log(`汇总：${pass}/${scenarios.length} 个场景通过`);
  console.log('='.repeat(66));
  if (pass !== scenarios.length) process.exit(1);
}

main();