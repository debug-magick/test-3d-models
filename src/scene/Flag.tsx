import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { makeBrandTexture, makeFittedTexture } from './print'
import { FabricMaterial } from './materials'
import { useDispose } from './resources'
import { useWind, windShader } from './motion'
import { FLAG_SIZES, type FlagSize } from './sizes'

export type FlagShape = 'feather' | 'teardrop' | 'rectangle'

// Canonical geometry (scaled to the chosen size at render time).
const H = 3.05 // sail height
const BASE = 0.42 // sail bottom above the ground
const CANON_H = BASE + H // nominal total height at scale 1
const BLACK = '#171717' // slim black fibreglass pole & bracket
const POLE_R = 0.014

const v3 = (x: number, y: number) => new THREE.Vector3(x, y, 0)

/* ---------------------------------------------------------------- feather
   Tall blade: straight leading edge, the top corner rounds over to the
   trailing edge; the pole runs up the leading edge and hooks over that same
   top-corner curve (candy-cane), hugging the fabric. */

const F_W = 0.72
// Top corner curve shared by sail and pole: (0,H) → (0.45W, 0.96H).
const F_TOP = { c: [0.05 * F_W, 1.04 * H], p: [0.45 * F_W, 0.96 * H] }

function featherShape(x: (u: number) => number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x(0), 0.04 * H)
  s.lineTo(x(0), H) // leading (pole) edge — straight
  s.quadraticCurveTo(x(F_TOP.c[0]), F_TOP.c[1], x(F_TOP.p[0]), F_TOP.p[1])
  s.quadraticCurveTo(x(0.92 * F_W), 0.86 * H, x(F_W), 0.68 * H) // shoulder
  s.quadraticCurveTo(x(0.94 * F_W), 0.3 * H, x(0.72 * F_W), 0.05 * H) // trailing
  s.quadraticCurveTo(x(0.3 * F_W), -0.02 * H, x(0), 0.04 * H) // bottom swoosh
  s.closePath()
  return s
}

function featherPole(s: 1 | -1): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  path.add(new THREE.LineCurve3(v3(0, 0), v3(0, BASE + H)))
  path.add(
    new THREE.QuadraticBezierCurve3(
      v3(0, BASE + H),
      v3(s * F_TOP.c[0], BASE + F_TOP.c[1]),
      v3(s * F_TOP.p[0], BASE + F_TOP.p[1]),
    ),
  )
  return path
}

/* --------------------------------------------------------------- teardrop
   Shark-fin drop: the pole arcs from the leading edge over the dome and down
   the trailing edge; the fabric fills the arc and tapers to a bottom point.
   The pole reuses the sail's dome curves exactly. */

const T_W = 0.95
const T_EDGE = 0.68 * H // where the leading edge ends and the dome starts
const T_DOME1 = { c: [0.03 * T_W, 1.03 * H], p: [0.52 * T_W, 0.97 * H] }
const T_DOME2 = { c: [1.04 * T_W, 0.85 * H], p: [0.98 * T_W, 0.48 * H] }

function teardropShape(x: (u: number) => number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x(0), 0.02 * H)
  s.lineTo(x(0), T_EDGE) // leading edge — straight
  s.quadraticCurveTo(x(T_DOME1.c[0]), T_DOME1.c[1], x(T_DOME1.p[0]), T_DOME1.p[1])
  s.quadraticCurveTo(x(T_DOME2.c[0]), T_DOME2.c[1], x(T_DOME2.p[0]), T_DOME2.p[1])
  s.quadraticCurveTo(x(0.78 * T_W), 0.08 * H, x(0.14 * T_W), 0) // taper to tip
  s.quadraticCurveTo(x(0.03 * T_W), 0, x(0), 0.02 * H)
  s.closePath()
  return s
}

function teardropPole(s: 1 | -1): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  path.add(new THREE.LineCurve3(v3(0, 0), v3(0, BASE + T_EDGE)))
  path.add(
    new THREE.QuadraticBezierCurve3(
      v3(0, BASE + T_EDGE),
      v3(s * T_DOME1.c[0], BASE + T_DOME1.c[1]),
      v3(s * T_DOME1.p[0], BASE + T_DOME1.p[1]),
    ),
  )
  path.add(
    new THREE.QuadraticBezierCurve3(
      v3(s * T_DOME1.p[0], BASE + T_DOME1.p[1]),
      v3(s * T_DOME2.c[0], BASE + T_DOME2.c[1]),
      v3(s * T_DOME2.p[0], BASE + T_DOME2.p[1]),
    ),
  )
  return path
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

function rectanglePole(): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  path.add(new THREE.LineCurve3(v3(0, 0), v3(0, BASE + H + 0.06)))
  return path
}

