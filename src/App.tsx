import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFSoftShadowMap, MathUtils } from 'three'
import { EventDisplay } from './scene/EventDisplay'
import { PremiumKit } from './scene/PremiumKit'
import { Canopy, type WallMode } from './scene/Canopy'
import { Flag, type FlagShape } from './scene/Flag'
import { TableCover } from './scene/TableCover'
import { YardSign } from './scene/YardSign'
import { Pen } from './scene/Pen'
import { GrassGround, WorldGround, type EnvironmentMode } from './scene/Ground'
import { Lighting } from './scene/Lighting'
import { CameraRig, type Framing } from './scene/CameraRig'
import { WindContext, WindState } from './scene/motion'
import { FLAG_SIZES, TENT_SIZES, YARD_SIGN_SIZES, type FlagSize, type TentSize, type YardSignSize } from './scene/sizes'
import { loadImage } from './scene/print'
import logoUrl from './assets/packeze-favicon.webp'
import sampleUrl from './assets/event-display/Screenshot 2026-05-26 at 6.00.32 PM 2-1781915438822(1).png'
import './App.css'

const ZOOM_MIN = 0.55, ZOOM_MAX = 1.8
const MODELS = {
  kit: { label: 'Full kit', title: 'Your next event. Reimagined.', detail: 'Canopy, feather flags & fitted table cover', number: '01' },
  premium: { label: 'Premium kit', title: 'Make a bigger impression.', detail: '10 × 20 ft canopy, flags, banners & two tables', number: '02' },
  canopy: { label: 'Canopy tent', title: 'A space of your own.', detail: 'Printed canopy with an aluminum folding frame', number: '03' },
  flag: { label: 'Flag', title: 'Made to stand out.', detail: 'Lightweight printed fabric & a flexible pole', number: '04' },
  table: { label: 'Table cover', title: 'Every detail, covered.', detail: '6 ft stretch-fit cover with tensioned corners', number: '05' },
  yard: { label: 'Yard sign', title: 'Get your message out there.', detail: 'Corrugated sign panel & galvanized wire stake', number: '06' },
  pen: { label: 'Stylus pen', title: 'A little everyday impact.', detail: 'Printed barrel, chrome accents & a soft stylus', number: '07' },
}
type ModelKey = keyof typeof MODELS
const WALLS: { key: WallMode; label: string }[] = [{ key: 'none', label: 'Open' }, { key: 'back', label: 'Back wall' }, { key: 'half', label: 'Side skirts' }, { key: 'full', label: 'Full walls' }]
const SPEEDS = { slow: 0.25, normal: 0.55, fast: 1.1 }
const TABLE_CLEAR = [{ x: 0, z: 0, hw: 1, hd: 0.5 }]
const PREMIUM_CLEAR = [{ x: 0, z: 1.35, hw: 2.2, hd: 0.6 }, { x: 5.55, z: 0.5, hw: 0.6, hd: 0.3 }, { x: -5.55, z: 0.5, hw: 0.6, hd: 0.3 }]

function Icon({ name, size = 18 }: { name: 'upload' | 'rotate' | 'reset' | 'sun' | 'studio' | 'arrow' | 'pause' | 'check'; size?: number }) {
  const paths = {
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></>,
    rotate: <><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" /></>,
    reset: <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" /></>,
    studio: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5m-9 5v9" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Choices<T extends string>({ value, options, onChange, columns = 2 }: { value: T; options: { key: T; label: string }[]; onChange: (value: T) => void; columns?: number }) {
  return <div className="selector" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {options.map(option => <button key={option.key} className={value === option.key ? 'sel on' : 'sel'} aria-pressed={value === option.key} onClick={() => onChange(option.key)}>{option.label}</button>)}
  </div>
}

function Wind({ enabled, reducedMotion, children }: { enabled: boolean; reducedMotion: boolean; children: ReactNode }) {
  const wind = useMemo(() => new WindState(), [])
  const invalidate = useThree(state => state.invalidate)
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    wind.update(dt, enabled, reducedMotion)
    if (enabled || wind.strength.value > 0.001) invalidate()
  })
  return <WindContext.Provider value={wind}>{children}</WindContext.Provider>
}

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="preview-error"><Icon name="studio" size={32} /><h2>The 3D preview couldn’t start.</h2><p>Try reloading in a browser with WebGL enabled.</p><button className="sel" onClick={() => window.location.reload()}>Reload preview</button></div> : this.props.children
  }
}

