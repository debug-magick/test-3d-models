import { useMemo } from 'react'
import * as THREE from 'three'
import { NAVY, makeFittedTexture } from './print'
import { YARD_SIGN_SIZES, type YardSignSize } from './sizes'

const T = 0.012 // corrugated panel thickness
const LIFT = 0.3 // panel bottom above the ground
const WIRE = 0.006 // wire radius

/** One H-frame wire stake: two vertical prongs joined by two crossbars. */
function Stake({ x, panelH }: { x: number; panelH: number }) {
  const legH = LIFT + panelH * 0.55 // prongs run up inside the panel flutes
  const gap = 0.07
  const wire = (
    <meshStandardMaterial color="#9aa1a9" metalness={0.9} roughness={0.35} />
  )
  return (
    <group position={[x, 0, 0]}>
      {[-gap / 2, gap / 2].map((dx, i) => (
        <mesh key={i} position={[dx, legH / 2, 0]} castShadow>
          <cylinderGeometry args={[WIRE, WIRE, legH, 10]} />
          {wire}
        </mesh>
      ))}
      {[LIFT - 0.06, LIFT - 0.16].map((y, i) => (
        <mesh key={`c${i}`} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[WIRE, WIRE, gap, 10]} />
          {wire}
        </mesh>
      ))}
    </group>
  )
}

/** A corrugated yard sign on H-wire stakes. */
export function YardSign({
  print,
  size = '18x24',
  doubleSided = true,
}: {
  print: HTMLImageElement | null
  size?: YardSignSize
  doubleSided?: boolean
}) {
  const { w: W, h: H } = YARD_SIGN_SIZES[size]

  const tex = useMemo(
    () => (print ? makeFittedTexture(print, W / H, 'contain', '#ffffff') : null),
    [print, W, H],
  )

  // BoxGeometry material order: +X, -X, +Y, -Y, +Z (front), -Z (back).
  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#e7e9ec', roughness: 0.9 })
    const face = new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : NAVY,
      map: tex,
      roughness: 0.85,
    })
    const blank = new THREE.MeshStandardMaterial({ color: '#f2f3f5', roughness: 0.9 })
    return [edge, edge, edge, edge, face, doubleSided ? face.clone() : blank]
  }, [tex, doubleSided])

  // Narrow panels get one centred stake; wider ones get a pair.
  const stakeXs = W < 0.4 ? [0] : [-W * 0.28, W * 0.28]

  return (
    <group>
      {stakeXs.map((x) => (
        <Stake key={x} x={x} panelH={H} />
      ))}
      <mesh
        position={[0, LIFT + H / 2, 0]}
        material={materials}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W, H, T]} />
      </mesh>
    </group>
  )
}
