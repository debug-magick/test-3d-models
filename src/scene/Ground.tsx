import { useMemo } from 'react'

/** Rectangular keep-clear zone (centre + half-extents) for tuft placement. */
export type ClearRect = { x: number; z: number; hw: number; hd: number }

/** Deterministic PRNG so tuft placement is stable across re-renders. */
function makeRng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

/** A round lawn: flat green disc scattered with low-poly grass tufts. */
export function GrassGround({
  radius,
  clear = [],
}: {
  radius: number
  clear?: ClearRect[]
}) {
  const tufts = useMemo(() => {
    const rand = makeRng(1337)
    const colors = ['#5f9e43', '#6fae4e', '#7cb85a']
    const count = Math.round(Math.PI * radius * radius * 1.1)
    const out: { pos: [number, number, number]; s: number; color: string }[] = []
    let guard = count * 20
    while (out.length < count && guard-- > 0) {
      const a = rand() * Math.PI * 2
      const r = 0.4 + rand() * (radius - 0.7)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (clear.some((c) => Math.abs(x - c.x) < c.hw && Math.abs(z - c.z) < c.hd))
        continue
      out.push({
        pos: [x, 0.055, z],
        s: 0.7 + rand() * 0.8,
        color: colors[Math.floor(rand() * colors.length)],
      })
    }
    return out
  }, [radius, clear])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 48]} />
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

/** A round expo-style floor for indoor items like the table cover. */
export function FloorGround({ radius }: { radius: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial color="#d9dce1" roughness={0.7} />
      </mesh>
      {/* Darker rim so the floor reads as a platform, not a hole in the fog */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[radius * 0.97, radius, 64]} />
        <meshStandardMaterial color="#b8bdc6" roughness={0.8} />
      </mesh>
    </group>
  )
}
