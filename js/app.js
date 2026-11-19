// iFly - Main Application
import { EarthGlobe } from './earth.js';
import { IntentClassifier } from './nlp/intent_model.js';

// ==================== Airport Database ====================
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
  // New additions from Flighty import
  YVR: { name: '温哥华', lat: 49.19, lon: -123.18 },
  IKT: { name: '伊尔库茨克', lat: 52.27, lon: 104.39 },
  DME: { name: '莫斯科多莫杰多沃', lat: 55.41, lon: 37.90 },
  LED: { name: '圣彼得堡', lat: 59.80, lon: 30.26 },
  OVB: { name: '新西伯利亚', lat: 55.01, lon: 82.65 },
  ADD: { name: '亚的斯亚贝巴', lat: 8.98, lon: 38.80 },
  ABJ: { name: '阿比让', lat: 5.26, lon: -3.93 },
  SEA: { name: '西雅图', lat: 47.45, lon: -122.31 },
};

// ==================== Data Store ====================
const state = {
  flights: [],
  airlines: new Set(),
  aircraftTypes: new Set(),
  airports: new Set(),
  totalMileage: 0,
  totalDurationMin: 0,
};

// ==================== UI 状态持久化 ====================
const UI_STATE_KEY = 'ifly-ui-state';
let fullBright = false;

