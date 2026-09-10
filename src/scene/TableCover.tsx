import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { makeBrandTexture, makeFittedTexture, NAVY } from './print'
import { FabricMaterial, FrameBar } from './materials'
import { useDispose } from './resources'

const W = 1.8288
const D = 0.762
const H = 0.74
const FOOT_INSET = 0.06

function Skirt({ width, depth, rotation, texture }: { width: number; depth: number; rotation: number; texture: THREE.Texture | null }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, H, 64, 32)
    const p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i), v = uv.getY(i)
      const arch = Math.pow(Math.sin(Math.PI * u), 0.8)
      const bottom = 0.008 + arch * 0.15
      const y = THREE.MathUtils.lerp(bottom, H - 0.009, v)
      const tuck = Math.sin(Math.PI * v) * 0.055 * arch
      const folds = Math.sin(u * 42 + v * 6) * 0.005 * Math.pow(1 - v, 2) * Math.sin(Math.PI * u) * (1 - arch * 0.6)
      p.setXYZ(i, (u - 0.5) * (width - Math.sin(v * Math.PI) * 0.06), y, depth / 2 - Math.sin(v * Math.PI) * 0.03 - tuck + folds)
    }
    g.computeVertexNormals()
    return g
  }, [width, depth])
  useDispose(geometry)
  return <mesh geometry={geometry} rotation={[0, rotation, 0]} castShadow receiveShadow>
    <FabricMaterial key={texture?.uuid ?? 'plain'} color={texture ? 'white' : NAVY} map={texture} />
  </mesh>
}

export function TableCover({ print }: { print: HTMLImageElement | null }) {
  const texture = useMemo(() => print ? makeFittedTexture(print, W / H) : makeBrandTexture(W / H), [print])
  const top = useMemo(() => new RoundedBoxGeometry(W, 0.026, D, 3, 0.012), [])
  useDispose(texture)
  useDispose(top)
  return <group>
    {/* Allow clearance for the skirt's inward curve and the full tube radius. */}
    {[-1, 1].flatMap(x => [-1, 1].map(z => <FrameBar
      key={`${x},${z}`}
      start={[x * (W / 2 - FOOT_INSET), 0.025, z * (D / 2 - FOOT_INSET)]}
      end={[x * W * 0.32, H - 0.035, z * D * 0.28]}
      radius={0.014}
      color="#40464c"
    />))}
    <mesh geometry={top} position={[0, H - 0.013, 0]} castShadow receiveShadow>
      <FabricMaterial color={NAVY} />
    </mesh>
    <Skirt width={W} depth={D} rotation={0} texture={texture} />
    <Skirt width={W} depth={D} rotation={Math.PI} texture={null} />
    <Skirt width={D} depth={W} rotation={Math.PI / 2} texture={null} />
    <Skirt width={D} depth={W} rotation={-Math.PI / 2} texture={null} />
  </group>
}
