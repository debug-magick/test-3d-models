import { useMemo } from 'react'
import * as THREE from 'three'

const BODY = '#1b1c1e' // satin-black barrel

// Real-world dimensions in metres, bottom (nib) to top (stylus).
const R = 0.0045 // barrel radius
const TIP_H = 0.014 // tapered metal nib
const GRIP_H = 0.054 // lower barrel
const RING_H = 0.008 // chrome band at the mid junction
const BODY_H = 0.05 // upper barrel — carries the print
const COLLAR_H = 0.007 // chrome collar under the stylus
export const PEN_L = TIP_H + GRIP_H + RING_H + BODY_H + COLLAR_H + 0.011

/**
 * Wrap the print around the upper barrel: canvas u runs around the
 * circumference, v along the pen, and the artwork is drawn rotated 90° so it
 * reads along the pen's length (like a real barrel imprint).
 */
function makeBarrelTexture(img: HTMLImageElement, circum: number, len: number) {
  const h = 1024 // along the pen
  const w = Math.max(2, Math.round((h * circum) / len)) // around
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BODY
  ctx.fillRect(0, 0, w, h)

  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 2)
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  // Fit within 80% of the length and 55% of the circumference.
  const s = Math.min((h * 0.8) / iw, (w * 0.55) / ih)
  ctx.drawImage(img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

const chrome = { color: '#cfd4da', metalness: 1, roughness: 0.15 }
const GRIP = '#2f5aa8' // coloured grip on the writing end (easier to read than black)
const LIME = '#bcd63e' // accent ring by the nib

// Resting pose: nib points toward the camera, the back lifts off the desk.
const YAW = Math.PI - 0.6
const TILT = 0.17 // raises the stylus (back) end
const LIFT = R + 0.0018 + Math.sin(TILT) * (PEN_L / 2)

/** A stylus ballpoint pen resting on the surface, print on the upper barrel. */
export function Pen({ print }: { print: HTMLImageElement | null }) {
  const tex = useMemo(
    () => (print ? makeBarrelTexture(print, 2 * Math.PI * R, BODY_H) : null),
    [print],
  )

  // Segment centres, stacking bottom-up from y=0.
  const grip = TIP_H + GRIP_H / 2
  const ring = TIP_H + GRIP_H + RING_H / 2
  const body = TIP_H + GRIP_H + RING_H + BODY_H / 2
  const collar = TIP_H + GRIP_H + RING_H + BODY_H + COLLAR_H / 2
  const stylus = collar + COLLAR_H / 2 + 0.005

  return (
    // Built along +Y (nib→stylus); centred, tilted so the back lifts, then
    // laid on its side (clip up) and yawed so the nib faces the camera.
    <group position={[0, LIFT, 0]} rotation={[0, YAW, 0]}>
      <group rotation={[0, 0, -Math.PI / 2 + TILT]}>
        <group position={[0, -PEN_L / 2, 0]}>
        {/* Tapered nib */}
        <mesh position={[0, TIP_H / 2, 0]} castShadow>
          <cylinderGeometry args={[0.001, R, TIP_H, 32]} />
          <meshStandardMaterial {...chrome} roughness={0.3} />
        </mesh>

        {/* Lime accent ring at the nib */}
        <mesh position={[0, TIP_H + 0.003, 0]}>
          <cylinderGeometry args={[R * 1.05, R * 1.05, 0.008, 32]} />
          <meshStandardMaterial color={LIME} roughness={0.4} />
        </mesh>

        {/* Lower barrel — coloured grip */}
        <mesh position={[0, grip, 0]} castShadow>
          <cylinderGeometry args={[R, R, GRIP_H, 32]} />
          <meshStandardMaterial color={GRIP} metalness={0.15} roughness={0.5} />
        </mesh>

        {/* Chrome mid band */}
        <mesh position={[0, ring, 0]}>
          <cylinderGeometry args={[R * 1.03, R * 1.03, RING_H, 32]} />
          <meshStandardMaterial {...chrome} />
        </mesh>

        {/* Upper barrel with the wrapped print */}
        <mesh position={[0, body, 0]} castShadow>
          <cylinderGeometry args={[R, R, BODY_H, 32]} />
          <meshStandardMaterial
            color={tex ? '#ffffff' : BODY}
            map={tex}
            metalness={0.25}
            roughness={0.45}
          />
        </mesh>

        {/* Chrome collar */}
        <mesh position={[0, collar, 0]}>
          <cylinderGeometry args={[R * 1.02, R * 1.02, COLLAR_H, 32]} />
          <meshStandardMaterial {...chrome} />
        </mesh>

        {/* Rubber stylus tip */}
        <mesh position={[0, stylus, 0]} scale={[1, 1.25, 1]} castShadow>
          <sphereGeometry args={[R * 1.05, 24, 16]} />
          <meshStandardMaterial color="#101113" roughness={0.9} />
        </mesh>

        {/* Clip — local -X maps to world "up" once the pen lies down */}
        <mesh position={[-(R + 0.0011), body + 0.006, 0]}>
          <boxGeometry args={[0.0014, 0.04, 0.0028]} />
          <meshStandardMaterial {...chrome} roughness={0.25} />
        </mesh>
        <mesh position={[-(R * 0.6), body + 0.0255, 0]}>
          <boxGeometry args={[R + 0.0016, 0.003, 0.0028]} />
          <meshStandardMaterial {...chrome} roughness={0.25} />
        </mesh>
        </group>
      </group>
    </group>
  )
}
