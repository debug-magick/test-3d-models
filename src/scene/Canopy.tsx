import { useMemo } from 'react'
import * as THREE from 'three'
import { LIME, makeAlphaTexture, makeBrandTexture, makeFittedTexture } from './print'
import { FabricMaterial, FrameBar } from './materials'
import { useDispose } from './resources'
import { TENT_SIZES, type TentSize } from './sizes'

export type WallMode = 'none' | 'back' | 'half' | 'full'
const EAVE = 2.35
const VALANCE = 0.32
const PEAK = 0.95

function FabricPanel({ width, height, texture, position, rotation = 0 }: {
  width: number; height: number; texture: THREE.Texture
  position: [number, number, number]; rotation?: number
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 40, 16)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / width + 0.5
      const v = p.getY(i) / height + 0.5
      p.setZ(i, Math.sin(u * Math.PI) * (Math.sin(u * 38 + v * 5) * 0.007 + Math.sin(v * Math.PI) * 0.018))
      if (height < 0.5) p.setY(i, p.getY(i) - Math.sin(u * Math.PI) * (1 - v) * 0.012)
    }
    g.computeVertexNormals()
    return g
  }, [width, height])
  useDispose(geometry)
  return <mesh geometry={geometry} position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
    <FabricMaterial key={texture.uuid} color="white" map={texture} />
  </mesh>
}

function RoofPanel({ bottom, top, depth, rotation, offset, logo }: {
  bottom: number; top: number; depth: number; rotation: number
  offset: [number, number, number]; logo: THREE.Texture | null
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 32, 24)
    const p = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      const sag = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.035
      p.setXYZ(i, (u - 0.5) * THREE.MathUtils.lerp(bottom, top, v), PEAK * v - sag, depth * (1 - v))
    }
    g.computeVertexNormals()
    return g
  }, [bottom, top, depth])
  useDispose(geometry)
  return <group position={offset} rotation={[0, rotation, 0]}>
    <mesh geometry={geometry} castShadow receiveShadow>
      <FabricMaterial color="#21406b" />
    </mesh>
    {logo && <mesh position={[0, PEAK * 0.43 - 0.025, depth * 0.57 + 0.004]} rotation={[-Math.atan2(depth, PEAK), 0, 0]}>
      <planeGeometry args={[0.48, 0.48]} />
      <FabricMaterial map={logo} transparent alphaTest={0.05} polygonOffset polygonOffsetFactor={-2} depthWrite={false} />
    </mesh>}
  </group>
}

