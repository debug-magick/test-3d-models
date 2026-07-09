const FT = 0.3048
const INCH = 0.0254

export type TentSize = '10x10' | '10x15' | '10x20'

/** Available canopy footprints (width × depth, feet). */
export const TENT_SIZES: Record<TentSize, { label: string; w: number; d: number }> = {
  '10x10': { label: '10×10 ft', w: 10 * FT, d: 10 * FT },
  '10x15': { label: '10×15 ft', w: 15 * FT, d: 10 * FT },
  '10x20': { label: '10×20 ft', w: 20 * FT, d: 10 * FT },
}

export type YardSignSize = '12x18' | '18x24' | '24x24' | '24x36'

/** Available yard-sign panel sizes (width × height, inches). */
export const YARD_SIGN_SIZES: Record<
  YardSignSize,
  { label: string; w: number; h: number }
> = {
  '12x18': { label: '12×18″', w: 12 * INCH, h: 18 * INCH },
  '18x24': { label: '18×24″', w: 18 * INCH, h: 24 * INCH },
  '24x24': { label: '24×24″', w: 24 * INCH, h: 24 * INCH },
  '24x36': { label: '24×36″', w: 24 * INCH, h: 36 * INCH },
}
