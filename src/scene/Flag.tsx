import { useMemo } from 'react'
import * as THREE from 'three'
import { NAVY, makeAlphaTexture, makeFittedTexture, normaliseShapeUVs } from './print'
import { FLAG_SIZES, type FlagSize } from './sizes'

export type FlagShape = 'feather' | 'teardrop' | 'rectangle'

// Canonical geometry (scaled to the chosen size at render time).
const H = 3.05 // sail height
const BASE = 0.42 // sail bottom above the ground
const CANON_H = BASE + H // nominal total height at scale 1
const BLACK = '#171717' // slim black fibreglass pole & bracket

/* ---------------------------------------------------------------- feather */

const F_W = 0.72
// Convex top edge (pole-top → feather tip), shared by the sail and the pole.
const F_CTRL = new THREE.Vector2(0.34 * F_W, 1.03 * H)
const F_TIP = new THREE.Vector2(F_W, 0.8 * H)
const featherTopAt = (t: number) => {
  const mt = 1 - t
  return new THREE.Vector2(
    2 * mt * t * F_CTRL.x + t * t * F_TIP.x,
    mt * mt * H + 2 * mt * t * F_CTRL.y + t * t * F_TIP.y,
  )
}

function featherShape(x: (u: number) => number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x(0), 0.03 * H)
  s.lineTo(x(0), H) // leading (pole) edge — straight
  s.quadraticCurveTo(x(F_CTRL.x), F_CTRL.y, x(F_TIP.x), F_TIP.y) // convex top
  s.quadraticCurveTo(x(1.06 * F_W), 0.32 * H, x(0.7 * F_W), 0) // trailing edge
  s.quadraticCurveTo(x(0.32 * F_W), 0.12 * H, x(0), 0.03 * H) // concave bottom
  s.closePath()
  return s
}

function featherPolePts(s: 1 | -1): THREE.Vector3[] {
  return [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, BASE * 0.5, 0),
    new THREE.Vector3(0, BASE, 0),
    new THREE.Vector3(0, BASE + 0.55 * H, 0),
    ...[0, 0.33, 0.66, 1].map((t) => {
      const p = featherTopAt(t)
      return new THREE.Vector3(s * p.x, BASE + p.y, 0)
    }),
  ]
}

/* --------------------------------------------------------------- teardrop */

const T_W = 0.95

function teardropShape(x: (u: number) => number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x(0), 0.05 * H)
  s.lineTo(x(0), 0.72 * H) // leading edge — straight
  s.quadraticCurveTo(x(0.04 * T_W), 1.03 * H, x(0.48 * T_W), 1.0 * H) // dome left
  s.quadraticCurveTo(x(1.03 * T_W), 0.94 * H, x(T_W), 0.55 * H) // dome right
  s.quadraticCurveTo(x(0.88 * T_W), 0.12 * H, x(0.2 * T_W), 0.005 * H) // taper to tip
  s.quadraticCurveTo(x(0.06 * T_W), -0.008 * H, x(0), 0.05 * H) // bottom point
  s.closePath()
  return s
}

function teardropPolePts(s: 1 | -1): THREE.Vector3[] {
  // Up the leading edge, then arcing over the dome and down the outer edge.
  return [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, BASE + 0.35 * H, 0),
    new THREE.Vector3(0, BASE + 0.72 * H, 0),
    new THREE.Vector3(s * 0.48 * T_W, BASE + 1.035 * H, 0),
    new THREE.Vector3(s * 1.0 * T_W, BASE + 0.9 * H, 0),
    new THREE.Vector3(s * 1.05 * T_W, BASE + 0.56 * H, 0),
  ]
}

/* -------------------------------------------------------------- rectangle */

const R_W = 0.78

function rectangleShape(x: (u: number) => number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x(0), 0)
  s.lineTo(x(0), H)
  s.lineTo(x(R_W), H)
  s.lineTo(x(R_W), 0)
  s.closePath()
  return s
}

function rectanglePolePts(): THREE.Vector3[] {
  return [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, (BASE + H) * 0.5, 0),
    new THREE.Vector3(0, BASE + H + 0.06, 0),
  ]
}

/* ------------------------------------------------------------------ table */

const SHAPES: Record<
  FlagShape,
  {
    w: number
    logoPos: [number, number]
    shape: (x: (u: number) => number) => THREE.Shape
    polePts: (s: 1 | -1) => THREE.Vector3[]
    topArm?: boolean
  }
> = {
  feather: {
    w: F_W,
    logoPos: [0.22, BASE + 0.86 * H],
    shape: featherShape,
    polePts: featherPolePts,
  },
  teardrop: {
    w: T_W,
    logoPos: [0.4, BASE + 0.8 * H],
    shape: teardropShape,
    polePts: teardropPolePts,
  },
  rectangle: {
    w: R_W,
    logoPos: [R_W / 2, BASE + 0.9 * H],
    shape: rectangleShape,
    polePts: rectanglePolePts,
    topArm: true,
  },
}

/**
 * An advertising flag on a black pole, in feather / teardrop / rectangle
 * shapes and 6–14 ft heights. `side: 1` billows right, `side: -1` mirrors it
 * so a matched pair frames a display; UVs are mirrored back so the print
 * stays readable on both.
 */
export function Flag({
  print,
  logo = null,
  position,
  side = 1,
  shape = 'feather',
  size = '10ft',
}: {
  print: HTMLImageElement | null
  logo?: HTMLImageElement | null
  position: [number, number, number]
  side?: 1 | -1
  shape?: FlagShape
  size?: FlagSize
}) {
  const mirror = side < 0
  const s: 1 | -1 = mirror ? -1 : 1
  const def = SHAPES[shape]
  const k = FLAG_SIZES[size].h / CANON_H

  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(def.shape((u) => s * u))
    normaliseShapeUVs(g, mirror)
    return g
  }, [def, s, mirror])

  const poleGeo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(def.polePts(s)),
        64,
        0.017,
        8,
        false,
      ),
    [def, s],
  )

  const tex = useMemo(
    () => (print ? makeFittedTexture(print, def.w / H, 'contain') : null),
    [print, def],
  )
  const logoTex = useMemo(() => (logo ? makeAlphaTexture(logo) : null), [logo])

  return (
    <group position={position} scale={k}>
      {/* Black ground bracket / clamp */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.05, 0.56, 0.05]} />
        <meshStandardMaterial color={BLACK} roughness={0.6} metalness={0.3} />
      </mesh>
      {[0.16, 0.34].map((y) => (
        <mesh key={y} position={[s * 0.045, y, 0]}>
          <boxGeometry args={[0.12, 0.05, 0.07]} />
          <meshStandardMaterial color={BLACK} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* Pole (curved or straight, per shape) */}
      <mesh geometry={poleGeo} castShadow>
        <meshStandardMaterial color={BLACK} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Rectangle flags hang from a horizontal top arm */}
      {def.topArm && (
        <mesh position={[(s * def.w) / 2, BASE + H + 0.03, 0]}>
          <boxGeometry args={[def.w + 0.05, 0.026, 0.026]} />
          <meshStandardMaterial color={BLACK} roughness={0.5} metalness={0.2} />
        </mesh>
      )}

      {/* Sail */}
      <mesh geometry={geo} position={[0, BASE, 0.01]} castShadow>
        <meshStandardMaterial
          color={tex ? '#ffffff' : NAVY}
          map={tex}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Packeze logo near the top of the sail */}
      {logoTex && (
        <mesh position={[s * def.logoPos[0], def.logoPos[1], 0.02]}>
          <planeGeometry args={[0.26, 0.26]} />
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
