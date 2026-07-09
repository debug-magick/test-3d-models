import { Canopy, type WallMode } from './Canopy'
import { Flag } from './Flag'
import { TableCover } from './TableCover'
import { RollUpBanner } from './RollUpBanner'
import { TENT_SIZES } from './sizes'

const SIZE = '10x20' as const

/**
 * The premium event-display kit: a wide 10×20 canopy (optionally walled), a
 * matched pair of feather flags, two roll-up banner stands framing the outside,
 * and two front table covers. Everything shares the same artwork; the Packeze
 * logo is preserved on the tent, flags and banners.
 */
export function PremiumKit({
  print,
  logo,
  walls = 'back',
}: {
  print: HTMLImageElement | null
  logo: HTMLImageElement | null
  walls?: WallMode
}) {
  const { w, d } = TENT_SIZES[SIZE]
  const halfW = w / 2
  const halfD = d / 2

  const flagX = halfW + 1.2
  const bannerX = halfW + 2.5
  const tableZ = halfD - 0.15

  return (
    <group>
      <Canopy print={print} logo={logo} size={SIZE} walls={walls} />

      {/* Feather flags flank the tent. */}
      <Flag print={print} logo={logo} size="12ft" position={[-flagX, 0, 0.1]} side={-1} />
      <Flag print={print} logo={logo} size="12ft" position={[flagX, 0, 0.1]} side={1} />

      {/* Roll-up banner stands on the outer edges. */}
      <RollUpBanner print={print} logo={logo} position={[-bannerX, 0, 0.5]} />
      <RollUpBanner print={print} logo={logo} position={[bannerX, 0, 0.5]} />

      {/* Two table covers side by side at the front of the tent. */}
      <group position={[-1.05, 0, tableZ]}>
        <TableCover print={print} />
      </group>
      <group position={[1.05, 0, tableZ]}>
        <TableCover print={print} />
      </group>
    </group>
  )
}
