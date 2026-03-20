import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface StlViewerProps {
  url: string;
  className?: string;
}

export default function StlViewer({ url, className = '' }: StlViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || !url) {
      setStatus('error');
      setErrorMessage('No STL file available.');
      return;
    }

    let frameId = 0;
    let disposed = false;
    let controls: OrbitControls | null = null;
    let renderer: THREE.WebGLRenderer | null = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 0, 140);

    const ambientLight = new THREE.HemisphereLight('#ffffff', '#d2c4b4', 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.1);
    keyLight.position.set(40, 50, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#aacddc', 1.1);
    fillLight.position.set(-60, 20, -40);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(72, 64),
      new THREE.ShadowMaterial({ color: '#94a3b8', opacity: 0.12 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -34;
    scene.add(ground);

    const resizeRenderer = () => {
      if (!mountNode || !renderer) return;
      const width = Math.max(mountNode.clientWidth, 1);
      const height = Math.max(mountNode.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const fitCameraToObject = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, 1);
      const fitHeightDistance = maxSize / (2 * Math.tan((Math.PI * camera.fov) / 360));
      const fitWidthDistance = fitHeightDistance / camera.aspect;
      const distance = 1.25 * Math.max(fitHeightDistance, fitWidthDistance);

      camera.near = Math.max(distance / 100, 0.1);
      camera.far = distance * 100;
      camera.updateProjectionMatrix();
      camera.position.set(center.x + distance * 0.35, center.y + distance * 0.2, center.z + distance);

      if (controls) {
        controls.target.copy(center);
        controls.update();
      }
    };

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      mountNode.innerHTML = '';
      mountNode.appendChild(renderer.domElement);
      resizeRenderer();

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 20;
      controls.maxDistance = 500;
      controls.autoRotate = false;

      const loader = new STLLoader();
      loader.load(
        url,
        (geometry: THREE.BufferGeometry) => {
          if (disposed) {
            geometry.dispose();
            return;
          }

          geometry.computeVertexNormals();
          geometry.center();

          const material = new THREE.MeshStandardMaterial({
            color: '#81a6c6',
            metalness: 0.18,
            roughness: 0.48,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.rotation.x = -Math.PI / 2;
          scene.add(mesh);
          fitCameraToObject(mesh);
          setStatus('ready');
        },
        undefined,
        (error: unknown) => {
          if (disposed) return;
          console.error('Failed to load STL file', error);
          setStatus('error');
          setErrorMessage('Unable to load this STL file.');
        },
      );
    } catch (error) {
      console.error('Unable to initialize STL viewer', error);
      setStatus('error');
      setErrorMessage('3D viewer is unavailable.');
    }

    const handleResize = () => resizeRenderer();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (disposed || !renderer) return;
      frameId = window.requestAnimationFrame(animate);
      controls?.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      controls?.dispose();
      scene.traverse((node: THREE.Object3D) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else if (material) {
          material.dispose();
        }
      });
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        if (renderer.domElement.parentNode === mountNode) {
          mountNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [url]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <div ref={mountRef} className="h-full min-h-[18rem] w-full" />
      {status !== 'ready' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 px-4 text-center">
          <div className="text-sm font-semibold text-slate-700">
            {status === 'loading' ? 'Loading 3D model...' : errorMessage}
          </div>
          <p className="text-xs text-slate-500">
            {status === 'loading'
              ? 'Preparing an interactive STL preview.'
              : 'Try reopening the design after the STL upload completes.'}
          </p>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
          Drag to rotate, scroll to zoom
        </div>
      )}
    </div>
  );
}
