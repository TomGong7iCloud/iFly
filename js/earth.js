/* ============================================================
   iFly · earth.js — 3D 地球可视化 (Three.js ES Module)
   基于旧版 iFly Legacy 地球代码，适配新项目布局
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const EarthGlobe = (() => {
  let scene, camera, renderer, labelRenderer, controls;
  let earthMesh;
  let earthMap, phongMat, basicMat;
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
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x556688, 0.8);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(5, 3, 7);
    scene.add(directional);

    createEarth();
    createStars();

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
      specular: 0x222222,
      shininess: 8,
    });
    basicMat = new THREE.MeshBasicMaterial({
      map: earthMap,
    });
    earthMesh = new THREE.Mesh(geom, phongMat);
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
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    scene.add(glowMesh);
  }

  function createStars() {
    const starsGeom = new THREE.BufferGeometry();
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x8899cc,
      size: 0.025,
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
    airportMarkers.forEach(m => scene.remove(m));
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

      // Flat circle dot, facing outward from globe surface
      const dotGeom = new THREE.CircleGeometry(0.016, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0x64b5f6,
        side: THREE.DoubleSide,
        depthTest: true,
      });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.copy(pos);
      const normal = pos.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(outward, normal);
      dot.setRotationFromQuaternion(quat);
      dot.name = code;
      scene.add(dot);
      airportMarkers.push(dot);

      const div = document.createElement('div');
      div.textContent = code;
      div.style.cssText = `
        color: rgba(200,220,255,0.9);
        font-size: 9px;
        font-family: -apple-system, sans-serif;
        font-weight: 500;
        letter-spacing: 0.3px;
        text-shadow: 0 0 4px rgba(100,160,220,0.4);
        pointer-events: none;
        white-space: nowrap;
      `;
      const label = new CSS2DObject(div);
      label.position.copy(pos.clone().multiplyScalar(1.03));
      label.name = code + '_label';
      scene.add(label);
      airportMarkers.push(label);
    });
  }

  function clearArcs() {
    flightArcs.forEach(arc => scene.remove(arc));
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
      const points = curve.getPoints(60);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(geom, mat);
      scene.add(line);
      flightArcs.push(line);
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

    controls.update();
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

  return { init, refreshRoutes, resize, setPanelWidth, setFullBright, setAutoRotate };
})();

export { EarthGlobe };