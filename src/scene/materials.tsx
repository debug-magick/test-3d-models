import { useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

// A small, tileable weave supplies surface relief without downloading textures.
let weave: THREE.DataTexture | undefined
function fabricWeave() {
  if (weave) return weave
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const thread = Math.sin(x * Math.PI / 4) * Math.cos(y * Math.PI / 4)
      const value = 128 + thread * 48 + Math.sin(x * 17 + y * 31) * 9
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = value
      data[i + 3] = 255
    }
  }
  weave = new THREE.DataTexture(data, size, size)
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping
  weave.repeat.set(12, 12)
  weave.magFilter = THREE.LinearFilter
  weave.minFilter = THREE.LinearMipmapLinearFilter
  weave.generateMipmaps = true
  weave.needsUpdate = true
  return weave
}

export function FabricMaterial(props: ThreeElements['meshPhysicalMaterial']) {
  const bump = useMemo(() => fabricWeave(), [])
  return <meshPhysicalMaterial
    roughness={0.82}
    metalness={0}
    envMapIntensity={0.28}
    sheen={0.18}
    sheenColor="#36547c"
    sheenRoughness={0.8}
    bumpMap={bump}
    bumpScale={0.0007}
    side={THREE.DoubleSide}
    {...props}
  />
}

/** A tube between two joints, useful for the real frame beneath the fabric. */
export function FrameBar({ start, end, radius = 0.012, color = '#bfc6cc' }: {
  start: [number, number, number]
  end: [number, number, number]
  radius?: number
  color?: string
}) {
  const [sx, sy, sz] = start
  const [ex, ey, ez] = end
  const { midpoint, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(sx, sy, sz)
    const b = new THREE.Vector3(ex, ey, ez)
    return {
      midpoint: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()),
      length: a.distanceTo(b),
    }
  }, [sx, sy, sz, ex, ey, ez])
  return <mesh position={midpoint} quaternion={quaternion} castShadow>
    <cylinderGeometry args={[radius, radius, length, 6]} />
    <meshStandardMaterial color={color} metalness={0.85} roughness={0.3} />
  </mesh>
}
