import { Canopy, type WallMode } from './Canopy'
import { TENT_SIZES, type TentSize } from './sizes'
import { Flag } from './Flag'
import { TableCover } from './TableCover'

/** The full event-display kit: canopy tent, a matched pair of 12 ft flags,
 *  and a table cover — all printed with the same uploaded artwork. */
export function EventDisplay({
  print,
  logo,
  tentSize = '10x10',
  walls = 'none',
}: {
  print: HTMLImageElement | null
  logo: HTMLImageElement | null
  tentSize?: TentSize
  walls?: WallMode
}) {
  const { w, d } = TENT_SIZES[tentSize]

  // Keep the table clear of the extra front leg on the wider frames.
  const flagX = w / 2 + 0.7
  const tableZ = w > 4 ? d / 2 + 0.55 : d / 2 - 0.38

  return (
    <group>
      <Canopy print={print} logo={logo} size={tentSize} walls={walls} />

      <Flag print={print} logo={logo} size="12ft" position={[-flagX, 0, -0.2]} side={-1} />
      <Flag print={print} logo={logo} size="12ft" position={[flagX, 0, -0.2]} side={1} />

      {/* Table sits in front of the tent, facing the camera. */}
      <group position={[0, 0, tableZ]}>
        <TableCover print={print} />
      </group>
    </group>
  )
}
