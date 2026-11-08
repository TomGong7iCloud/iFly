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
  CTU: { name: '成都天府', lat: 30.32, lon: 104.44 },
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

// ==================== Statistics ====================
function updateStats() {
  state.totalMileage = 0;
  state.totalDurationMin = 0;
  state.airports.clear();
  state.airlines.clear();
  state.aircraftTypes.clear();

  state.flights.forEach(f => {
    state.totalMileage += f.distance || 0;
    state.totalDurationMin += f.durationMin || 0;
    if (f.from) state.airports.add(f.from);
    if (f.to) state.airports.add(f.to);
    if (f.airline) state.airlines.add(f.airline);
    if (f.aircraft) state.aircraftTypes.add(f.aircraft);
  });

  animateNumber('stat-flights', state.flights.length);
  animateNumber('stat-mileage', formatNumber(state.totalMileage));
  document.getElementById('stat-duration').textContent = formatDuration(state.totalDurationMin);
  animateNumber('stat-airports', state.airports.size);
  animateNumber('stat-airlines', state.airlines.size);
  animateNumber('stat-aircraft', state.aircraftTypes.size);
}

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

function animateNumber(id, value) {
  const el = document.getElementById(id);
  el.textContent = value;
  el.style.transform = 'scale(1.15)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
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

// ==================== Chat Interface ====================
function addChatMessage(type, content, flightData) {
  const container = document.getElementById('chat-messages');
  const welcomeEl = container.querySelector('.chat-welcome');
  if (welcomeEl) welcomeEl.remove();

  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${type}`;

  if (flightData && type === 'system') {
    const detailEl = document.createElement('div');
    detailEl.className = 'flight-detail';
    detailEl.textContent = `${flightData.flightNo}  ${flightData.fromName} → ${flightData.toName}`;
    msgEl.appendChild(detailEl);

    const meta = [];
    meta.push(flightData.date);
    if (flightData.aircraft) meta.push(flightData.aircraft);
    meta.push(formatDuration(flightData.durationMin));
    meta.push(flightData.distance.toLocaleString() + ' km');

    const metaEl = document.createElement('div');
    metaEl.className = 'flight-meta';
    metaEl.textContent = meta.join(' · ');
    msgEl.appendChild(metaEl);
  } else {
    msgEl.textContent = content;
  }

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function handleSendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  addChatMessage('user', text);
  input.value = '';
  input.focus();

  const flightData = parseFlightInput(text);

  if (flightData && flightData.from && flightData.to) {
    state.flights.push(flightData);
    saveFlights();
    updateStats();
    EarthGlobe.refreshRoutes();
    addChatMessage('system', null, flightData);
  } else {
    const helpMsg = '没能解析到航班信息，请参考格式：\n2024年3月15日 CA1234 北京-上海 B738 2h30m\n或：2024-03-15 CA1234 PEK-SHA B738 2h30m';
    addChatMessage('system', helpMsg);
  }
}

// ==================== Persistence ====================
const STORAGE_KEY = 'ifly_flights';

function saveFlights() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.flights));
  } catch (e) {
    // localStorage full or unavailable
  }
}

function loadFlights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state.flights = JSON.parse(raw);
      state.flights.forEach(f => {
        if (!f.airline && f.flightNo) {
          f.airline = (f.flightNo.match(/^[A-Za-z]+/) || [''])[0].toUpperCase() || null;
        }
      });
    }
  } catch (e) {
    // corrupted data, start fresh
  }
}

// ==================== Init ====================
function init() {
  EarthGlobe.init('#globe-container', {
    airportDB: AirportDB,
    getAirportPairs,
  });
  EarthGlobe.setPanelWidth(436);

  loadFlights();
  updateStats();
  EarthGlobe.refreshRoutes();

  const pairs = state.flights.map(f => ({ from: f.from, to: f.to })).filter(p => p.from && p.to);
  EarthGlobe.focusOnFlights(pairs);

  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  const toggleBtn = document.getElementById('panel-toggle');
  const appContainer = document.querySelector('.app-container');

  toggleBtn.addEventListener('click', () => {
    const collapsed = appContainer.classList.toggle('collapsed');
    EarthGlobe.setPanelWidth(collapsed ? 0 : 436);
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