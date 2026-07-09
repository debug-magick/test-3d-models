import { useMemo } from 'react'
import * as THREE from 'three'
import { NAVY, makeFittedTexture } from './print'

const W = 1.9 // table width
const D = 0.8 // table depth
const H = 0.74 // table height

/**
 * A stretch-fit table cover: a draped box with the print on the front panel
 * (facing +Z, toward the camera) and the top, sides in plain navy fabric.
 */
export function TableCover({ print }: { print: HTMLImageElement | null }) {
  const frontTex = useMemo(
    () => (print ? makeFittedTexture(print, W / H, 'contain') : null),
    [print],
  )

  // BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z.
  const materials = useMemo(() => {
    const navy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.9 })
    const front = new THREE.MeshStandardMaterial({
      color: frontTex ? '#ffffff' : NAVY,
      map: frontTex,
      roughness: 0.9,
    })
    return [navy, navy, navy.clone(), navy, front, navy]
  }, [frontTex])

  return (
    <mesh position={[0, H / 2, 0]} material={materials} castShadow receiveShadow>
      <boxGeometry args={[W, H, D]} />
    </mesh>
  )
}
