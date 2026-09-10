import { useMemo } from 'react'
import * as THREE from 'three'
import { useDispose } from './resources'

export type ClearRect = { x: number; z: number; hw: number; hd: number }
export type EnvironmentMode = 'studio' | 'outdoor'

function makeRng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

function groundTexture(outdoor: boolean, small: boolean) {
  const n = 256
  const data = new Uint8Array(n * n * 4)
  const random = makeRng(42)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const noise = random() * 16 - 8
    const patch = outdoor ? Math.sin(x / 7 + y / 13) * Math.cos(x / 9 - y / 5) * 4 : 0
    const i = (y * n + x) * 4
    data[i] = (outdoor ? 76 : 224) + noise + patch
    data[i + 1] = (outdoor ? 91 : 222) + noise + patch
    data[i + 2] = (outdoor ? 46 : 216) + noise + patch
    data[i + 3] = 255
  }
  const texture = new THREE.DataTexture(data, n, n)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.setScalar(small ? 1500 : 60)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** Thousands of slender, bent blades share one geometry and one draw call. */
export function GrassGround({ radius, clear = [] }: { radius: number; clear?: ClearRect[] }) {
  const geometry = useMemo(() => {
    const random = makeRng(1337)
    const positions: number[] = [], colors: number[] = []
    const count = Math.min(26000, Math.round(Math.PI * radius * radius * 180))
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2, r = Math.sqrt(random()) * radius
      const x = Math.cos(a) * r, z = Math.sin(a) * r
      if (clear.some(c => Math.abs(x - c.x) < c.hw && Math.abs(z - c.z) < c.hd)) continue
      const height = 0.018 + random() * 0.05
      const angle = random() * Math.PI * 2
      const dx = Math.cos(angle) * 0.006, dz = Math.sin(angle) * 0.006
      const bend = 0.01 + random() * 0.016
      const green = new THREE.Color('#4e602d').multiplyScalar(0.65 + random() * 0.65)
      positions.push(x - dx, 0.001, z - dz, x + dx, 0.001, z + dz, x + bend, height, z + bend * 0.5)
      for (let j = 0; j < 3; j++) {
        const light = j === 2 ? 1.35 : 0.8
        colors.push(green.r * light, green.g * light, green.b * light)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [radius, clear])
  useDispose(geometry)
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={1} />
  </mesh>
}

/** The ground stays in world space while the camera zooms around the product. */
export function WorldGround({ mode, small = false }: { mode: EnvironmentMode; small?: boolean }) {
  const outdoor = mode === 'outdoor'
  const texture = useMemo(() => groundTexture(outdoor, small), [outdoor, small])
  useDispose(texture)
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial map={texture} roughness={outdoor ? 1 : 0.84} metalness={0} />
  </mesh>
}
