import { Canopy } from './Canopy'
import { TENT_SIZES, type TentSize } from './sizes'
import { FeatherFlag } from './FeatherFlag'
import { TableCover } from './TableCover'

/** The full event-display kit: canopy tent, a matched pair of feather flags,
 *  and a table cover — all printed with the same uploaded artwork. */
export function EventDisplay({
  print,
  logo,
  tentSize = '10x10',
}: {
  print: HTMLImageElement | null
  logo: HTMLImageElement | null
  tentSize?: TentSize
}) {
  const { w, d } = TENT_SIZES[tentSize]

  // Flags frame the tent; the table sits out front — both follow the footprint.
  const flagX = w / 2 + 1.6
  const tableZ = d / 2 + 0.7

  return (
    <group>
      <Canopy print={print} logo={logo} size={tentSize} />

      <FeatherFlag print={print} logo={logo} position={[-flagX, 0, -0.2]} side={-1} />
      <FeatherFlag print={print} logo={logo} position={[flagX, 0, -0.2]} side={1} />

      {/* Table sits in front of the tent, facing the camera. */}
      <group position={[0, 0, tableZ]}>
        <TableCover print={print} />
      </group>
    </group>
  )
}
