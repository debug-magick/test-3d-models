import { useMemo } from 'react'
import * as THREE from 'three'
import { NAVY, POLE, makeAlphaTexture, makeFittedTexture } from './print'

const BW = 0.85 // banner width (~33")
const BH = 2.0 // banner height (~80")
const BASE_H = 0.06 // base thickness
const PANEL_Y = BASE_H // panel bottom sits on the base

/**
 * A retractable roll-up banner stand: a weighted base, a slim back pole and a
 * tall portrait graphic. The print faces +Z; the Packeze logo sits at the top.
 */
export function RollUpBanner({
  print,
  logo = null,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  print: HTMLImageElement | null
  logo?: HTMLImageElement | null
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  const tex = useMemo(
    () => (print ? makeFittedTexture(print, BW / BH, 'contain') : null),
    [print],
  )
  const logoTex = useMemo(() => (logo ? makeAlphaTexture(logo) : null), [logo])

  // BoxGeometry material order: +X, -X, +Y, -Y, +Z (front), -Z (back).
  const panelMats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#c9ccd3', roughness: 0.5 })
    const back = new THREE.MeshStandardMaterial({ color: '#2c2f35', roughness: 0.8 })
    const front = new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : NAVY,
      map: tex,
      roughness: 0.85,
    })
    return [edge, edge, edge, edge, front, back]
  }, [tex])

  return (
    <group position={position} rotation={rotation}>
      {/* Weighted base */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BW + 0.08, BASE_H, 0.3]} />
        <meshStandardMaterial color="#33363c" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Rounded end caps on the base */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (BW / 2 + 0.04), BASE_H / 2, 0]}>
          <cylinderGeometry args={[BASE_H / 2, BASE_H / 2, 0.3, 16]} />
          <meshStandardMaterial color="#33363c" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Slim back support pole */}
      <mesh position={[BW / 2 - 0.05, PANEL_Y + BH / 2, -0.06]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, BH, 12]} />
        <meshStandardMaterial color={POLE} metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Graphic panel */}
      <mesh
        position={[0, PANEL_Y + BH / 2, 0]}
        material={panelMats}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BW, BH, 0.02]} />
      </mesh>

      {/* Aluminium top rail */}
      <mesh position={[0, PANEL_Y + BH + 0.015, 0]}>
        <boxGeometry args={[BW + 0.03, 0.03, 0.05]} />
        <meshStandardMaterial color={POLE} metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Packeze logo near the top of the graphic */}
      {logoTex && (
        <mesh position={[0, PANEL_Y + BH * 0.88, 0.012]}>
          <planeGeometry args={[0.34, 0.34]} />
          <meshStandardMaterial map={logoTex} transparent alphaTest={0.05} roughness={0.85} />
        </mesh>
      )}
    </group>
  )
}