export default function App() {
  const [printImage, setPrintImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('Packeze sample branding')
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [autoRotate, setAutoRotate] = useState(true)
  const [breeze, setBreeze] = useState(true)
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('normal')
  const [model, setModel] = useState<ModelKey>('kit')
  const [active, setActive] = useState<ModelKey>('kit')
  const [tentSize, setTentSize] = useState<TentSize>('10x10')
  const [walls, setWalls] = useState<WallMode>('none')
  const [flagShape, setFlagShape] = useState<FlagShape>('feather')
  const [flagSize, setFlagSize] = useState<FlagSize>('10ft')
  const [yardSize, setYardSize] = useState<YardSignSize>('18x24')
  const [yardDoubleSided, setYardDoubleSided] = useState(true)
  const [environment, setEnvironment] = useState<EnvironmentMode>('studio')
  const [reset, setReset] = useState(0)
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, 1.5))
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)
  const uploadSequence = useRef(0)
  const mounted = useRef(true)
  const viewport = useRef<HTMLDivElement>(null)
  const touch = useRef<{ distance: number; zoom: number } | null>(null)

  useEffect(() => {
    let live = true
    mounted.current = true
    loadImage(logoUrl).then(image => { if (live) setLogo(image) }).catch(() => {})
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(query.matches)
    query.addEventListener('change', change)
    return () => { live = false; mounted.current = false; query.removeEventListener('change', change) }
  }, [])
  useEffect(() => {
    if (model === active) return
    const timeout = window.setTimeout(() => { setActive(model); setZoom(1) }, reducedMotion ? 0 : 180)
    return () => window.clearTimeout(timeout)
  }, [model, active, reducedMotion])
  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const wheel = (event: WheelEvent) => {
      if (!(event.target instanceof HTMLCanvasElement)) return
      event.preventDefault()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1)
      setZoom(z => MathUtils.clamp(z * Math.exp(-MathUtils.clamp(delta, -180, 180) * 0.0014), ZOOM_MIN, ZOOM_MAX))
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [])

  async function applyArtwork(url: string, name: string, revoke = false) {
    const request = ++uploadSequence.current
    setLoading(true)
    setUploadError('')
    try {
      const image = await loadImage(url)
      if (mounted.current && request === uploadSequence.current) { setPrintImage(image); setFileName(name) }
    } catch {
      if (mounted.current && request === uploadSequence.current) setUploadError('This image couldn’t be opened. Try a PNG, JPG or WebP file.')
    } finally {
      if (revoke) URL.revokeObjectURL(url)
      if (mounted.current && request === uploadSequence.current) setLoading(false)
    }
  }
  function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setUploadError('Choose a PNG, JPG or WebP image under 20 MB.')
      return
    }
    void applyArtwork(URL.createObjectURL(file), file.name, true)
  }

  const framing: Framing = useMemo(() => {
    if (active === 'pen') return { target: [0, 0.016, 0], radius: 0.075, width: 0.145, height: 0.025, depth: 0.04 }
    if (active === 'table') return { target: [0, 0.4, 0], radius: 1.05, width: 1.83, height: 0.74, depth: 0.76 }
    if (active === 'yard') { const s = YARD_SIGN_SIZES[yardSize]; return { target: [0, 0.2 + s.h / 2, 0], radius: Math.hypot(s.w / 2, (s.h + 0.3) / 2), width: s.w, height: s.h + 0.3, depth: 0.02 } }
    if (active === 'flag') { const h = FLAG_SIZES[flagSize].h; return { target: [h * 0.08, h / 2, 0], radius: h * 0.54, width: h * 0.32, height: h, depth: 0.4 } }
    if (active === 'premium') return { target: [0, 1.6, 0], radius: 6.2, width: 12, height: 3.66, depth: 3.05 }
    const half = TENT_SIZES[tentSize].w / 2
    return { target: [0, 1.6, 0], radius: active === 'kit' ? Math.hypot(half + 1.4, 1.6) : Math.hypot(half, 1.65, 0.6), width: active === 'kit' ? half * 2 + 2.9 : half * 2, height: active === 'kit' ? 3.66 : 3.3, depth: active === 'kit' && half > 2 ? 4.5 : 3.05 }
  }, [active, tentSize, flagSize, yardSize])
  const kitClear = useMemo(() => [{ x: 0, z: TENT_SIZES[tentSize].w > 4 ? 2.074 : 1.144, hw: 1.1, hd: 0.6 }], [tentSize])
  const description = MODELS[active]
  const small = active === 'pen'
  const hasFlag = active === 'kit' || active === 'premium' || active === 'flag'
  const groundRadius = active === 'premium' ? 8 : active === 'kit' ? TENT_SIZES[tentSize].w / 2 + 3 : active === 'canopy' ? 5 : 3
  const tent = ['kit', 'premium', 'canopy'].includes(model)
  const dimension = active === 'premium' ? '10 × 20 ft' : active === 'kit' || active === 'canopy' ? TENT_SIZES[tentSize].label : active === 'flag' ? FLAG_SIZES[flagSize].label : active === 'yard' ? YARD_SIGN_SIZES[yardSize].label : active === 'table' ? '6 ft' : '14 cm'
  const shadowKey = [active, tentSize, walls, flagSize, flagShape, yardSize, environment].join('-')

  return <div className="app">
    <header className="app-header">
      <a className="brand" href="https://packeze.com" target="_blank" rel="noreferrer"><img src={logoUrl} alt="" /><span>packeze<span className="brand-dot">.</span></span></a>
      <span className="header-divider" /><span className="header-label">3D product studio</span>
      <a className="catalog-link" href="https://packeze.com/custom-tents" target="_blank" rel="noreferrer">Explore products <Icon name="arrow" size={16} /></a>
    </header>
    <div className="workspace">
      <aside className="panel" aria-label="Product configuration">
        <div className="panel-heading"><span className="eyebrow">MAKE IT YOURS</span><h1>Build your display</h1><p>A closer look at your next big idea.</p></div>
        <section className="field"><h2><span className="step">01</span> Choose your product</h2>
          <Choices value={model} options={(Object.keys(MODELS) as ModelKey[]).map(key => ({ key, label: MODELS[key].label }))} onChange={setModel} />
        </section>
        <section className="field"><h2><span className="step">02</span> The details</h2>
          {tent && <>
            {model !== 'premium' && <div className="subfield"><span className="field-label">Footprint</span><Choices value={tentSize} options={(Object.keys(TENT_SIZES) as TentSize[]).map(key => ({ key, label: TENT_SIZES[key].label }))} onChange={setTentSize} columns={3} /></div>}
            <div className="subfield"><span className="field-label">Wall configuration</span><Choices value={walls} options={WALLS} onChange={setWalls} /></div>
          </>}
          {model === 'flag' && <>
            <div className="subfield"><span className="field-label">Shape</span><Choices value={flagShape} options={[{ key: 'feather', label: 'Feather' }, { key: 'teardrop', label: 'Teardrop' }, { key: 'rectangle', label: 'Rectangle' }]} onChange={setFlagShape} columns={3} /></div>
            <div className="subfield"><span className="field-label">Height</span><Choices value={flagSize} options={(Object.keys(FLAG_SIZES) as FlagSize[]).map(key => ({ key, label: FLAG_SIZES[key].label }))} onChange={setFlagSize} columns={3} /></div>
          </>}
          {model === 'yard' && <>
            <div className="subfield"><span className="field-label">Sign size</span><Choices value={yardSize} options={(Object.keys(YARD_SIGN_SIZES) as YardSignSize[]).map(key => ({ key, label: YARD_SIGN_SIZES[key].label }))} onChange={setYardSize} /></div>
            <div className="subfield"><span className="field-label">Print sides</span><Choices value={yardDoubleSided ? 'double' : 'single'} options={[{ key: 'single', label: 'Single-sided' }, { key: 'double', label: 'Double-sided' }]} onChange={value => setYardDoubleSided(value === 'double')} /></div>
          </>}
          {(model === 'table' || model === 'pen' || model === 'premium') && <p className="detail-note">{MODELS[model].detail}.</p>}
        </section>
        <section className="field artwork-field"><h2><span className="step">03</span> Add your artwork</h2>
          <label className="upload-btn"><Icon name="upload" size={23} /><strong>{loading ? 'Opening artwork…' : 'Upload your design'}</strong><span>PNG, JPG or WebP · up to 20 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} aria-label="Upload your design" /></label>
          <div className="file-status" aria-live="polite"><span className="status-dot" /><span title={fileName}>{fileName}</span>{printImage && <button onClick={() => { uploadSequence.current++; setPrintImage(null); setFileName('Packeze sample branding'); setUploadError(''); setLoading(false) }} aria-label="Remove artwork">×</button>}</div>
          {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
          <button className="text-button" onClick={() => void applyArtwork(sampleUrl, 'Gutter Guardian sample')}>Try sample artwork <Icon name="arrow" size={14} /></button>
        </section>
        <div className="panel-note"><Icon name="check" size={16} /><span>Your artwork stays in this browser.</span></div>
      </aside>

      <main className={`stage ${environment}`} ref={viewport} aria-label="Interactive 3D product preview"
        onTouchStart={event => { if (event.touches.length === 2) touch.current = { distance: Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY), zoom } }}
        onTouchMove={event => { if (event.touches.length === 2 && touch.current) { const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY); setZoom(MathUtils.clamp(touch.current.zoom * distance / Math.max(1, touch.current.distance), ZOOM_MIN, ZOOM_MAX)) } }}
        onTouchEnd={() => { touch.current = null }}>
        <div className="stage-heading"><span className="eyebrow">THE {description.label.toUpperCase()} / {description.number}</span><h2>{description.title}</h2><p>{description.detail}</p></div>
        <div className="environment-switch" aria-label="Environment">
          <button className={environment === 'studio' ? 'active' : ''} aria-pressed={environment === 'studio'} onClick={() => setEnvironment('studio')}><Icon name="studio" size={16} />Studio</button>
          <button className={environment === 'outdoor' ? 'active' : ''} aria-pressed={environment === 'outdoor'} onClick={() => setEnvironment('outdoor')}><Icon name="sun" size={17} />Outdoor</button>
        </div>
        <div className="canvas-wrap">
          <PreviewBoundary><Canvas frameloop="demand" scene={{ environmentIntensity: 0.3 }} shadows={{ type: PCFSoftShadowMap }} dpr={dpr} camera={{ fov: 38, position: [5, 4, 12], near: 0.002, far: 250 }} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}>
            <PerformanceMonitor onDecline={() => setDpr(1)} flipflops={2} onFallback={() => setDpr(1)} />
            <Lighting mode={environment} extent={framing.radius * 1.4} small={small} />
            <WorldGround mode={environment} small={small} />
            {environment === 'outdoor' && !small && <GrassGround radius={groundRadius} clear={active === 'kit' ? kitClear : active === 'premium' ? PREMIUM_CLEAR : active === 'table' ? TABLE_CLEAR : undefined} />}
            <Wind enabled={hasFlag && breeze && !reducedMotion} reducedMotion={reducedMotion}>
              {active === 'kit' && <EventDisplay print={printImage} logo={logo} tentSize={tentSize} walls={walls} />}
              {active === 'premium' && <PremiumKit print={printImage} logo={logo} walls={walls} />}
              {active === 'canopy' && <Canopy print={printImage} logo={logo} size={tentSize} walls={walls} />}
              {active === 'flag' && <Flag print={printImage} logo={logo} position={[0, 0, 0]} shape={flagShape} size={flagSize} />}
              {active === 'table' && <TableCover print={printImage} />}
              {active === 'yard' && <YardSign print={printImage} logo={logo} size={yardSize} doubleSided={yardDoubleSided} />}
              {active === 'pen' && <Pen print={printImage} />}
            </Wind>
            <ContactShadows key={shadowKey} frames={1} position={[0, 0.0001, 0]} opacity={environment === 'studio' ? 0.3 : 0.2} scale={framing.radius * 3.5} resolution={512} blur={2.5} far={small ? 0.08 : 4} color="#49453e" />
            <CameraRig framing={framing} zoom={zoom} rotate={autoRotate} speed={SPEEDS[speed]} reset={reset} modelKey={active} reducedMotion={reducedMotion} />
          </Canvas></PreviewBoundary>
          <div className={`scene-veil ${model !== active ? 'visible' : ''}`} />
        </div>
        <div className="product-caption"><span className="caption-line" /><span>{description.label}</span><span className="dimension">{dimension}</span></div>
        <div className="view-toolbar">
          <button className={`rotate-button ${autoRotate && !reducedMotion ? 'active' : ''}`} aria-pressed={autoRotate && !reducedMotion} disabled={reducedMotion} onClick={() => setAutoRotate(value => !value)}><Icon name={autoRotate && !reducedMotion ? 'pause' : 'rotate'} size={16} /><span>{autoRotate && !reducedMotion ? 'Pause rotation' : 'Auto-rotate'}</span></button>
          <label className="speed-control"><span className="sr-only">Rotation speed</span><select aria-label="Rotation speed" value={speed} onChange={event => setSpeed(event.target.value as keyof typeof SPEEDS)}><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></label>
          <span className="toolbar-divider" />
          <label className="zoom-control"><span>Zoom</span><input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={zoom} aria-label="Zoom" onChange={event => setZoom(Number(event.target.value))} /><output>{Math.round(zoom * 100)}%</output></label>
          <button className="reset-button" title="Reset view" aria-label="Reset view" onClick={() => { setZoom(1); setReset(value => value + 1) }}><Icon name="reset" size={18} /></button>
        </div>
        <div className="stage-footer"><span>{reducedMotion ? 'Reduced motion enabled' : 'Drag to explore'}<span className="footer-dot">·</span>Scroll or pinch to zoom</span>{hasFlag && <label className="breeze-control"><input type="checkbox" checked={breeze && !reducedMotion} disabled={reducedMotion} onChange={event => setBreeze(event.target.checked)} />Gentle breeze</label>}</div>
      </main>
    </div>
  </div>
}
