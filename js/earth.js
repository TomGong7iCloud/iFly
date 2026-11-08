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
  let _markersGroup;
  let airportMarkers = [];
  let flightArcs = [];
  let _airportDB = {};
  let _getPairs = () => [];
  let _containerSel = '';

  let _resizeObserver = null;
  let _needsResize = false;

  let _targetOffset = 0;
  let _currentOffset = 0;
  const LERP_FACTOR = 0.12;

  let _earthReady = false;
  let _earthScaleTarget = 0.01;

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
    createStars();

    _markersGroup = new THREE.Group();
    _markersGroup.scale.set(0.01, 0.01, 0.01);
    scene.add(_markersGroup);

    _resizeObserver = new ResizeObserver(() => { _needsResize = true; });
    _resizeObserver.observe(container);

    animate();
  }

  function createEarth() {
    const geom = new THREE.SphereGeometry(1.28, 72, 54);
    const textureLoader = new THREE.TextureLoader();
    earthMap = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
    );
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
    scene.add(earthMesh);

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
    scene.add(glowMesh);
  }

  function createStars() {
    const starsGeom = new THREE.BufferGeometry();
    const count = 800;
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
      size: 0.04,
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

  function addAirportMarkers(iataList) {
    clearMarkers();
    const uniqueIATAs = [...new Set(iataList)];
    const outward = new THREE.Vector3(0, 0, 1);

    uniqueIATAs.forEach(code => {
      const airport = _airportDB[code];
      if (!airport) return;

      const pos = latLonToVec3(airport.lat, airport.lon);
      const normal = pos.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(outward, normal);

      const dotGeom = new THREE.CircleGeometry(0.009, 32);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xffa726,
        side: THREE.DoubleSide,
        depthTest: true,
      });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.copy(pos);
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
      sprite.position.copy(pos.clone().multiplyScalar(1.08));
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
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1.55);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.007, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.65,
      });
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
    addAirportMarkers(allIATAs);
    addFlightArcs(pairs);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (_needsResize) {
      _needsResize = false;
      applyResize();
    }

    if (Math.abs(_currentOffset - _targetOffset) > 0.3) {
      _currentOffset += (_targetOffset - _currentOffset) * LERP_FACTOR;
      applyViewOffset();
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
    const angle = (utcHours - 12) * 15 * Math.PI / 180;
    const dist = 7;
    const y = 2;
    _directionalLight.position.set(
      dist * Math.sin(angle),
      y,
      dist * Math.cos(angle)
    );
  }

  function setPanelWidth(width) {
    _targetOffset = width / 2;
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