// iFly - Main Application
import { EarthGlobe } from './earth.js';

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
  html += renderBarChart(items);
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
    <div class="fmc-route"><span style="color:var(--text-dim);font-size:10px;margin-right:4px">${tag}</span>${fromName} → ${toName}</div>
    <div class="fmc-meta">
      <span>${fl.flightNo}</span>
      <span>${val}</span>
      <span>${fl.date || ''}</span>
    </div>
  </div>`;
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

// ==================== Chat Parser ====================
function parseFlightInput(input) {
  const text = input.trim();
  const patterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日\s*([A-Z]{2}\d{2,4}[A-Z]?)\s*(\S+?)[-\s至到]\s*(\S+?)\s*([A-Z0-9]{3,4}(?:-\d{3,4})?)\s*(\d+)h(\d+)?m?/i,
    /(\d{4})-(\d{1,2})-(\d{1,2})\s*([A-Z]{2}\d{2,4}[A-Z]?)\s*([A-Z]{3})\s*-\s*([A-Z]{3})\s*([A-Z0-9]{3,4}(?:-\d{3,4})?)\s*(\d+)h(\d+)?m?/i,
    /([A-Z]{2}\d{2,4}[A-Z]?)\s*(\S+?)[-\s至到]\s*(\S+?)\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*(?:([A-Z0-9]{3,4}(?:-\d{3,4})?)\s*)?(\d+)?h?(\d+)?m?/i,
    /([A-Z]{2}\d{2,4}[A-Z]?)\s*([A-Z]{3})\s*-\s*([A-Z]{3})\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*(?:([A-Z0-9]{3,4}(?:-\d{3,4})?)\s*)?(\d+)?h?(\d+)?m?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let flightNo, from, to, year, month, day, aircraft, hours, minutes;

      if (pattern === patterns[0]) {
        [, year, month, day, flightNo, from, to, aircraft, hours, minutes] = match;
      } else if (pattern === patterns[1]) {
        [, year, month, day, flightNo, from, to, aircraft, hours, minutes] = match;
      } else if (pattern === patterns[2]) {
        [, flightNo, from, to, year, month, day, aircraft, hours, minutes] = match;
      } else {
        [, flightNo, from, to, year, month, day, aircraft, hours, minutes] = match;
      }

      const fromCode = resolveAirportCode(from || '');
      const toCode = resolveAirportCode(to || '');
      const fromName = (AirportDB[fromCode] && AirportDB[fromCode].name) || from;
      const toName = (AirportDB[toCode] && AirportDB[toCode].name) || to;

      const distance = (fromCode && toCode)
        ? haversineDistance(
            AirportDB[fromCode].lat, AirportDB[fromCode].lon,
            AirportDB[toCode].lat, AirportDB[toCode].lon
          )
        : 0;

      const durationMin = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
      const airlineCode = (flightNo.match(/^[A-Za-z]+/) || [''])[0].toUpperCase();

      return {
        flightNo: flightNo.toUpperCase(),
        airline: airlineCode || null,
        from: fromCode,
        to: toCode,
        fromName,
        toName,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        aircraft: aircraft || null,
        durationMin: durationMin || Math.round(distance / 800 * 60),
        distance,
      };
    }
  }
  return null;
}

function resolveAirportCode(input) {
  const upper = input.toUpperCase();
  if (AirportDB[upper]) return upper;
  for (const [code, info] of Object.entries(AirportDB)) {
    if (info.name.includes(input)) return code;
  }
  return upper.length === 3 ? upper : null;
}

// ==================== Persistence ====================
const API_BASE = '/api';

function normalizeFlight(f) {
  if (!f.airline && f.flightNo) {
    f.airline = (f.flightNo.match(/^[A-Za-z]+/) || [''])[0].toUpperCase() || null;
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

// ==================== Init ====================
async function init() {
  EarthGlobe.init('#globe-container', {
    airportDB: AirportDB,
    getAirportPairs,
  });
  EarthGlobe.setPanelWidth(540);

  await loadFlights();
  updateHistory();
  EarthGlobe.refreshRoutes();

  // 页面初始视图中心为北京
  EarthGlobe.lookAtLatLon(40.08, 116.58);

  const addFlightBtn = document.getElementById('add-flight-btn');
  addFlightBtn.addEventListener('click', () => {
    // 对话框面板稍后添加
    console.log('记录航班 — 对话框功能即将上线');
  });

  const toggleBtn = document.getElementById('panel-toggle');
  const appContainer = document.querySelector('.app-container');

  toggleBtn.addEventListener('click', () => {
    const collapsed = appContainer.classList.toggle('collapsed');
    EarthGlobe.setPanelWidth(collapsed ? 0 : 540);
  });

  const daynightBtn = document.getElementById('daynight-toggle');
  let fullBright = false;
  daynightBtn.addEventListener('click', () => {
    fullBright = !fullBright;
    EarthGlobe.setFullBright(fullBright);
    daynightBtn.classList.toggle('active', fullBright);
    daynightBtn.title = fullBright ? '真实光照' : '全亮模式';
  });

  const rotateBtn = document.getElementById('rotate-toggle');
  let autoRotate = false;
  rotateBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    EarthGlobe.setAutoRotate(autoRotate);
    rotateBtn.classList.toggle('active', autoRotate);
    rotateBtn.title = autoRotate ? '停止转动' : '自动转动';
  });
}

document.addEventListener('DOMContentLoaded', init);