export function Canopy({ print, logo, size = '10x10', walls = 'none' }: {
  print: HTMLImageElement | null; logo: HTMLImageElement | null
  size?: TentSize; walls?: WallMode
}) {
  const { w, d } = TENT_SIZES[size]
  const hw = w / 2, hd = d / 2
  const ridge = Math.max(0, hw - hd)
  const legW = hw - 0.055, legD = hd - 0.055
  const textures = useMemo(() => {
    const make = (aspect: number) => print ? makeFittedTexture(print, aspect) : makeBrandTexture(aspect)
    return [make(w / VALANCE), make(d / VALANCE), make(w / EAVE), make(d / (walls === 'half' ? 0.95 : EAVE))]
  }, [print, w, d, walls])
  const logoTex = useMemo(() => logo ? makeAlphaTexture(logo) : null, [logo])
  useDispose(textures)
  useDispose(logoTex)
  const legs = (w > 4 ? [-legW, 0, legW] : [-legW, legW]).flatMap(x => [[x, -legD], [x, legD]])
  const sides = [
    { pos: [0, EAVE, hd] as [number, number, number], rotation: 0, width: w, texture: textures[0] },
    { pos: [0, EAVE, -hd] as [number, number, number], rotation: Math.PI, width: w, texture: textures[0] },
    { pos: [hw, EAVE, 0] as [number, number, number], rotation: Math.PI / 2, width: d, texture: textures[1] },
    { pos: [-hw, EAVE, 0] as [number, number, number], rotation: -Math.PI / 2, width: d, texture: textures[1] },
  ]
  return <group>
    {legs.map(([x, z]) => <group key={`${x},${z}`}>
      <mesh position={[x, 0.59, z]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.16, 6]} />
        <meshStandardMaterial color="#c7cdd1" metalness={0.85} roughness={0.27} />
      </mesh>
      <mesh position={[x, 1.7, z]} castShadow>
        <cylinderGeometry args={[0.023, 0.023, 1.3, 6]} />
        <meshStandardMaterial color="#d4d9dd" metalness={0.82} roughness={0.31} />
      </mesh>
      {[1.07, 2.04, 2.3].map(y => <mesh key={y} position={[x, y, z]}>
        <boxGeometry args={[0.062, 0.075, 0.062]} />
        <meshStandardMaterial color="#252b31" roughness={0.6} />
      </mesh>)}
      <mesh position={[x, 1.07, z + 0.035]}>
        <sphereGeometry args={[0.013, 10, 8]} />
        <meshStandardMaterial color={LIME} roughness={0.5} />
      </mesh>
      <mesh position={[x, 0.014, z]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.028, 0.12]} />
        <meshStandardMaterial color="#555d62" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>)}

    {sides.map((side, i) => <group key={i} position={side.pos} rotation={[0, side.rotation, 0]}>
      {Array.from({ length: Math.ceil(side.width / 0.85) }, (_, j) => {
        const span = (side.width - 0.12) / Math.ceil(side.width / 0.85)
        const x = -side.width / 2 + 0.06 + j * span
        return <group key={j}>
          <FrameBar start={[x, -0.04, -0.055]} end={[x + span, -0.36, -0.055]} radius={0.009} />
          <FrameBar start={[x, -0.36, -0.045]} end={[x + span, -0.04, -0.045]} radius={0.009} />
        </group>
      })}
      <FabricPanel width={side.width} height={VALANCE} texture={side.texture} position={[0, -VALANCE / 2, 0]} />
      {[-0.012, -VALANCE + 0.014].map(y => <mesh key={y} position={[0, y, 0.007]}>
        <boxGeometry args={[side.width, 0.012, 0.008]} />
        <FabricMaterial color={y > -0.1 ? '#36567d' : LIME} />
      </mesh>)}
    </group>)}

    <RoofPanel bottom={w} top={ridge * 2} depth={hd} rotation={0} offset={[0, EAVE, 0]} logo={logoTex} />
    <RoofPanel bottom={w} top={ridge * 2} depth={hd} rotation={Math.PI} offset={[0, EAVE, 0]} logo={logoTex} />
    <RoofPanel bottom={d} top={0} depth={hd} rotation={Math.PI / 2} offset={[ridge, EAVE, 0]} logo={logoTex} />
    <RoofPanel bottom={d} top={0} depth={hd} rotation={-Math.PI / 2} offset={[-ridge, EAVE, 0]} logo={logoTex} />
    {[-1, 1].flatMap(x => [-1, 1].map(z => <FrameBar key={`${x},${z}`} start={[x * legW, EAVE - 0.035, z * legD]} end={[x * ridge, EAVE + PEAK - 0.035, 0]} radius={0.013} />))}
    {ridge > 0 && <FrameBar start={[-ridge, EAVE + PEAK - 0.03, 0]} end={[ridge, EAVE + PEAK - 0.03, 0]} />}
    {walls !== 'none' && <FabricPanel width={w - 0.07} height={EAVE - 0.07} texture={textures[2]} position={[0, EAVE / 2, -hd + 0.035]} />}
    {(walls === 'half' || walls === 'full') && [-1, 1].map(s => {
      const h = walls === 'half' ? 0.95 : EAVE - 0.07
      return <group key={s}>
        <FabricPanel width={d - 0.07} height={h} texture={textures[3]} position={[s * (hw - 0.035), h / 2 + 0.035, 0]} rotation={s * Math.PI / 2} />
        {walls === 'half' && <FrameBar start={[s * legW, h + 0.04, -legD]} end={[s * legW, h + 0.04, legD]} />}
      </group>
    })}
  </group>
}
