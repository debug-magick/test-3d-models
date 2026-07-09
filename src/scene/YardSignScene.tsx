import { useMemo } from 'react'
import { YardSign } from './YardSign'
import { GrassGround, type ClearRect } from './Ground'
import type { YardSignSize } from './sizes'

const GRASS_R = 4.2

const ROAD_Z = 1.7 // road centreline, in front of the sign
const ROAD_W = 1.5 // asphalt width
const ROAD_LEN = 6.8

/** Keep grass tufts off the asphalt. */
const ROAD_CLEAR: ClearRect[] = [
  { x: 0, z: ROAD_Z, hw: ROAD_LEN, hd: ROAD_W / 2 + 0.15 },
]

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
  logo = null,
  size,
  doubleSided,
}: {
  print: HTMLImageElement | null
  logo?: HTMLImageElement | null
  size: YardSignSize
  doubleSided: boolean
}) {
  return (
    <group>
      <GrassGround radius={GRASS_R} clear={ROAD_CLEAR} />
      <Road />
      {/* Slightly enlarged so the sign reads well in the scene,
          turned 60° left toward oncoming traffic. */}
      <group scale={1.5} rotation={[0, Math.PI / 3, 0]}>
        <YardSign print={print} logo={logo} size={size} doubleSided={doubleSided} />
      </group>
    </group>
  )
}
