import { useMemo } from 'react'
import * as THREE from 'three'
import { makeBrandTexture, makeFittedTexture } from './print'
import { FabricMaterial, FrameBar } from './materials'
import { useDispose } from './resources'

const W = 0.85, H = 2

export function RollUpBanner({ print, position = [0, 0, 0], rotation = [0, 0, 0] }: {
  print: HTMLImageElement | null; logo?: HTMLImageElement | null
  position?: [number, number, number]; rotation?: [number, number, number]
}) {
  const texture = useMemo(() => print ? makeFittedTexture(print, W / H) : makeBrandTexture(W / H, true), [print])
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, H, 16, 48)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getY(i) / H + 0.5) * Math.PI) * 0.018)
    g.computeVertexNormals()
    return g
  }, [])
  useDispose(texture)
  useDispose(geometry)
  return <group position={position} rotation={rotation}>
    {[-0.28, 0.28].map(x => <mesh key={x} position={[x, 0.013, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.055, 0.026, 0.42]} />
      <meshStandardMaterial color="#b3bbc1" metalness={0.9} roughness={0.3} />
    </mesh>)}
    <mesh position={[0, 0.065, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 2.1]} castShadow receiveShadow>
      <cylinderGeometry args={[0.05, 0.05, W + 0.07, 24]} />
      <meshStandardMaterial color="#bec5ca" metalness={0.85} roughness={0.32} />
    </mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 + 0.04), 0.065, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 2.1]}>
      <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
      <meshStandardMaterial color="#353a40" roughness={0.7} />
    </mesh>)}
    <FrameBar start={[0, 0.07, -0.07]} end={[0, H + 0.1, -0.07]} radius={0.011} />
    <mesh geometry={geometry} position={[0, H / 2 + 0.1, 0]} castShadow receiveShadow>
      <FabricMaterial map={texture} color="white" roughness={0.76} sheen={0.1} />
    </mesh>
    <mesh position={[0, H + 0.1, 0]} castShadow>
      <boxGeometry args={[W + 0.015, 0.022, 0.027]} />
      <meshStandardMaterial color="#c9cfd4" metalness={0.9} roughness={0.26} />
    </mesh>
  </group>
}
