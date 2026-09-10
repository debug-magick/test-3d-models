import * as THREE from 'three'

/** Brand navy used as the fabric/background colour behind any uploaded print. */
export const NAVY = '#21406b'
export const LIME = '#bcd63e'
export const POLE = '#c7ccd3'

/**
 * Load an image URL into an HTMLImageElement.
 * Returns the element via state so React re-renders when the print changes.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Draw an image onto an offscreen canvas sized to a target aspect ratio, then
 * wrap it in a Three.js texture. This gives every printed panel a clean,
 * correctly-proportioned design with a navy fabric border instead of a
 * stretched/smeared UV map.
 *
 * @param aspect  width / height of the surface the texture maps onto
 * @param mode    'contain' keeps the whole design visible (letterboxed);
 *                'cover' fills the panel, cropping overflow.
 */
export function makeFittedTexture(
  img: HTMLImageElement,
  aspect: number,
  mode: 'contain' | 'cover' = 'contain',
  bg: string = NAVY,
): THREE.CanvasTexture {
  // Size the canvas by area (~1.2 MP) instead of a fixed width, so very wide
  // panels (like the valance band) keep enough vertical resolution.
  const area = 1.2e6
  const w = Math.min(4096, Math.max(2, Math.round(Math.sqrt(area * aspect))))
  const h = Math.min(4096, Math.max(2, Math.round(w / aspect)))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const scale =
    mode === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)
  let dw = iw * scale
  const dh = ih * scale

  // When 'contain' leaves wide side bands (the artwork is much narrower than
  // the panel), gently widen the design toward the panel so it doesn't float
  // in a sea of fabric. Only closes up to ~65% of the empty width, so the
  // image is nudged wider without looking obviously stretched.
  if (mode === 'contain' && dw < w) {
    dw += (w - dw) * 0.65
  }

  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** Sample branding that reads like a finished printed product, at any aspect. */
export function makeBrandTexture(aspect: number, vertical = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = Math.min(2048, Math.round(1024 / aspect))
  const ctx = canvas.getContext('2d')!
  const { width: w, height: h } = canvas
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#294b78'
  ctx.beginPath()
  ctx.moveTo(w * 0.62, h)
  ctx.lineTo(w, h * 0.1)
  ctx.lineTo(w, h)
  ctx.fill()
  ctx.fillStyle = LIME
  ctx.fillRect(0, h * 0.94, w, h * 0.025)
  ctx.save()
  ctx.translate(w / 2, h * 0.48)
  if (vertical) ctx.rotate(-Math.PI / 2)
  const width = vertical ? h * 0.76 : w * 0.73
  const fontSize = Math.min(width / 4.3, (vertical ? w : h) * 0.45)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${fontSize}px Arial, sans-serif`
  ctx.fillText('packeze', 0, 0)
  if (!vertical && aspect < 4) {
    ctx.font = `500 ${fontSize * 0.12}px Arial, sans-serif`
    ctx.fillStyle = '#d3deec'
    ctx.fillText('MAKE YOUR BRAND SEEN.', 0, fontSize * 0.72)
  }
  ctx.restore()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/**
 * Wrap an image (e.g. the Packeze logo) in a texture that keeps its alpha
 * channel, for transparent decals printed onto fabric surfaces.
 */
export function makeAlphaTexture(img: HTMLImageElement): THREE.Texture {
  const tex = new THREE.Texture(img)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/**
 * Normalise ShapeGeometry UVs to the geometry's bounding box (0..1) so a fitted
 * texture maps predictably across an irregular silhouette (e.g. a feather flag).
 * Optionally mirror horizontally so a mirrored flag keeps readable text.
 */
export function normaliseShapeUVs(geometry: THREE.BufferGeometry, flipX = false) {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const min = bb.min
  const size = new THREE.Vector3()
  bb.getSize(size)

  const pos = geometry.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    let u = (pos.getX(i) - min.x) / (size.x || 1)
    const v = (pos.getY(i) - min.y) / (size.y || 1)
    if (flipX) u = 1 - u
    uv[i * 2] = u
    uv[i * 2 + 1] = v
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}
