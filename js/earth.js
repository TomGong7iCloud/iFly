/* ============================================================
   iFly · earth.js — 3D 地球可视化 (Three.js ES Module)
   基于旧版 iFly Legacy 地球代码，适配新项目布局
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const EarthGlobe = (() => {
  let scene, camera, renderer, labelRenderer, controls;
  let earthMesh, glowMesh;
  let earthMap, phongMat, basicMat;
  let _directionalLight;
  let _cameraPivot;
  let _markersGroup;
  let airportMarkers = [];
  let flightArcs = [];
  let _airportDB = {};
  let _getPairs = () => [];
  let _containerSel = '';

  let _resizeObserver = null;
  let _needsResize = false;

  let _targetPanelAngle = 0;
  let _currentPanelAngle = 0;
  let _targetOffset = 0;
  let _currentOffset = 0;
  let _panelWidth = 0;
  const LERP_FACTOR = 0.12;

  let _earthReady = false;
  let _earthScaleTarget = 0.01;

  const _textureLoader = new THREE.TextureLoader();
  const _preloadedTexture = _textureLoader.load(
    'assets/earth-blue-marble.jpg'
  );

  function init(containerSelector, options = {}) {
    _airportDB = options.airportDB || {};
    _getPairs = options.getAirportPairs || (() => []);
    _containerSel = containerSelector;

    const container = document.querySelector(containerSelector);
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 100);
    camera.position.set(0, 1.2, 4.8);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x0a0e17);
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.2;
    controls.maxDistance = 9;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.25;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x8899bb, 0.8);
    scene.add(ambient);
    _directionalLight = new THREE.DirectionalLight(0xffffff, 3.5);
    _directionalLight.position.set(5, 3, 7);
    scene.add(_directionalLight);

    createEarth();
    scene.add(earthMesh);
    scene.add(glowMesh);
    createStars();

    _cameraPivot = new THREE.Group();
    scene.add(_cameraPivot);
    _cameraPivot.add(camera);

    _markersGroup = new THREE.Group();
    _markersGroup.scale.set(0.01, 0.01, 0.01);
    scene.add(_markersGroup);

    _resizeObserver = new ResizeObserver(() => { _needsResize = true; });
    _resizeObserver.observe(container);

    animate();
  }

  function createEarth() {
    const geom = new THREE.SphereGeometry(1.28, 128, 86);
    earthMap = _preloadedTexture;
    _preloadedTexture.anisotropy = 16;
    _preloadedTexture.magFilter = THREE.LinearFilter;
    _preloadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
    _preloadedTexture.generateMipmaps = true;
    phongMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      specular: 0x000000,
      shininess: 1,
    });
    basicMat = new THREE.MeshBasicMaterial({
      map: earthMap,
    });
    earthMesh = new THREE.Mesh(geom, phongMat);
    earthMesh.scale.set(0.01, 0.01, 0.01);

    const glowGeom = new THREE.SphereGeometry(1.31, 72, 54);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    glowMesh = new THREE.Mesh(glowGeom, glowMat);
    glowMesh.scale.set(0.01, 0.01, 0.01);
  }

  function createStars() {
    const starsGeom = new THREE.BufferGeometry();
    const count = 1000;
    const positions = new Float32Array(count * 3);
    const minDist = 8;
    const maxDist = 18;
    for (let i = 0; i < count; i++) {
      const r = minDist + Math.random() * (maxDist - minDist);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x8899cc,
      size: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(starsGeom, starsMat));
  }

  function latLonToVec3(lat, lon, radius = 1.285) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function clearMarkers() {
    airportMarkers.forEach(m => _markersGroup.remove(m));
    airportMarkers = [];
  }

  function eastTangent(lat, lon) {
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)).normalize();
  }

  function addAirportMarkers(iataList, pairs) {
    clearMarkers();
    const uniqueIATAs = [...new Set(iataList)];
    const outward = new THREE.Vector3(0, 0, 1);

    const entries = [];
    uniqueIATAs.forEach(code => {
      const airport = _airportDB[code];
      if (!airport) return;
      const pos = latLonToVec3(airport.lat, airport.lon);
      const normal = pos.clone().normalize();
      const east = eastTangent(airport.lat, airport.lon);
      const north = new THREE.Vector3().crossVectors(normal, east).normalize();
      entries.push({ code, airport, pos, normal, east, north });
    });

    const adj = {};
    pairs.forEach(({ from, to }) => {
      if (!adj[from]) adj[from] = [];
      adj[from].push(to);
      if (!adj[to]) adj[to] = [];
      adj[to].push(from);
    });

    const NEAR = 0.10;
    const TIGHT = 0.03;
    const TILT = 0.40;
    const K = 0.012;

    entries.forEach(entry => {
      const targets = adj[entry.code] || [];
      const uniqueTargets = new Set(targets).size;
      const sum = new THREE.Vector3(0, 0, 0);

      targets.forEach(tc => {
        const ap = _airportDB[tc];
        if (!ap) return;
        const tp = latLonToVec3(ap.lat, ap.lon);
        const diff = tp.clone().sub(entry.pos);
        const proj = entry.normal.clone().multiplyScalar(diff.dot(entry.normal));
        sum.add(diff.sub(proj).normalize());
      });

      // 只有一条航线（去重后仅一个目的地）：直接取航线反方向（不考虑靠右）；否则默认靠右，南北由反方向决定
      if (sum.lengthSq() > 0.000001) {
        const opp = sum.normalize().multiplyScalar(-1);
        if (uniqueTargets === 1) {
          entry.angle = Math.atan2(opp.dot(entry.north), opp.dot(entry.east));
        } else {
          const routeN = THREE.MathUtils.clamp(opp.dot(entry.north), -1, 1);
          entry.angle = routeN * TILT;
        }
      } else {
        entry.angle = 0;
      }
    });

    // 极近机场（如北京两机场）：航线方向通常相似，标签靠右并按纬度上下错开
    entries.forEach(entry => {
      entry.tight = entries.some(other =>
        other !== entry && entry.pos.distanceTo(other.pos) < TIGHT
      );
    });

    // 邻近机场按纬度上下错开：纬度高的偏上、纬度低的偏下，越近错开越大
    for (let iter = 0; iter < 20; iter++) {
      entries.forEach((entry, i) => {
        let torque = 0;
        entries.forEach((other, j) => {
          if (i === j) return;
          const d = entry.pos.distanceTo(other.pos);
          if (d > NEAR) return;
          const latDiff = entry.airport.lat - other.airport.lat;
          if (Math.abs(latDiff) < 1e-9) return;
          const desired = Math.sign(latDiff) * THREE.MathUtils.clamp(K / d, 0.1, 1.0);
          const angDiff = entry.angle - other.angle;
          torque += (desired - angDiff) * 0.5;
        });
        if (entry.tight) {
          torque += (0 - entry.angle) * 0.1;
        }
        entry.angle += torque;
      });
    }

    entries.forEach(entry => {
      const dir = entry.east.clone().multiplyScalar(Math.cos(entry.angle))
        .add(entry.north.clone().multiplyScalar(Math.sin(entry.angle)));
      entry.offset = dir.multiplyScalar(0.055);
    });

    entries.forEach(entry => {
      const { code, airport, pos, normal, offset } = entry;

      const quat = new THREE.Quaternion().setFromUnitVectors(outward, normal);

      const outlineGeom = new THREE.CircleGeometry(0.007, 32);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthTest: true,
      });
      const outlineDot = new THREE.Mesh(outlineGeom, outlineMat);
      outlineDot.position.copy(pos);
      outlineDot.setRotationFromQuaternion(quat);
      _markersGroup.add(outlineDot);
      airportMarkers.push(outlineDot);

      const coreGeom = new THREE.CircleGeometry(0.004, 32);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x64b5f6,
        side: THREE.DoubleSide,
        depthTest: true,
      });
      const dot = new THREE.Mesh(coreGeom, coreMat);
      dot.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.0012)));
      dot.setRotationFromQuaternion(quat);
      dot.name = code;
      _markersGroup.add(dot);
      airportMarkers.push(dot);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128;
      ctx.font = '600 96px Inter, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(220,210,190,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(code, 256, 64);

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos.clone().multiplyScalar(1.022).add(offset));
      sprite.scale.set(0.18, 0.045, 1);
      sprite.name = code + '_label';
      _markersGroup.add(sprite);
      airportMarkers.push(sprite);
    });
  }

  function clearArcs() {
    flightArcs.forEach(arc => _markersGroup.remove(arc));
    flightArcs = [];
  }

  function addFlightArcs(pairs) {
    clearArcs();
    const drawn = new Set();

    pairs.forEach(({ from, to }) => {
      const key = [from, to].sort().join('-');
      if (drawn.has(key)) return;
      drawn.add(key);

      const apFrom = _airportDB[from];
      const apTo = _airportDB[to];
      if (!apFrom || !apTo) return;

      const start = latLonToVec3(apFrom.lat, apFrom.lon);
      const end = latLonToVec3(apTo.lat, apTo.lon);

      const startN = start.clone().normalize();
      const endN = end.clone().normalize();
      const dot = THREE.MathUtils.clamp(startN.dot(endN), -1, 1);
      const angle = Math.acos(dot);

      if (angle < 0.0001) return;

      const segments = 64;
      const maxPush = (angle / Math.PI) * 0.15;
      const points = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let pt;
        if (i === 0) {
          pt = startN.clone();
        } else if (i === segments) {
          pt = endN.clone();
        } else {
          const a0 = Math.sin((1 - t) * angle) / Math.sin(angle);
          const a1 = Math.sin(t * angle) / Math.sin(angle);
          pt = startN.clone().multiplyScalar(a0).add(endN.clone().multiplyScalar(a1));
        }
        const push = Math.sin(Math.PI * t) * maxPush;
        points.push(pt.multiplyScalar(1.285 + push));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.0025, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      _markersGroup.add(tube);
      flightArcs.push(tube);
    });
  }

  function refreshRoutes() {
    const pairs = _getPairs();
    const allIATAs = [];
    pairs.forEach(p => {
      allIATAs.push(p.from);
      allIATAs.push(p.to);
    });
    addAirportMarkers(allIATAs, pairs);
    addFlightArcs(pairs);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (_needsResize) {
      _needsResize = false;
      applyResize();
    }

    if (Math.abs(_currentPanelAngle - _targetPanelAngle) > 0.00005) {
      _currentPanelAngle += (_targetPanelAngle - _currentPanelAngle) * LERP_FACTOR;
    }
    if (Math.abs(_currentOffset - _targetOffset) > 0.3) {
      _currentOffset += (_targetOffset - _currentOffset) * LERP_FACTOR;
    }

    if (!_earthReady && earthMap && earthMap.image && earthMap.image.complete && earthMap.image.naturalWidth > 0) {
      _earthReady = true;
      _earthScaleTarget = 1.0;
    }

    if (_earthReady && earthMesh) {
      const s = earthMesh.scale.x;
      const t = _earthScaleTarget;
      const ns = s + (t - s) * 0.08;
      if (Math.abs(ns - t) < 0.001) {
        earthMesh.scale.set(t, t, t);
        if (glowMesh) glowMesh.scale.set(t, t, t);
        if (_markersGroup) _markersGroup.scale.set(t, t, t);
      } else {
        earthMesh.scale.set(ns, ns, ns);
        if (glowMesh) glowMesh.scale.set(ns, ns, ns);
        if (_markersGroup) _markersGroup.scale.set(ns, ns, ns);
      }
    }

    controls.update();
    applyPanelAngle();
    updateSunPosition();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function applyResize() {
    const container = document.querySelector(_containerSel);
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    recalcPanelAngle();
  }

  function recalcPanelAngle() {
    const container = document.querySelector(_containerSel);
    if (!container || !camera) return;
    const vw = container.clientWidth;
    if (vw === 0) return;
    const vFov = camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    _targetPanelAngle = (_panelWidth / 2) / vw * hFov;
  }

  function applyPanelAngle() {
    if (_cameraPivot) {
      _cameraPivot.rotation.y = -_currentPanelAngle;
    }
    applyViewOffset();
  }

  function applyViewOffset() {
    const container = document.querySelector(_containerSel);
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (_currentOffset < 1) {
      camera.clearViewOffset();
    } else {
      camera.setViewOffset(w, h, _currentOffset, 0, w, h);
    }
  }

  function updateSunPosition() {
    if (!_directionalLight) return;
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const g = 2 * Math.PI * (dayOfYear - 1) / 365;
    const eot = 229.18 * (
      0.000075
      + 0.001868 * Math.cos(g)
      - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g)
      - 0.040849 * Math.sin(2 * g)
    );

    const ra = ((18 - utcHours) * 15 - eot / 4) * Math.PI / 180;

    const declination = 23.44 * Math.PI / 180
      * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);

    const dist = 7;
    _directionalLight.position.set(
      dist * Math.cos(declination) * Math.sin(ra),
      dist * Math.sin(declination),
      dist * Math.cos(declination) * Math.cos(ra)
    );
  }

  function setPanelWidth(width) {
    _panelWidth = width;
    _targetOffset = width / 2;
    recalcPanelAngle();
  }

  function setFullBright(enabled) {
    if (!earthMesh) return;
    earthMesh.material = enabled ? basicMat : phongMat;
  }

  function setAutoRotate(enabled) {
    if (controls) controls.autoRotate = enabled;
  }

  function resize() {
    applyResize();
  }

  function lookAtLatLon(lat, lon) {
    if (!camera || !controls) return;
    const pos = latLonToVec3(lat, lon);
    const dir = pos.clone().normalize();
    const dist = camera.position.length();
    camera.position.copy(dir.multiplyScalar(dist));
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function focusOnFlights(pairs) {
    if (!pairs || pairs.length === 0) {
      lookAtLatLon(35, 105);
      return;
    }
    let sumLat = 0, sumLon = 0, count = 0;
    pairs.forEach(({ from, to }) => {
      const a = _airportDB[from];
      const b = _airportDB[to];
      if (a) { sumLat += a.lat; sumLon += a.lon; count++; }
      if (b) { sumLat += b.lat; sumLon += b.lon; count++; }
    });
    if (count > 0) {
      lookAtLatLon(sumLat / count, sumLon / count);
    } else {
      lookAtLatLon(35, 105);
    }
  }

  return { init, refreshRoutes, resize, setPanelWidth, setFullBright, setAutoRotate, lookAtLatLon, focusOnFlights };
})();

export { EarthGlobe };