function loadUIState() {
  try {
    return JSON.parse(localStorage.getItem(UI_STATE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUIState(patch) {
  try {
    const state = loadUIState();
    Object.assign(state, patch);
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

function getAirportPairs() {
  const pairs = [];
  state.flights.forEach(f => {
    if (f.from && f.to) {
      pairs.push({ from: f.from, to: f.to });
    }
  });
  return pairs;
}

// ==================== Airport Metadata ====================
const AirportCountry = {
  PEK: '中国大陆', PKX: '中国大陆', SHA: '中国大陆', PVG: '中国大陆',
  CAN: '中国大陆', SZX: '中国大陆', CTU: '中国大陆', TFU: '中国大陆', CKG: '中国大陆',
  HGH: '中国大陆', WUH: '中国大陆', XIY: '中国大陆', KMG: '中国大陆',
  HAK: '中国大陆', SYX: '中国大陆', URC: '中国大陆',
  HKG: '中国香港', TPE: '中国台湾',
  NRT: '日本', HND: '日本',
  ICN: '韩国',
  SIN: '新加坡',
  BKK: '泰国',
  LAX: '美国', SFO: '美国', JFK: '美国', SEA: '美国',
  LHR: '英国', CDG: '法国',
  DXB: '阿联酋',
  SYD: '澳大利亚',
  FRA: '德国', AMS: '荷兰',
  YVR: '加拿大',
  IKT: '俄罗斯', DME: '俄罗斯', LED: '俄罗斯', OVB: '俄罗斯',
  ADD: '埃塞俄比亚',
  ABJ: '科特迪瓦',
};

const ChinaMainland = new Set([
  'PEK','PKX','SHA','PVG','CAN','SZX','CTU','TFU','CKG',
  'HGH','WUH','XIY','KMG','HAK','SYX','URC',
]);

function isDomestic(f) {
  return ChinaMainland.has(f.from) && ChinaMainland.has(f.to);
}

function getCountry(code) {
  return AirportCountry[code] || '其他';
}

// ==================== Statistics & Rendering ====================
let lineChartId = 0;

function updateHistory() {
  const scroll = document.getElementById('history-scroll');
  if (!scroll) return;

  const f = state.flights;
  if (f.length === 0) {
    scroll.innerHTML = '<div class="history-empty">暂无飞行记录</div>';
    return;
  }

  state.totalMileage = 0;
  state.totalDurationMin = 0;
  state.airports.clear();
  state.airlines.clear();
  state.aircraftTypes.clear();
  f.forEach(fl => {
    state.totalMileage += fl.distance || 0;
    state.totalDurationMin += fl.durationMin || 0;
    if (fl.from) state.airports.add(fl.from);
    if (fl.to) state.airports.add(fl.to);
    if (fl.airline) state.airlines.add(fl.airline);
    if (fl.aircraft) state.aircraftTypes.add(fl.aircraft);
  });

  lineChartId = 0;

  let html = '';
  html += renderBasicInfo(f);
  html += renderFlightCount(f);
  html += renderMileage(f);
  html += renderDuration(f);
  html += renderAirports(f);
  html += renderAirlines(f);
  html += renderCountries(f);
  html += renderAircraft(f);

  scroll.innerHTML = html;
}

// ---- Section 1: Basic Info ----
function renderBasicInfo(f) {
  const hours = Math.floor(state.totalDurationMin / 60);
  const mins = state.totalDurationMin % 60;
  const dur = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;

  return `<div class="history-section">
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-val">${f.length}</div>
        <div class="stat-lbl">飞行数</div>
      </div>
      <div class="stat-item highlight">
        <div class="stat-val">${formatNumber(state.totalMileage)}</div>
        <div class="stat-lbl">里程 (km)</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${dur}</div>
        <div class="stat-lbl">飞行时间</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${state.airports.size}</div>
        <div class="stat-lbl">机场数</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${state.airlines.size}</div>
        <div class="stat-lbl">航司数</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${state.aircraftTypes.size}</div>
        <div class="stat-lbl">机型数</div>
      </div>
    </div>
  </div>`;
}

// ---- Section 2: Flight Count ----
function renderFlightCount(f) {
  const domestic = f.filter(isDomestic);
  const intl = f.filter(fl => !isDomestic(fl));

  const byYear = {};
  const byMonth = {};
  const currentYear = String(new Date().getFullYear());
  f.forEach(fl => {
    if (!fl.date) return;
    const y = fl.date.slice(0, 4);
    byYear[y] = (byYear[y] || 0) + 1;
    if (y === currentYear) {
      const m = fl.date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
  });

  const yearData = Object.entries(byYear).sort().map(([k, v]) => ({ label: k, value: v }));
  const monthData = Object.entries(byMonth).sort().map(([k, v]) => ({ label: k, value: v }));

  let html = '<div class="history-section">';
  html += '<div class="section-title">飞行数</div>';

  html += '<div class="stat-grid col-2" style="margin-bottom:12px">';
  html += `<div class="stat-item"><div class="stat-val">${domestic.length}</div><div class="stat-lbl">国内航班</div></div>`;
  html += `<div class="stat-item"><div class="stat-val">${intl.length}</div><div class="stat-lbl">国际及港澳台</div></div>`;
  html += '</div>';

  if (yearData.length > 0) {
    html += '<div class="line-chart-wrap"><div class="chart-label">年飞行次数</div>';
    html += renderLineChart(yearData, 360, 72, '#4da6ff');
    html += '</div>';
  }
  if (monthData.length > 1) {
    html += '<div class="line-chart-wrap"><div class="chart-label">月飞行次数</div>';
    html += renderLineChart(monthData, 360, 72, '#4da6ff');
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ---- Section 3: Mileage ----
function renderMileage(f) {
  const byYear = {};
  const byMonth = {};
  const currentYear = String(new Date().getFullYear());
  f.forEach(fl => {
    if (!fl.date) return;
    const y = fl.date.slice(0, 4);
    byYear[y] = (byYear[y] || 0) + (fl.distance || 0);
    if (y === currentYear) {
      const m = fl.date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + (fl.distance || 0);
    }
  });

  const yearData = Object.entries(byYear).sort().map(([k, v]) => ({ label: k, value: v }));
  const monthData = Object.entries(byMonth).sort().map(([k, v]) => ({ label: k, value: v }));

  const longest = f.reduce((a, b) => (b.distance || 0) > (a.distance || 0) ? b : a, f[0]);
  const shortest = f.reduce((a, b) => (b.distance || 0) > 0 && (b.distance || 0) < (a.distance || Infinity) ? b : a, f[0]);

  let html = '<div class="history-section">';
  html += '<div class="section-title">飞行里程</div>';

  if (yearData.length > 0) {
    html += '<div class="line-chart-wrap"><div class="chart-label">年里程 (km)</div>';
    html += renderLineChart(yearData, 360, 72, '#4fc3f7');
    html += '</div>';
  }
  if (monthData.length > 1) {
    html += '<div class="line-chart-wrap"><div class="chart-label">月里程 (km)</div>';
    html += renderLineChart(monthData, 360, 72, '#4fc3f7');
    html += '</div>';
  }

  html += '<div style="display:flex;flex-direction:column;gap:6px">';
  html += flightCard(longest, '最长里程');
  html += flightCard(shortest, '最短里程');
  html += '</div>';
  html += '</div>';
  return html;
}

// ---- Section 4: Duration ----
function renderDuration(f) {
  const totalMin = state.totalDurationMin;
  const hours = +(totalMin / 60).toFixed(1);
  const days = +(hours / 24).toFixed(1);
  const weeks = +(days / 7).toFixed(1);
  const months = +(days / 30).toFixed(1);
  const years = +(days / 365).toFixed(2);
  const avg = f.length > 0 ? Math.round(totalMin / f.length) : 0;

  const byYear = {};
  const byMonth = {};
  const currentYear = String(new Date().getFullYear());
  f.forEach(fl => {
    if (!fl.date) return;
    const y = fl.date.slice(0, 4);
    byYear[y] = (byYear[y] || 0) + (fl.durationMin || 0);
    if (y === currentYear) {
      const m = fl.date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + (fl.durationMin || 0);
    }
  });

  const yearData = Object.entries(byYear).sort().map(([k, v]) => ({ label: k, value: v }));
  const monthData = Object.entries(byMonth).sort().map(([k, v]) => ({ label: k, value: v }));

  const longest = f.reduce((a, b) => (b.durationMin || 0) > (a.durationMin || 0) ? b : a, f[0]);
  const shortest = f.reduce((a, b) => (b.durationMin || 0) > 0 && (b.durationMin || 0) < (a.durationMin || Infinity) ? b : a, f[0]);

  let html = '<div class="history-section">';
  html += '<div class="section-title">飞行时间</div>';

  html += '<div class="stat-grid col-2" style="margin-bottom:12px">';
  html += `<div class="stat-item"><div class="stat-val">${days} 天</div><div class="stat-lbl">${weeks} 周 · ${months} 月 · ${years} 年</div></div>`;
  html += `<div class="stat-item highlight"><div class="stat-val">${formatDuration(avg)}</div><div class="stat-lbl">平均时长</div></div>`;
  html += '</div>';

  if (yearData.length > 0) {
    html += '<div class="line-chart-wrap"><div class="chart-label">年飞行时间 (分钟)</div>';
    html += renderLineChart(yearData, 360, 72, '#ffb74d');
    html += '</div>';
  }
  if (monthData.length > 1) {
    html += '<div class="line-chart-wrap"><div class="chart-label">月飞行时间 (分钟)</div>';
    html += renderLineChart(monthData, 360, 72, '#ffb74d');
    html += '</div>';
  }

  html += '<div style="display:flex;flex-direction:column;gap:6px">';
  html += flightCard(longest, '时间最长', true);
  html += flightCard(shortest, '时间最短', true);
  html += '</div>';
  html += '</div>';
  return html;
}

// ---- Section 5: Airports ----
function renderAirports(f) {
  const counts = {};
  f.forEach(fl => {
    if (fl.from) counts[fl.from] = (counts[fl.from] || 0) + 1;
    if (fl.to) counts[fl.to] = (counts[fl.to] || 0) + 1;
  });

  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => {
      const name = (AirportDB[code] && AirportDB[code].name) || code;
      return { label: name, value: count };
    });

  let html = '<div class="history-section">';
  html += '<div class="section-title">机场统计</div>';
  html += renderBarChart(items);
  html += '</div>';
  return html;
}

// ---- Section 6: Airlines ----
function renderAirlines(f) {
  const counts = {};
  f.forEach(fl => {
    const al = fl.airline || '未知';
    counts[al] = (counts[al] || 0) + 1;
  });

  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ label: code, value: count }));

  let html = '<div class="history-section">';
  html += '<div class="section-title">航司统计</div>';
  html += renderAirlineChart(items);
  html += '</div>';
  return html;
}

// ---- Section 7: Countries/Regions ----
function renderCountries(f) {
  const counts = {};
  f.forEach(fl => {
    if (fl.from) { const c = getCountry(fl.from); counts[c] = (counts[c] || 0) + 1; }
    if (fl.to) { const c = getCountry(fl.to); counts[c] = (counts[c] || 0) + 1; }
  });

  const items = Object.entries(counts).map(([name, count]) => ({ label: name, value: count }));
  // 确保中国大陆排在最前
  items.sort((a, b) => {
    if (a.label === '中国大陆') return -1;
    if (b.label === '中国大陆') return 1;
    return b.value - a.value;
  });

  let html = '<div class="history-section">';
  html += '<div class="section-title">到访国家 / 地区</div>';
  html += renderBarChart(items);
  html += '</div>';
  return html;
}

// ---- Section 8: Aircraft ----
function renderAircraft(f) {
  const counts = {};
  f.forEach(fl => {
    const ac = fl.aircraft || '未知';
    counts[ac] = (counts[ac] || 0) + 1;
  });

  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ label: code, value: count }));

  const most = items.length > 0 ? items[0].label : '—';

  let html = '<div class="history-section">';
  html += '<div class="section-title">机型统计</div>';
  html += `<div class="info-row"><span class="info-label">最多乘坐</span><span class="info-value">${most}</span></div>`;
  html += renderBarChart(items);
  html += '</div>';
  return html;
}

// ---- Helpers ----
function flightCard(fl, tag, useDuration) {
  const fromName = (AirportDB[fl.from] && AirportDB[fl.from].name) || fl.from;
  const toName = (AirportDB[fl.to] && AirportDB[fl.to].name) || fl.to;
  const val = useDuration
    ? formatDuration(fl.durationMin || 0)
    : (fl.distance ? fl.distance.toLocaleString() + ' km' : '—');

  return `<div class="flight-mini-card">
    <div class="fmc-route"><span class="fmc-tag">${tag}</span>${fromName} → ${toName}</div>
    <div class="fmc-meta">
      <span>${fl.flightNo}</span>
      <span>${val}</span>
      <span>${fl.date || ''}</span>
    </div>
  </div>`;
}

function renderAirlineChart(items) {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  const colors = ['#4da6ff', '#4fc3f7', '#64b5f6', '#42a5f5', '#90caf9', '#5c6bc0'];
  return '<div class="bar-chart airline-chart">' + items.map((item, i) => {
    const pct = (item.value / maxVal * 100).toFixed(0);
    const color = colors[i % colors.length];
    const code = item.label;
    const logo = (code && code !== '未知')
      ? `<img class="airline-logo" src="https://content.r9cdn.net/rimg/provider-logos/airlines/v/${code}.png" alt="${code}" loading="lazy" onerror="this.remove()">`
      : '';
    return `<div class="bar-row">
      ${logo}
      <span class="bar-name" title="${code}">${code}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${color}88,${color})"></div>
      </div>
      <span class="bar-count">${item.value}</span>
    </div>`;
  }).join('') + '</div>';
}

function renderBarChart(items) {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  const colors = ['#4da6ff', '#4fc3f7', '#64b5f6', '#42a5f5', '#90caf9', '#5c6bc0'];
  return '<div class="bar-chart">' + items.map((item, i) => {
    const pct = (item.value / maxVal * 100).toFixed(0);
    const color = colors[i % colors.length];
    return `<div class="bar-row">
      <span class="bar-name" title="${item.label}">${item.label}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${color}88,${color})"></div>
      </div>
      <span class="bar-count">${item.value}</span>
    </div>`;
  }).join('') + '</div>';
}

function renderLineChart(data, width, height, color) {
  if (data.length === 0) return '';
  const id = 'lc' + (lineChartId++);
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const pad = { t: 8, r: 16, b: 18, l: 16 };
  const cw = width - pad.l - pad.r;
  const ch = height - pad.t - pad.b;

  let pts = '';
  data.forEach((d, i) => {
    const x = pad.l + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw);
    const y = pad.t + ch - (d.value / maxVal) * ch;
    pts += `${x.toFixed(1)},${y.toFixed(1)} `;
  });

  let areaPts = pts;
  areaPts += `${pad.l + cw},${pad.t + ch} ${pad.l},${pad.t + ch}`;

  let labels = '';
  const step = data.length > 8 ? Math.ceil(data.length / 6) : 1;
  data.forEach((d, i) => {
    if (i % step !== 0 && i !== data.length - 1) return;
    const x = pad.l + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw);
    const anchor = i === 0 ? 'start' : (i === data.length - 1 ? 'end' : 'middle');
    labels += `<text x="${x.toFixed(1)}" y="${height - 3}" text-anchor="${anchor}" fill="#556677" font-size="9">${d.label}</text>`;
  });

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;width:100%;height:auto">
    <defs>
      <linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${areaPts}" fill="url(#${id}-g)"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${data.length <= 12 ? data.map((d, i) => {
      const x = pad.l + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw);
      const y = pad.t + ch - (d.value / maxVal) * ch;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${color}"/>`;
    }).join('') : ''}
    ${labels}
  </svg>`;
}

// ---- Utility ----
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + 'm';
  if (m === 0) return h + 'h';
  return h + 'h ' + m + 'm';
}

// ==================== Distance Calculation ====================
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ==================== 自然语言航班解析 ====================
// 机场别名（将中文名称/城市/机场简称映射到三字码）
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

// 同一城市存在多个机场的映射（用户只输入城市名时需要追问具体机场）
const CityAirports = {
  '北京': ['PEK', 'PKX'],
  '上海': ['SHA', 'PVG'],
  '成都': ['CTU', 'TFU'],
  '东京': ['NRT', 'HND'],
};

// 别名 -> 三字码（同一城市多个机场时取首个作为默认，如「北京」默认首都机场）
const AirportAliasIndex = buildAirportAliasIndex();

function buildAirportAliasIndex() {
  const index = {};
  const add = (code, alias) => {
    const key = alias.trim();
    if (key && !index[key]) index[key] = code;
  };
  for (const [code, info] of Object.entries(AirportDB)) {
    add(code, code);
    add(code, info.name);
    (AirportAliases[code] || []).forEach(a => add(code, a));
  }
  return index;
}

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
  // 三字码大小写不敏感兜底
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

// 判断某个机场提及的语义角色：「出发」还是「到达」
// 返回 'from' | 'to' | null（无方位词）
// 优先使用语义角色小模型；模型未就绪或低置信度时回退关键词规则。
function routeRole(text, pos, end) {
  // 用 '@' 占位机场提及本身，拼接「提及前 + @ + 提及后」的完整上下文，
  // 让模型能同时看到方位词在提及的前后位置，从而理解真实语义（上下文感知）。
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

  // 提及之前的方位词：从/由 → 出发；到/飞往/… → 到达
  for (const m of ['从', '由']) { const i = before.lastIndexOf(m); if (i > fromIdx) fromIdx = i; }
  const TO_MULTI = ['飞往', '前往', '去往', '到达', '飞向', '抵达'];
  const TO_SINGLE = ['到', '至', '抵'];
  for (const m of TO_MULTI) { const i = before.lastIndexOf(m); if (i > toIdx) toIdx = i; }
  for (const m of TO_SINGLE) { const i = before.lastIndexOf(m); if (i > toIdx) toIdx = i; }
  // 单字「去」「飞」需排除「去年」「飞机」等误配
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

  // 提及之前没有方位词时，再看紧跟提及之后：
  // 「@到/@至/@飞往/@出发…」表示该提及是出发地；「@到达/@抵达」表示到达地
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
  const result = {
    from: null, to: null,
    fromCandidates: null, toCandidates: null,
    fromAlias: null, toAlias: null,
  };
  if (mentions.length === 0) return result;

  const roles = mentions.map(m => routeRole(text, m.pos, m.pos + m.alias.length));
  const used = new Set();
  let fromM = null, toM = null;

  // 优先使用带明确方位词的提及
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'from' && fromM == null) { fromM = i; used.add(i); }
  }
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'to' && toM == null) { toM = i; used.add(i); }
  }
  // 无方位词时按出现顺序补位：首个为出发、下一个为到达
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
    flightNo: null, airline: null,
    from: null, to: null, date: null,
    aircraft: null, durationMin: null,
    fromCandidates: null, toCandidates: null,
    fromAlias: null, toAlias: null,
  };
  info.date = extractDate(text);
  info.flightNo = extractFlightNo(text);
  if (info.flightNo) {
    info.airline = airlineCodeFromFlightNo(info.flightNo);
  }
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

function airportLabel(code) {
  if (!code) return '?';
  return escapeHtml(airportName(code)) + ' (' + escapeHtml(code) + ')';
}

// ==================== Persistence ====================
const API_BASE = '/api';

function normalizeFlight(f) {
  if (!f.airline && f.flightNo) {
    f.airline = airlineCodeFromFlightNo(f.flightNo);
  }
  return f;
}

// 新增一条航班记录到 SQLite（通过后端 API）
async function saveFlight(flight) {
  const res = await fetch(`${API_BASE}/flights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flight),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

