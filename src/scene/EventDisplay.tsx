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

  // Flags frame the tent; the table sits out front — both follow the footprint.
  const flagX = w / 2 + 1.6
  const tableZ = d / 2 + 0.7

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
