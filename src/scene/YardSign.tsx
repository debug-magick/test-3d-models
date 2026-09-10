import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { makeAlphaTexture, makeFittedTexture } from './print'
import { FrameBar } from './materials'
import { useDispose } from './resources'
import { YARD_SIGN_SIZES, type YardSignSize } from './sizes'

const THICKNESS = 0.004
const LIFT = 0.3

export function YardSign({ print, logo = null, size = '18x24', doubleSided = true }: {
  print: HTMLImageElement | null; logo?: HTMLImageElement | null
  size?: YardSignSize; doubleSided?: boolean
}) {
  const { w, h } = YARD_SIGN_SIZES[size]
  const texture = useMemo(() => print ? makeFittedTexture(print, w / h, 'contain', '#ffffff') : null, [print, w, h])
  const logoTexture = useMemo(() => logo ? makeAlphaTexture(logo) : null, [logo])
  const ribs = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const count = Math.ceil(w / 0.005)
    for (let i = 0; i <= count; i++) {
      const g = new THREE.BoxGeometry(0.0005, h, THICKNESS)
      g.translate(-w / 2 + i * w / count, LIFT + h / 2, 0)
      parts.push(g)
    }
    const geometry = mergeGeometries(parts)
    parts.forEach(g => g.dispose())
    return geometry
  }, [w, h])
  useDispose(texture)
  useDispose(logoTexture)
  useDispose(ribs)
  const stakeXs = w > 0.75 ? [-w * 0.24, w * 0.24] : [0]
  const logoSize = Math.min(w, h) * 0.48
  return <group>
    {stakeXs.map(x => <group key={x}>
      {[-0.127, 0.127].map(offset => <FrameBar key={offset} start={[x + offset, -0.03, 0]} end={[x + offset, LIFT + h * 0.55, 0]} radius={0.0019} color="#aeb7bf" />)}
      {[0.11, 0.24].map(y => <FrameBar key={y} start={[x - 0.127, y, 0]} end={[x + 0.127, y, 0]} radius={0.0019} color="#aeb7bf" />)}
    </group>)}
    <mesh geometry={ribs} castShadow><meshStandardMaterial color="#d1d4d3" roughness={0.65} /></mesh>
    {[1, -1].map(side => <group key={side} position={[0, LIFT + h / 2, side * THICKNESS / 2]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial key={`${texture?.uuid}-${doubleSided}`} map={side === 1 || doubleSided ? texture : null} color="#f7f7f5" side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      {!texture && logoTexture && (side === 1 || doubleSided) && <mesh position={[0, 0, 0.0002]}>
        <planeGeometry args={[logoSize, logoSize]} />
        <meshStandardMaterial map={logoTexture} transparent alphaTest={0.05} roughness={0.6} depthWrite={false} />
      </mesh>}
    </group>)}
  </group>
}
