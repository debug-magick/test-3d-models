import { useMemo } from 'react'
import * as THREE from 'three'
import { NAVY, POLE, makeAlphaTexture, makeFittedTexture, normaliseShapeUVs } from './print'

const W = 0.9 // sail width
const H = 3.0 // sail height
const BASE = 0.75 // height of the sail's bottom above the ground
const POLE_H = BASE + H + 0.15

/** Build the classic swooping "feather" silhouette as a flat shape. */
function makeFlagShape(mirror: boolean): THREE.Shape {
  const s = new THREE.Shape()
  const x = (v: number) => (mirror ? -v : v)
  s.moveTo(x(0), 0)
  s.lineTo(x(0.03), H) // near-straight pole edge
  s.quadraticCurveTo(x(W * 1.02), H * 1.0, x(W), H * 0.32) // swooping top
  s.quadraticCurveTo(x(W * 0.72), H * 0.1, x(0.14), 0) // curved trailing edge to the tip
  s.closePath()
  return s
}

/**
 * A feather flag on a pole. `side: 1` curves right, `side: -1` mirrors it so a
 * matched pair frames the display. UVs are mirrored back so the print stays
 * readable on both.
 */
export function FeatherFlag({
  print,
  logo = null,
  position,
  side = 1,
}: {
  print: HTMLImageElement | null
  logo?: HTMLImageElement | null
  position: [number, number, number]
  side?: 1 | -1
}) {
  const mirror = side < 0

  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(makeFlagShape(mirror))
    normaliseShapeUVs(g, mirror)
    return g
  }, [mirror])

  const tex = useMemo(
    () => (print ? makeFittedTexture(print, W / H, 'contain') : null),
    [print],
  )
  const logoTex = useMemo(() => (logo ? makeAlphaTexture(logo) : null), [logo])

  // Pole sits on the sail's straight (pole-side) edge.
  const poleX = mirror ? 0.03 : -0.03

  return (
    <group position={position}>
      {/* Ground spike / base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.1, 20]} />
        <meshStandardMaterial color="#33383f" roughness={0.8} />
      </mesh>

      {/* Pole */}
      <mesh position={[poleX, POLE_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, POLE_H, 16]} />
        <meshStandardMaterial color={POLE} metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Sail */}
      <mesh geometry={geo} position={[0, BASE, 0.01]} castShadow>
        <meshStandardMaterial
          color={tex ? '#ffffff' : NAVY}
          map={tex}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Packeze logo printed near the top of the sail */}
      {logoTex && (
        <mesh position={[mirror ? -0.34 : 0.34, BASE + H * 0.82, 0.02]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshStandardMaterial
            map={logoTex}
            transparent
            alphaTest={0.05}
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