/* ------------------------------------------------------------------ table */

const SHAPES: Record<
  FlagShape,
  {
    w: number
    logoPos: [number, number]
    shape: (x: (u: number) => number) => THREE.Shape
    pole: (s: 1 | -1) => THREE.CurvePath<THREE.Vector3>
    topArm?: boolean
  }
> = {
  feather: {
    w: F_W,
    logoPos: [0.24, BASE + 0.84 * H],
    shape: featherShape,
    pole: featherPole,
  },
  teardrop: {
    w: T_W,
    logoPos: [0.45, BASE + 0.78 * H],
    shape: teardropShape,
    pole: teardropPole,
  },
  rectangle: {
    w: R_W,
    logoPos: [R_W / 2, BASE + 0.9 * H],
    shape: rectangleShape,
    pole: rectanglePole,
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

  // Scan the silhouette into evenly spaced rows: unlike ShapeGeometry this
  // has interior vertices, so wind bends the whole sail, not just its outline.
  const geo = useMemo(() => {
    const outline = def.shape(u => u).getPoints(100)
    const ys = outline.map(p => p.y)
    const bottom = Math.min(...ys), top = Math.max(...ys)
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [], anchors: number[] = []
    const columns = 20, rows = 80
    for (let row = 0; row <= rows; row++) {
      const y = bottom + (top - bottom) * (0.00001 + row / rows * 0.99998)
      const hits: number[] = []
      for (let j = 0; j < outline.length - 1; j++) {
        const a = outline[j], b = outline[j + 1]
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          hits.push(a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y))
        }
      }
      const left = hits.length ? Math.min(...hits) : 0
      const right = hits.length ? Math.max(...hits) : 0
      for (let col = 0; col <= columns; col++) {
        const x = THREE.MathUtils.lerp(left, right, col / columns)
        positions.push(s * x, y, 0)
        // Pin the teardrop to its curved trailing pole as well as its mast.
        const curvedPole = def === SHAPES.teardrop ? THREE.MathUtils.smoothstep(y, H * 0.4, H * 0.55) : 0
        anchors.push(1 - curvedPole * (1 - Math.sin(Math.PI * col / columns)))
        uvs.push(x / def.w, (y - bottom) / (top - bottom))
        if (row < rows && col < columns) {
          const i = row * (columns + 1) + col
          if (s > 0) indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1)
          else indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2)
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setAttribute('windAnchor', new THREE.Float32BufferAttribute(anchors, 1))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    g.boundingSphere!.radius += 0.15
    return g
  }, [def, s])

  const poleGeo = useMemo(
    () => new THREE.TubeGeometry(def.pole(s), 64, POLE_R, 8, false),
    [def, s],
  )

  const tex = useMemo(
    () => print ? makeFittedTexture(print, def.w / H, 'contain') : makeBrandTexture(def.w / H, true),
    [print, def],
  )
  const wind = useWind()
  const compile = useCallback<THREE.Material['onBeforeCompile']>((shader) => {
    shader.uniforms.windTime = wind.time
    shader.uniforms.windStrength = wind.strength
    shader.vertexShader = windShader + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += clothOffset(position);')
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      float dx = (clothOffset(position + vec3(0.005, 0.0, 0.0)) - clothOffset(position - vec3(0.005, 0.0, 0.0))) / 0.01;
      float dy = (clothOffset(position + vec3(0.0, 0.005, 0.0)) - clothOffset(position - vec3(0.0, 0.005, 0.0))) / 0.01;
      objectNormal = normalize(vec3(-dx, -dy, 1.0));
    `)
  }, [wind])
  const depth = useMemo(() => {
    const material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
    material.onBeforeCompile = compile
    material.customProgramCacheKey = () => 'flag-wind-depth-v1'
    return material
  }, [compile])
  useDispose(geo)
  useDispose(poleGeo)
  useDispose(tex)
  useDispose(depth)

  return (
    <group position={position} scale={k}>
      {[0, Math.PI / 2].map(angle => <mesh key={angle} position={[0, 0.015, 0]} rotation={[0, angle, 0]} castShadow>
        <boxGeometry args={[0.6, 0.03, 0.055]} />
        <meshStandardMaterial color="#30363b" metalness={0.7} roughness={0.38} />
      </mesh>)}
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

      {/* Pole — follows the sail's own edge curves */}
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

      <mesh geometry={geo} position={[0, BASE, 0.008]} castShadow receiveShadow customDepthMaterial={depth}>
        <FabricMaterial
          key={tex.uuid}
          color="white"
          map={tex}
          onBeforeCompile={compile}
          customProgramCacheKey={() => 'flag-wind-v1'}
          roughness={0.88}
          sheen={0.45}
        />
      </mesh>
    </group>
  )
}