// 从 SQLite 加载全部航班记录
async function loadFlights() {
  const res = await fetch(`${API_BASE}/flights`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  state.flights = (await res.json()).map(normalizeFlight);
}

// 修改一条航班记录（仅更新提供的字段）
async function updateFlight(id, patch) {
  const res = await fetch(`${API_BASE}/flights/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

// 删除一条航班记录
async function deleteFlight(id) {
  const res = await fetch(`${API_BASE}/flights/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

// ==================== Assistant Dialog ====================
const ASSISTANT_BOT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';

function openAssistantDialog() {
  resetAssistantCtx();
  // 切换到助手视图：面板内容淡入淡出切换，隐藏地球上的航班记录
  const appContainer = document.querySelector('.app-container');
  appContainer.classList.add('assistant-mode');
  EarthGlobe.hideRoutes();
  EarthGlobe.setFullBright(true);
  EarthGlobe.setAssistantZoom(true);

  const messages = document.getElementById('assistant-messages');
  if (messages.children.length === 0) {
    addAssistantMessage('assistant', '你好，我是 iFly 助手。我可以帮你添加、修改、删除航班，或查询已有记录。例如：<br><code>记录 5月1日 CA123 北京到上海 A321 2小时45分</code><br><code>把 CA123 改成 A350</code> · <code>删除 CA123</code> · <code>查一下我的航班</code>');
  }

  const input = document.getElementById('assistant-input');
  input.focus({ preventScroll: true });
}

function closeAssistantDialog() {
  // 返回飞行历史视图：面板内容淡入淡出切换，恢复地球上的航班记录
  const appContainer = document.querySelector('.app-container');
  appContainer.classList.remove('assistant-mode');
  EarthGlobe.clearPreviewRoute(false); // 关闭助手时清理可能残留的航线预览
  EarthGlobe.showRoutes();
  EarthGlobe.setFullBright(fullBright);
  EarthGlobe.setAssistantZoom(false);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function addAssistantMessage(role, html) {
  const messages = document.getElementById('assistant-messages');
  const msg = document.createElement('div');
  msg.className = 'assistant-msg' + (role === 'user' ? ' user' : '');

  const avatar = document.createElement('div');
  avatar.className = 'assistant-msg-avatar';
  if (role === 'user') {
    avatar.textContent = '我';
  } else {
    avatar.innerHTML = ASSISTANT_BOT_ICON;
  }

  const bubble = document.createElement('div');
  bubble.className = 'assistant-msg-bubble';
  bubble.innerHTML = html;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
  return msg;
}

function showAssistantTyping() {
  const messages = document.getElementById('assistant-messages');
  const typing = document.createElement('div');
  typing.className = 'assistant-msg';
  typing.id = 'assistant-typing';

  const avatar = document.createElement('div');
  avatar.className = 'assistant-msg-avatar';
  avatar.innerHTML = ASSISTANT_BOT_ICON;

  const bubble = document.createElement('div');
  bubble.className = 'assistant-msg-bubble';
  bubble.innerHTML = '<div class="assistant-typing"><span></span><span></span><span></span></div>';

  typing.appendChild(avatar);
  typing.appendChild(bubble);
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
}

function hideAssistantTyping() {
  const typing = document.getElementById('assistant-typing');
  if (typing) typing.remove();
}

// ==================== 助手轻量对话模型 ====================
// 会话上下文：记录当前意图、所处阶段与已收集的信息
const assistantCtx = {
  intent: null,        // 'add' | 'modify' | 'delete'
  phase: 'idle',       // 'idle' | 'collect' | 'confirm'
  data: {},            // 已收集的航班字段 / 待修改字段
  target: null,        // 匹配到的航班记录（修改/删除）
  candidates: [],      // 多条候选记录
  pendingChanges: null,
  selecting: false,
  currentQuestion: null,
  pendingAmbiguity: [], // 待追问的机场歧义 [{ field: 'from'|'to', alias, candidates }]
};

function resetAssistantCtx() {
  assistantCtx.intent = null;
  assistantCtx.phase = 'idle';
  assistantCtx.data = {};
  assistantCtx.target = null;
  assistantCtx.candidates = [];
  assistantCtx.pendingChanges = null;
  assistantCtx.selecting = false;
  assistantCtx.currentQuestion = null;
  assistantCtx.pendingAmbiguity = [];
}

const ADD_REQUIRED = ['flightNo', 'from', 'to', 'date'];

// 确认/否定识别（规则兜底版本，用于模型未加载或低置信度时）
function parseYesNoKeyword(text) {
  const t = text.replace(/[，。！？!?\s]/g, '');
  if (/^(是|对|好|好的|可以|行|嗯|没错|是的|确定|确认|同意|ok|yes|y)/i.test(t)) return 'yes';
  if (/^(否|不|不用|不要|别|算了|取消|不是|不对|错误|no|n)/i.test(t)) return 'no';
  return null;
}

// 确认/否定识别：优先使用小模型，低置信度时回退规则
function parseYesNo(text) {
  if (IntentClassifier.isReady()) {
    const m = IntentClassifier.classifyYesNo(text);
    if (m && m.confidence >= (IntentClassifier.threshold || 0.5)) return m.label;
  }
  return parseYesNoKeyword(text);
}

// 动作动词表：按意图分组，扫描时按「最长匹配优先」，避免「改」误配「改签」等
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
// 干扰词：形似动词但并非航班操作，需跳过
for (const w of ['改天', '记得', '记住', '记性', '检查', '调查', '查证']) {
  VERB_LIST.push({ intent: 'noise', verb: w });
}
VERB_LIST.sort((a, b) => b.verb.length - a.verb.length);

// 判断动词位置是否被否定（如「不要删除」「别把CA123删了」）
function isNegatedAt(text, pos) {
  const pre = text.slice(Math.max(0, pos - 6), pos);
  if (/(不如|要不|要么|无非)[^，。；！？\s]*$/.test(pre)) return false; // 建议语气，非否定
  return /(不要|不用|别|不|没|未|莫|勿|别把|不需|不必|不想|别要)[^，。；！？\s]*$/.test(pre);
}

// 逐字扫描输入，识别动作动词及其否定情况
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
        // 「记录」可能是名词（如「航班记录」「我的记录」），此时不作为动词
        const before = text.slice(Math.max(0, i - 2), i);
        const isNounRecord = (hit.verb === '记录') && (before === '航班' || before === '飞行' || text[i - 1] === '的');
        if (!isNounRecord) {
          found.push({ intent: hit.intent, verb: hit.verb, pos: i, negated: isNegatedAt(text, i) });
        }
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

function detectIntentKeyword(text) {
  const t = text.trim();
  if (isGreeting(t)) return 'greet';

  const verbs = scanVerbs(t);
  const question = isQuestion(t);

  // 出现未否定的「暂不支持」动作时最优先
  const unsup = verbs.find(v => v.intent === 'unsupported' && !v.negated);
  if (unsup) return 'unsupported';

  if (question) {
    // 列举/存在类问句 → 查询（如「我的航班记录有哪些」「有没有CA123」）
    if (/(有哪些|有没有|多少条|几条|哪些|几个|有什么|所有航班|全部航班)/.test(t)) return 'query';
    // 疑问语气下的增删改仍是操作请求，如「删除CA123吗」
    const action = verbs.find(v => (v.intent === 'delete' || v.intent === 'modify' || v.intent === 'add') && !v.negated);
    if (action) return action.intent;
    // 时间/价格/原因类问题暂无数据可答
    if (/(几点|几时|什么时候|何时|多少钱|价格|票价|多久|多长时间|延误|晚点|天气|怎么|为什么)/.test(t)) return 'unsupported';
    const q = verbs.find(v => v.intent === 'query' && !v.negated);
    if (q) return 'query';
    // 询问是否存在某航班（如「有没有CA123」）
    if (/[A-Za-z]{2}\s?\d|\d\s?[A-Za-z]|到|从|去|飞|航班/.test(t)) return 'query';
    return 'unsupported';
  }

  const main = verbs.find(v => v.intent !== 'unsupported' && !v.negated);
  if (main) return main.intent;

  // 动作都被否定（如「不要删除」）→ 不执行
  if (verbs.some(v => v.negated)) return 'negated';

  return null;
}

// 意图识别：优先使用小模型，低置信度时回退到关键词/正则规则
function detectIntent(text) {
  if (IntentClassifier.isReady()) {
    const m = IntentClassifier.classifyIntent(text);
    if (m && m.confidence >= IntentClassifier.threshold) {
      return m.label === 'none' ? null : m.label;
    }
  }
  return detectIntentKeyword(text);
}

function isGreeting(text) {
  const t = text.replace(/[，。！？!?、\s]/g, '');
  return /^(你好|您好|你好呀|您好呀|hi|hello|hey|嗨|哈喽|在吗|在不在|早上好|上午好|中午好|下午好|晚上好|早安|午安|晚安)$/i.test(t);
}

function pickFields(info) {
  return {
    flightNo: info.flightNo,
    airline: info.airline,
    from: info.from,
    to: info.to,
    date: info.date,
    aircraft: info.aircraft,
    durationMin: info.durationMin,
  };
}

function collectMissing(data) {
  return ADD_REQUIRED.filter(k => !data[k]);
}

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

// ---- 机场歧义处理：城市有多个机场时追问具体机场 ----
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
    const aliases = (AirportAliases[c] || []).filter(a => !CityAirports[a]);
    if (aliases.some(a => t.includes(a))) return c;
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
  // 信息解析完整、等待确认：在地球上平滑显示并拉近镜头展示整条航线
  if (d.from && d.to) EarthGlobe.previewRoute(d.from, d.to);
  return '已为您整理航班信息：<br>' + rows.join('<br>') + '<br><br>确认添加吗？（回复「是」确认，「否」取消）';
}

function buildCandidateList(list) {
  return '找到 ' + list.length + ' 条匹配记录：<br>' +
    list.map((f, i) => `${i + 1}. ${escapeHtml(flightSummary(f))}`).join('<br>');
}

function filterFlights(list, key) {
  return list.filter(f => {
    if (key.flightNo && (f.flightNo || '').toUpperCase() !== key.flightNo) return false;
    if (key.from && f.from !== key.from) return false;
    if (key.to && f.to !== key.to) return false;
    if (key.date && f.date !== key.date) return false;
    return true;
  });
}

function matchFlightsByKey(key) {
  return filterFlights(state.flights, key);
}

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
    ['date', '日期', f => f.date || '—'],
    ['aircraft', '机型', f => f.aircraft || '—'],
    ['durationMin', '时长', f => (f.durationMin != null ? formatDuration(f.durationMin) : '—')],
    ['from', '出发', f => airportName(f.from)],
    ['to', '到达', f => airportName(f.to)],
  ];
  const diffs = [];
  for (const [key, label, get] of fields) {
    if (!(key in changes)) continue;
    const oldVal = get(t);
    const newVal = key === 'durationMin' ? formatDuration(changes[key])
      : (key === 'from' || key === 'to') ? airportName(changes[key]) : changes[key];
    diffs.push(`${label}：${escapeHtml(oldVal)} → <strong>${escapeHtml(newVal)}</strong>`);
  }
  if (diffs.length === 0) {
    return '请说明要修改的内容。';
  }
  return '确认修改「' + escapeHtml(flightSummary(t)) + '」：<br>' +
    diffs.join('<br>') + '<br><br>确认修改吗？（回复「是」确认，「否」取消）';
}

function buildDeleteConfirm(ctx) {
  return '确认删除以下航班吗？<br>' + flightSummaryDetailed(ctx.target) +
    '<br><br>确认删除吗？（回复「是」确认，「否」取消）';
}

// ---- 助手对话主入口 ----
async function getAssistantReply(text) {
  const t = text.trim();
  const ctx = assistantCtx;

  if (ctx.phase === 'confirm') {
    // 添加流程确认阶段：优先识别「修正」类输入（含航班信息），
    // 避免「日期改成5月2日」等被是/否分类器误判为「是」。
    if (ctx.intent === 'add') {
      const info = extractFlightInfo(t);
      if (info.flightNo || info.from || info.to || info.date || info.aircraft || info.durationMin != null || info.fromCandidates || info.toCandidates) {
        EarthGlobe.clearPreviewRoute(true); // 信息有变动，先清除旧预览
        return handleAddConfirmCorrection(ctx, info);
      }
    }
    const ans = parseYesNo(t);
    if (ans === 'yes') {
      const msg = await executeConfirmed(ctx);
      resetAssistantCtx();
      EarthGlobe.clearPreviewRoute(false); // 确认成功：仅移除预览，保留聚焦后的镜头
      return msg;
    }
    if (ans === 'no') {
      resetAssistantCtx();
      EarthGlobe.clearPreviewRoute(true); // 取消：移除预览并平滑还原镜头
      return '好的，已取消，未做任何改动。还有什么可以帮您的吗？';
    }
    resetAssistantCtx(); // 未回答是/否，视为新指令
    EarthGlobe.clearPreviewRoute(true);
  }

  // 任意收集阶段都允许用户取消当前操作
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
  if (!intent && !hasInfo) {
    return notUnderstandReply();
  }

  const action = intent || 'add';
  if (action === 'add') return startAdd(ctx, info);
  if (action === 'delete') return startDelete(ctx, info);
  return startModify(ctx, info);
}

function greetReply() {
  return '你好！我是 iFly 航班记录助手，可以帮你：<br>'
    + '· 添加航班：<code>记录 5月1日 CA123 北京到上海 A321 2小时45分</code><br>'
    + '· 修改航班：<code>把 CA123 的机型改成 A350</code><br>'
    + '· 删除航班：<code>删除 CA123</code><br>'
    + '· 查询航班：<code>查一下我的航班</code><br>'
    + '直接告诉我想做什么吧。';
}

function unsupportedReply() {
  return '抱歉，这个功能我暂时还不支持。目前我可以帮你：添加、修改、删除航班，以及查询已有航班记录。你可以先试试这些。';
}

function notUnderstandReply() {
  return '抱歉，我没太听懂你的意思，这类请求我暂时还不支持。<br>'
    + '目前我可以帮你：添加、修改、删除航班，以及查询已有航班记录。例如：<br>'
    + '<code>记录 5月1日 CA123 北京到上海</code> · <code>把 CA123 改成 A350</code> · '
    + '<code>删除 CA123</code> · <code>查一下我的航班</code>';
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
  const header = hasKey
    ? '为你找到 ' + matches.length + ' 条匹配记录：<br>'
    : '当前共有 ' + matches.length + ' 条航班记录：<br>';
  return header + matches.map((f, i) => `${i + 1}. ${escapeHtml(flightQueryLine(f))}`).join('<br>');
}

function flightQueryLine(f) {
  let s = flightSummary(f);
  if (f.aircraft) s += ' · ' + f.aircraft;
  if (f.durationMin) s += ' · ' + formatDuration(f.durationMin);
  return s;
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

  // 用户提供航班号/日期进一步缩小范围
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

// 删除流程：定位目标 -> 确认
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

// 修改流程：先定位目标，再收集要修改的字段，最后确认
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

// 新增流程：逐个补齐缺失字段
function handleCollectAdd(ctx, info) {
  const amb = detectAmbiguity(info);
  if (amb.length) {
    mergeResolvedFields(ctx, info, amb.map(a => a.field));
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

// 处理机场歧义回复：把选中的机场写入已收集数据，继续追问下一个歧义或进入下一阶段
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
    flightNo: d.flightNo,
    airline: d.airline || null,
    from: d.from,
    to: d.to,
    fromName: airportName(d.from),
    toName: airportName(d.to),
    date: d.date,
    aircraft: d.aircraft || null,
    durationMin: d.durationMin != null ? d.durationMin : (d.from && d.to ? Math.round(distance / 800 * 60) : 0),
    distance,
  };
  await saveFlight(flight);
  await loadFlights();
  updateHistory();
  EarthGlobe.refreshRoutes();
  if (d.from && d.to) EarthGlobe.focusOnRoute(d.from, d.to);
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
  await loadFlights();
  updateHistory();
  EarthGlobe.refreshRoutes();
  if (patch.from || patch.to) EarthGlobe.focusOnRoute(from, to);
  return '已更新航班记录。';
}

async function doDelete(ctx) {
  await deleteFlight(ctx.target.id);
  await loadFlights();
  updateHistory();
  EarthGlobe.refreshRoutes();
  return '已删除航班记录。';
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

async function sendAssistantMessage() {
  const input = document.getElementById('assistant-input');
  const sendBtn = document.getElementById('assistant-send-btn');
  const text = input.value.trim();
  if (!text) return;

  addAssistantMessage('user', escapeHtml(text));
  input.value = '';
  autoResizeTextarea(input);
  sendBtn.disabled = true;

  showAssistantTyping();
  let reply;
  try {
    reply = await getAssistantReply(text);
  } catch (err) {
    reply = '出错了：' + escapeHtml(err.message || err);
  }
  hideAssistantTyping();
  addAssistantMessage('assistant', reply);
  sendBtn.disabled = false;
  input.focus();
}

// ==================== Init ====================
async function init() {
  // 后台加载意图识别小模型（加载完成前自动回退关键词规则）
  IntentClassifier.load();

  EarthGlobe.init('#globe-container', {
    airportDB: AirportDB,
    getAirportPairs,
  });
  EarthGlobe.setPanelWidth(540);

  // 尽早接管面板状态：刷新前收起则直接保持收起，无过渡动画
  const savedState = loadUIState();
  const appContainer = document.querySelector('.app-container');
  if (savedState.collapsed) {
    document.documentElement.classList.remove('pre-collapsed');
    appContainer.classList.add('collapsed');
    EarthGlobe.setPanelWidth(0);
  }

  await loadFlights();
  updateHistory();
  EarthGlobe.refreshRoutes();

  // 页面初始视图中心为北京
  EarthGlobe.lookAtLatLon(40.08, 116.58);

  const assistantBtn = document.getElementById('assistant-btn');
  assistantBtn.addEventListener('click', openAssistantDialog);

  // 助手视图：返回按钮
  const assistantBack = document.getElementById('assistant-back');
  assistantBack.addEventListener('click', closeAssistantDialog);

  const assistantSend = document.getElementById('assistant-send-btn');
  assistantSend.addEventListener('click', sendAssistantMessage);

  const assistantInput = document.getElementById('assistant-input');
  assistantInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAssistantMessage();
    }
  });
  assistantInput.addEventListener('input', () => autoResizeTextarea(assistantInput));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('.app-container').classList.contains('assistant-mode')) {
      closeAssistantDialog();
    }
  });

  const toggleBtn = document.getElementById('panel-toggle');

  toggleBtn.addEventListener('click', () => {
    const collapsed = appContainer.classList.toggle('collapsed');
    EarthGlobe.setPanelWidth(collapsed ? 0 : 540);
    saveUIState({ collapsed });
  });

  const daynightBtn = document.getElementById('daynight-toggle');
  fullBright = !!savedState.fullBright;
  if (fullBright) {
    EarthGlobe.setFullBright(true, true);
    daynightBtn.classList.add('active');
    daynightBtn.title = '真实光照';
  }
  daynightBtn.addEventListener('click', () => {
    fullBright = !fullBright;
    EarthGlobe.setFullBright(fullBright);
    daynightBtn.classList.toggle('active', fullBright);
    daynightBtn.title = fullBright ? '真实光照' : '全亮模式';
    saveUIState({ fullBright });
  });

  const rotateBtn = document.getElementById('rotate-toggle');
  let autoRotate = !!savedState.autoRotate;
  if (autoRotate) {
    EarthGlobe.setAutoRotate(true);
    rotateBtn.classList.add('active');
    rotateBtn.title = '停止转动';
  }
  rotateBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    EarthGlobe.setAutoRotate(autoRotate);
    rotateBtn.classList.toggle('active', autoRotate);
    rotateBtn.title = autoRotate ? '停止转动' : '自动转动';
    saveUIState({ autoRotate });
  });
}

document.addEventListener('DOMContentLoaded', init);