import { useMemo } from 'react'
import * as THREE from 'three'
import { LIME, NAVY, makeAlphaTexture, makeFittedTexture } from './print'
import { TENT_SIZES, type TentSize } from './sizes'

/** Optional tent walls: none, a printed back wall, half-height walls all round,
 *  or full-height walls on the back and both sides (front stays open). */
export type WallMode = 'none' | 'back' | 'half' | 'full'

const LEG_H = 2.2 // leg height (eave height)
const VALANCE_H = 0.58 // hanging valance band height
const ROOF_H = 1.2 // apex height above the eaves
const LOGO_SIZE = 0.62
const LEG_COLOR = '#f4f5f7' // white powder-coated frame
const HALF_WALL_H = 0.95

/** The Packeze logo printed onto one roof slope. */
function RoofLogo({
  logo,
  half,
  rotY,
}: {
  logo: THREE.Texture
  half: number // half-extent of the roof along this slope's outward axis
  rotY: number
}) {
  // Slope runs from the eave edge (y=0, z=half) up to the apex (y=ROOF_H, z=0);
  // its outward normal is (0, half, ROOF_H) — tilt the decal to lie on it.
  const n = new THREE.Vector3(0, half, ROOF_H).normalize()
  const lift = 0.025 // hover just off the fabric to avoid z-fighting
  return (
    <group rotation={[0, rotY, 0]}>
      <mesh
        position={[0, ROOF_H * 0.45 + n.y * lift, half * 0.55 + n.z * lift]}
        rotation={[-Math.atan2(half, ROOF_H), 0, 0]}
      >
        <planeGeometry args={[LOGO_SIZE, LOGO_SIZE]} />
        <meshStandardMaterial map={logo} transparent alphaTest={0.05} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** A pop-up canopy tent: legs, a peaked roof with the Packeze logo on every
 *  slope, and a printed valance band around the eaves. */
export function Canopy({
  print,
  logo,
  size = '10x10',
  walls = 'none',
}: {
  print: HTMLImageElement | null
  logo: HTMLImageElement | null
  size?: TentSize
  walls?: WallMode
}) {
  const { w: W, d: D } = TENT_SIZES[size]
  const halfW = W / 2
  const halfD = D / 2
  const legW = halfW - 0.1
  const legD = halfD - 0.1
  const wallH = walls === 'half' ? HALF_WALL_H : LEG_H
  const sideWalls = walls === 'half' || walls === 'full'

  // The valance is a wide, short band — "contain" keeps the artwork at its
  // natural proportions, centred on navy fabric, instead of crop-zooming it.
  // Front/back and left/right spans differ on rectangular tents.
  const valanceTexW = useMemo(
    () => (print ? makeFittedTexture(print, W / VALANCE_H, 'contain') : null),
    [print, W],
  )
  const valanceTexD = useMemo(
    () => (print ? makeFittedTexture(print, D / VALANCE_H, 'contain') : null),
    [print, D],
  )
  const logoTex = useMemo(() => (logo ? makeAlphaTexture(logo) : null), [logo])
  // Wall graphics: back wall spans the width, side walls span the depth.
  const backWallTex = useMemo(
    () =>
      print && walls !== 'none'
        ? makeFittedTexture(print, W / wallH, 'contain')
        : null,
    [print, W, wallH, walls],
  )
  const sideWallTex = useMemo(
    () =>
      print && sideWalls ? makeFittedTexture(print, D / wallH, 'contain') : null,
    [print, D, wallH, sideWalls],
  )

  const roofGeo = useMemo(() => {
    // Unit square pyramid (half-width 1, height 1) — scaled to the footprint.
    const g = new THREE.ConeGeometry(Math.SQRT2, 1, 4)
    g.rotateY(Math.PI / 4) // align the four faces to front / back / left / right
    g.translate(0, 0.5, 0) // base at y=0
    return g
  }, [])

  // Long tents get a third pair of legs in the middle of each long side.
  const legXs = W > 4 ? [-legW, 0, legW] : [-legW, legW]
  const legPositions = legXs.flatMap((x) => [
    [x, -legD] as const,
    [x, legD] as const,
  ])

  // Four valance sides. Front & back span X; left & right span Z.
  const valanceSides = [
    { pos: [0, 0, halfD] as const, rotY: 0, len: W, tex: valanceTexW },
    { pos: [0, 0, -halfD] as const, rotY: Math.PI, len: W, tex: valanceTexW },
    { pos: [halfW, 0, 0] as const, rotY: Math.PI / 2, len: D, tex: valanceTexD },
    { pos: [-halfW, 0, 0] as const, rotY: -Math.PI / 2, len: D, tex: valanceTexD },
  ]

  return (
    <group>
      {/* Legs — slim white powder-coated frame */}
      {legPositions.map(([x, z], i) => (
        <mesh key={i} position={[x, LEG_H / 2, z]} castShadow>
          <cylinderGeometry args={[0.026, 0.03, LEG_H, 16]} />
          <meshStandardMaterial color={LEG_COLOR} metalness={0.3} roughness={0.5} />
        </mesh>
      ))}

      {/* Foot pads */}
      {legPositions.map(([x, z], i) => (
        <mesh key={`f${i}`} position={[x, 0.02, z]}>
          <cylinderGeometry args={[0.09, 0.11, 0.04, 16]} />
          <meshStandardMaterial color="#33383f" roughness={0.8} />
        </mesh>
      ))}

      {/* Peaked roof, stretched to the tent footprint */}
      <mesh
        geometry={roofGeo}
        position={[0, LEG_H, 0]}
        scale={[halfW, ROOF_H, halfD]}
        castShadow
      >
        <meshStandardMaterial color={NAVY} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Packeze logo printed on all four roof slopes */}
      {logoTex && (
        <group position={[0, LEG_H, 0]}>
          <RoofLogo logo={logoTex} half={halfD} rotY={0} />
          <RoofLogo logo={logoTex} half={halfD} rotY={Math.PI} />
          <RoofLogo logo={logoTex} half={halfW} rotY={Math.PI / 2} />
          <RoofLogo logo={logoTex} half={halfW} rotY={-Math.PI / 2} />
        </group>
      )}

      {/* Lime trim ring where the roof meets the eaves */}
      {valanceSides.map((s, i) => (
        <mesh
          key={`t${i}`}
          position={[s.pos[0], LEG_H + 0.03, s.pos[2]]}
          rotation={[0, s.rotY, 0]}
        >
          <boxGeometry args={[s.len + 0.05, 0.09, 0.06]} />
          <meshStandardMaterial color={LIME} roughness={0.6} />
        </mesh>
      ))}

      {/* Walls — back always, sides on half/full. Front stays open. */}
      {walls !== 'none' && (
        <>
          <mesh position={[0, wallH / 2, -halfD]} receiveShadow>
            <planeGeometry args={[W, wallH]} />
            <meshStandardMaterial
              color={backWallTex ? '#ffffff' : NAVY}
              map={backWallTex}
              roughness={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
          {sideWalls &&
            [
              { x: -halfW, rotY: Math.PI / 2 },
              { x: halfW, rotY: -Math.PI / 2 },
            ].map((s) => (
              <mesh
                key={s.x}
                position={[s.x, wallH / 2, 0]}
                rotation={[0, s.rotY, 0]}
                receiveShadow
              >
                <planeGeometry args={[D, wallH]} />
                <meshStandardMaterial
                  color={sideWallTex ? '#ffffff' : NAVY}
                  map={sideWallTex}
                  roughness={0.9}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
        </>
      )}

      {/* Printed valance band hanging from the eaves */}
      {valanceSides.map((s, i) => (
        <mesh
          key={`v${i}`}
          position={[s.pos[0], LEG_H - VALANCE_H / 2, s.pos[2]]}
          rotation={[0, s.rotY, 0]}
        >
          <planeGeometry args={[s.len, VALANCE_H]} />
          <meshStandardMaterial
            color={s.tex ? '#ffffff' : NAVY}
            map={s.tex}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
