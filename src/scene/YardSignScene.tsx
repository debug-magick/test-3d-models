import { useMemo } from 'react'
import { YardSign } from './YardSign'
import type { YardSignSize } from './sizes'

const GRASS_R = 4.2

/** Deterministic PRNG so tuft placement is stable across re-renders. */
function makeRng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

/** A round lawn: flat green disc scattered with low-poly grass tufts. */
function GrassPatch() {
  const tufts = useMemo(() => {
    const rand = makeRng(1337)
    const colors = ['#5f9e43', '#6fae4e', '#7cb85a']
    const out: { pos: [number, number, number]; s: number; color: string }[] = []
    while (out.length < 60) {
      const a = rand() * Math.PI * 2
      const r = 0.55 + rand() * (GRASS_R - 0.85)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      // Keep tufts off the road strip.
      if (Math.abs(z - ROAD_Z) < ROAD_W / 2 + 0.15) continue
      out.push({
        pos: [x, 0.055, z],
        s: 0.7 + rand() * 0.8,
        color: colors[Math.floor(rand() * colors.length)],
      })
    }
    return out
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[GRASS_R, 48]} />
        <meshStandardMaterial color="#71ad50" roughness={1} />
      </mesh>
      {tufts.map((t, i) => (
        <mesh key={i} position={t.pos} scale={t.s}>
          <coneGeometry args={[0.05, 0.14, 5]} />
          <meshStandardMaterial color={t.color} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

const ROAD_Z = 1.7 // road centreline, in front of the sign
const ROAD_W = 1.5 // asphalt width
const ROAD_LEN = 6.8

/** A straight asphalt road running past the sign, with markings. */
function Road() {
  const dashes = useMemo(() => {
    const xs: number[] = []
    for (let x = -2.8; x <= 2.8; x += 0.8) xs.push(x)
    return xs
  }, [])

  const flat: [number, number, number] = [-Math.PI / 2, 0, 0]

  return (
    <group position={[0, 0, ROAD_Z]}>
      {/* Asphalt */}
      <mesh rotation={flat} position={[0, 0.008, 0]} receiveShadow>
        <planeGeometry args={[ROAD_LEN, ROAD_W]} />
        <meshStandardMaterial color="#4a4d52" roughness={1} />
      </mesh>

      {/* Edge lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={flat} position={[0, 0.012, s * (ROAD_W / 2 - 0.09)]}>
          <planeGeometry args={[ROAD_LEN, 0.06]} />
          <meshStandardMaterial color="#e8e9eb" roughness={0.9} />
        </mesh>
      ))}

      {/* Dashed centre line */}
      {dashes.map((x) => (
        <mesh key={x} rotation={flat} position={[x, 0.012, 0]}>
          <planeGeometry args={[0.42, 0.08]} />
          <meshStandardMaterial color="#f0d264" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Standalone yard-sign preview: the sign staked into a lawn by a road. */
export function YardSignScene({
  print,
  size,
  doubleSided,
}: {
  print: HTMLImageElement | null
  size: YardSignSize
  doubleSided: boolean
}) {
  return (
    <group>
      <GrassPatch />
      <Road />
      {/* Slightly enlarged so the sign reads well in the scene,
          turned 60° left toward oncoming traffic. */}
      <group scale={1.5} rotation={[0, Math.PI / 3, 0]}>
        <YardSign print={print} size={size} doubleSided={doubleSided} />
      </group>
    </group>
  )
}
