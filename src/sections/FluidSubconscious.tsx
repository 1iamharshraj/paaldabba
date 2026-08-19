import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { heroConfig } from '../config'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uIntensity;

varying vec2 vUv;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);

  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec2 getCoverUv(vec2 uv, vec2 resolution, vec2 imageRes) {
  float screenAspect = resolution.x / resolution.y;
  float imageAspect = imageRes.x / imageRes.y;
  vec2 scale = vec2(1.0);
  if (screenAspect > imageAspect) {
    scale.y = imageAspect / screenAspect;
  } else {
    scale.x = screenAspect / imageAspect;
  }
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 coverUv = getCoverUv(vUv, uResolution, uImageResolution);
  float t = uTime * 0.12;

  float n1x = snoise(vec3(coverUv * 1.5, t * 0.6));
  float n1y = snoise(vec3(coverUv * 1.5 + 100.0, t * 0.6));

  float n2x = snoise(vec3(coverUv * 3.0, t * 1.0 + 50.0));
  float n2y = snoise(vec3(coverUv * 3.0 + 200.0, t * 1.0 + 50.0));

  float n3x = snoise(vec3(coverUv * 6.0, t * 1.5 + 150.0));
  float n3y = snoise(vec3(coverUv * 6.0 + 300.0, t * 1.5 + 150.0));

  vec2 displacement = vec2(0.0);
  displacement += vec2(n1x, n1y) * 0.16;
  displacement += vec2(n2x, n2y) * 0.05;
  displacement += vec2(n3x, n3y) * 0.02;

  displacement *= uIntensity;

  vec2 distortedUv = clamp(coverUv + displacement, 0.0, 1.0);
  gl_FragColor = texture2D(uTexture, distortedUv);
}
`

export default function FluidSubconscious() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!heroConfig.fluidImagePath) return

    let animFrameId = 0
    let disposed = false

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = heroConfig.fluidImagePath

    img.onload = () => {
      if (disposed) return

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      const texture = new THREE.Texture(img)
      texture.needsUpdate = true
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter

      const isMobile = window.innerWidth < 768
      const uniforms = {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uImageResolution: { value: new THREE.Vector2(img.naturalWidth, img.naturalHeight) },
        uIntensity: { value: isMobile ? 0.4 : 0.6 },
      }

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
      })

      const geometry = new THREE.PlaneGeometry(2, 2)
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const startTime = performance.now()

      const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight)
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
      }
      window.addEventListener('resize', onResize)

      const animate = () => {
        if (disposed) return
        animFrameId = requestAnimationFrame(animate)
        uniforms.uTime.value = (performance.now() - startTime) / 1000
        renderer.render(scene, camera)
      }
      animate()

      cleanupRef.current = () => {
        disposed = true
        cancelAnimationFrame(animFrameId)
        window.removeEventListener('resize', onResize)
        geometry.dispose()
        material.dispose()
        texture.dispose()
        renderer.dispose()
      }
    }

    return () => {
      disposed = true
      cancelAnimationFrame(animFrameId)
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
