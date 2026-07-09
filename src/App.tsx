import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { Group } from 'three'
import { EventDisplay } from './scene/EventDisplay'
import { PremiumKit } from './scene/PremiumKit'
import { Canopy, type WallMode } from './scene/Canopy'
import { Flag, type FlagShape } from './scene/Flag'
import { TableCover } from './scene/TableCover'
import { YardSignScene } from './scene/YardSignScene'
import { Pen } from './scene/Pen'
import { FloorGround, GrassGround, type ClearRect } from './scene/Ground'
import {
  FLAG_SIZES,
  TENT_SIZES,
  YARD_SIGN_SIZES,
  type FlagSize,
  type TentSize,
  type YardSignSize,
} from './scene/sizes'
import { loadImage } from './scene/print'
import logoUrl from './assets/packeze-favicon.webp'
import './App.css'

const SCALE_MIN = 0.4
const SCALE_MAX = 2.2

type ModelKey = 'kit' | 'premium' | 'canopy' | 'flag' | 'table' | 'yard' | 'pen'

/** Per-model camera framing so each preview opens nicely composed. */
const MODELS: Record<
  ModelKey,
  { label: string; camera: [number, number, number]; target: [number, number, number] }
> = {
  kit: { label: 'Full kit', camera: [5.5, 3.2, 8.5], target: [0, 1.5, 0] },
  premium: { label: 'Premium kit', camera: [7.8, 4.3, 12], target: [0, 1.6, 0] },
  canopy: { label: 'Canopy tent', camera: [4.4, 2.7, 6.6], target: [0, 1.6, 0] },
  // Flag target sits on the pole (x=0), so orbiting spins around the pole;
  // the target height follows the configured flag size (see baseTarget).
  flag: { label: 'Flag', camera: [3.2, 2.4, 5.2], target: [0, 1.7, 0] },
  table: { label: 'Table cover', camera: [1.7, 1.2, 2.9], target: [0, 0.55, 0] },
  yard: { label: 'Yard sign', camera: [2.9, 1.7, 4.2], target: [0, 0.85, 0] },
  pen: { label: 'Stylus pen', camera: [0.14, 0.12, 0.22], target: [0, 0.012, 0] },
}

/** Keep grass tufts from poking through the kit's table cover. */
const KIT_CLEAR: ClearRect[] = [{ x: 0, z: 2.22, hw: 1.15, hd: 0.65 }]

/** Keep grass tufts out of the premium kit's tables and banner bases. */
const PREMIUM_CLEAR: ClearRect[] = [
  { x: 0, z: 1.35, hw: 2.35, hd: 0.7 },
  { x: 5.55, z: 0.5, hw: 0.6, hd: 0.25 },
  { x: -5.55, z: 0.5, hw: 0.6, hd: 0.25 },
]

type Controls = React.ComponentRef<typeof OrbitControls>

const smoothstep = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)

/**
 * Owns the model group's animation:
 *  - eases the logical (user) scale with frame-rate-independent damping;
 *  - plays the model-switch transition — shrinking the current model away while
 *    a new one is pending, committing the swap while it's hidden, then growing
 *    the new model back in;
 *  - keeps the orbit target glued to the model's centre at any scale.
 */
function ScaleRig({
  scale,
  baseTarget,
  controlsRef,
  active,
  target,
  onCommit,
  children,
}: {
  scale: number
  baseTarget: [number, number, number]
  controlsRef: React.RefObject<Controls | null>
  active: ModelKey
  target: ModelKey
  onCommit: () => void
  children: React.ReactNode
}) {
  const group = useRef<Group>(null)
  const eased = useRef(scale) // logical user scale
  const trans = useRef(0) // 0 hidden → 1 shown; starts hidden for an intro pop

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return

    // Ease the user scale.
    const de = scale - eased.current
    eased.current += Math.abs(de) < 0.0005 ? de : de * (1 - Math.exp(-dt * 9))

    // Drive the switch transition and commit the swap while hidden.
    const switching = target !== active
    trans.current +=
      ((switching ? 0 : 1) - trans.current) * (1 - Math.exp(-dt * 16))
    if (switching && trans.current < 0.04) onCommit()

    g.scale.setScalar(eased.current * smoothstep(trans.current))

    const c = controlsRef.current
    if (c) {
      c.target.set(
        baseTarget[0] * eased.current,
        baseTarget[1] * eased.current,
        baseTarget[2] * eased.current,
      )
    }
  })

  return <group ref={group}>{children}</group>
}

type RotateSpeed = 'slow' | 'normal' | 'fast'

const ROTATE_SPEEDS: Record<RotateSpeed, { label: string; value: number }> = {
  slow: { label: 'Slow', value: 0.35 },
  normal: { label: 'Normal', value: 0.8 },
  fast: { label: 'Fast', value: 2.2 },
}

const WALL_MODES: { key: WallMode; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'back', label: 'Back wall' },
  { key: 'half', label: 'Half walls' },
  { key: 'full', label: 'Full walls' },
]

/** Tent models that can take wall configurations. */
const TENT_MODELS: ModelKey[] = ['kit', 'premium', 'canopy']

const FLAG_SHAPES: { key: FlagShape; label: string }[] = [
  { key: 'feather', label: 'Feather' },
  { key: 'teardrop', label: 'Teardrop' },
  { key: 'rectangle', label: 'Rectangle' },
]

export default function App() {
  const [printUrl, setPrintUrl] = useState<string>('')
  const [printImage, setPrintImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState<string>('No design — upload artwork')
  const [scale, setScale] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)
  const [rotateSpeed, setRotateSpeed] = useState<RotateSpeed>('normal')
  // `model` is what the selector requests; `active` is what's on screen. They
  // differ briefly during the switch transition (see ScaleRig).
  const [model, setModel] = useState<ModelKey>('kit')
  const [active, setActive] = useState<ModelKey>('kit')
  const view = MODELS[active]

  // Second-level model configuration.
  const [tentSize, setTentSize] = useState<TentSize>('10x10')
  const [walls, setWalls] = useState<WallMode>('none')
  const [flagShape, setFlagShape] = useState<FlagShape>('feather')
  const [flagSize, setFlagSize] = useState<FlagSize>('10ft')
  const [yardSize, setYardSize] = useState<YardSignSize>('18x24')
  const [yardDoubleSided, setYardDoubleSided] = useState(true)

  // The flag preview's orbit centre follows the configured flag height.
  const baseTarget: [number, number, number] =
    active === 'flag' ? [0, FLAG_SIZES[flagSize].h * 0.55, 0] : view.target

  // Packeze brand logo, printed on the tent top and flag tops.
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    loadImage(logoUrl).then(setLogoImage).catch(() => setLogoImage(null))
  }, [])

  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const objectUrl = useRef<string | null>(null)

  // (Re)load the print whenever the source URL changes. Empty = no design
  // (surfaces stay navy fabric); uploads only ever set a real blob URL.
  useEffect(() => {
    if (!printUrl) return
    let alive = true
    loadImage(printUrl)
      .then((img) => alive && setPrintImage(img))
      .catch(() => alive && setPrintImage(null))
    return () => {
      alive = false
    }
  }, [printUrl])

  // Clean up any blob URL we created on unmount.
  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
  }, [])

  // Mouse wheel scales the model itself (not the camera), so the slider and
  // the wheel always drive — and reflect — the same value.
  function onWheel(e: React.WheelEvent) {
    setScale((s) =>
      Math.min(SCALE_MAX, Math.max(SCALE_MIN, s * Math.exp(-e.deltaY * 0.0012))),
    )
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    const url = URL.createObjectURL(file)
    objectUrl.current = url
    setPrintUrl(url)
    setFileName(file.name)
  }

  return (
    <div className="app" onWheel={onWheel}>
      <Canvas shadows dpr={[1, 2]}>
        {/* Remount the camera when the model changes so each preview reframes.
            The pen is centimetres across, so it needs a much closer near plane. */}
        <PerspectiveCamera
          key={active}
          makeDefault
          fov={42}
          near={active === 'pen' ? 0.01 : 0.1}
          position={view.camera}
        />
        <color attach="background" args={['#eef2f7']} />
        <fog attach="fog" args={['#eef2f7', 20, 44]} />

        <hemisphereLight intensity={0.75} groundColor="#b9c2cf" />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[6, 11, 6]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-11}
          shadow-camera-right={11}
          shadow-camera-top={11}
          shadow-camera-bottom={-11}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-8, 5, -4]} intensity={0.5} />

        <ScaleRig
          scale={scale}
          baseTarget={baseTarget}
          controlsRef={controls}
          active={active}
          target={model}
          onCommit={() => setActive(model)}
        >
          {active === 'kit' && (
            <>
              <GrassGround
                radius={TENT_SIZES[tentSize].w / 2 + 3.2}
                clear={KIT_CLEAR}
              />
              <EventDisplay
                print={printImage}
                logo={logoImage}
                tentSize={tentSize}
                walls={walls}
              />
            </>
          )}
          {active === 'premium' && (
            <>
              <GrassGround radius={7.5} clear={PREMIUM_CLEAR} />
              <PremiumKit print={printImage} logo={logoImage} walls={walls} />
            </>
          )}
          {active === 'canopy' && (
            <>
              <GrassGround radius={TENT_SIZES[tentSize].w / 2 + 2} />
              <Canopy print={printImage} logo={logoImage} size={tentSize} walls={walls} />
            </>
          )}
          {active === 'flag' && (
            <>
              <GrassGround radius={2.4} />
              <Flag
                print={printImage}
                logo={logoImage}
                position={[0, 0, 0]}
                shape={flagShape}
                size={flagSize}
              />
            </>
          )}
          {active === 'table' && (
            <>
              <FloorGround radius={2} />
              <TableCover print={printImage} />
            </>
          )}
          {active === 'yard' && (
            <YardSignScene
              print={printImage}
              logo={logoImage}
              size={yardSize}
              doubleSided={yardDoubleSided}
            />
          )}
          {active === 'pen' && (
            <>
              <FloorGround radius={0.16} />
              <Pen print={printImage} />
            </>
          )}
        </ScaleRig>

        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.45}
          scale={active === 'pen' ? 0.8 : 24}
          blur={2.4}
          far={active === 'pen' ? 0.4 : 12}
        />

        <OrbitControls
          key={active}
          ref={controls}
          autoRotate={autoRotate}
          autoRotateSpeed={ROTATE_SPEEDS[rotateSpeed].value}
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
      </Canvas>

      <div className="panel">
        <h1>Event Display Preview</h1>
        <p className="hint">Drag to rotate · Scroll to scale</p>

        <div className="field">
          <span>Model</span>
          <div className="selector">
            {(Object.keys(MODELS) as ModelKey[]).map((k) => (
              <button
                key={k}
                className={model === k ? 'sel on' : 'sel'}
                onClick={() => setModel(k)}
              >
                {MODELS[k].label}
              </button>
            ))}
          </div>
        </div>

        {(model === 'kit' || model === 'canopy') && (
          <div className="field">
            <span>Tent size</span>
            <div className="selector cols-3">
              {(Object.keys(TENT_SIZES) as TentSize[]).map((k) => (
                <button
                  key={k}
                  className={tentSize === k ? 'sel on' : 'sel'}
                  onClick={() => setTentSize(k)}
                >
                  {TENT_SIZES[k].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {TENT_MODELS.includes(model) && (
          <div className="field">
            <span>Walls</span>
            <div className="selector">
              {WALL_MODES.map((w) => (
                <button
                  key={w.key}
                  className={walls === w.key ? 'sel on' : 'sel'}
                  onClick={() => setWalls(w.key)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {model === 'flag' && (
          <>
            <div className="field">
              <span>Flag shape</span>
              <div className="selector cols-3">
                {FLAG_SHAPES.map((f) => (
                  <button
                    key={f.key}
                    className={flagShape === f.key ? 'sel on' : 'sel'}
                    onClick={() => setFlagShape(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Flag height</span>
              <div className="selector cols-3">
                {(Object.keys(FLAG_SIZES) as FlagSize[]).map((k) => (
                  <button
                    key={k}
                    className={flagSize === k ? 'sel on' : 'sel'}
                    onClick={() => setFlagSize(k)}
                  >
                    {FLAG_SIZES[k].label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {model === 'yard' && (
          <>
            <div className="field">
              <span>Sign size</span>
              <div className="selector">
                {(Object.keys(YARD_SIGN_SIZES) as YardSignSize[]).map((k) => (
                  <button
                    key={k}
                    className={yardSize === k ? 'sel on' : 'sel'}
                    onClick={() => setYardSize(k)}
                  >
                    {YARD_SIGN_SIZES[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Print sides</span>
              <div className="selector">
                <button
                  className={!yardDoubleSided ? 'sel on' : 'sel'}
                  onClick={() => setYardDoubleSided(false)}
                >
                  Single-sided
                </button>
                <button
                  className={yardDoubleSided ? 'sel on' : 'sel'}
                  onClick={() => setYardDoubleSided(true)}
                >
                  Double-sided
                </button>
              </div>
            </div>
          </>
        )}

        <div className="field">
          <span>Print artwork</span>
          <label className="upload-btn">
            Upload image…
            <input type="file" accept="image/*" onChange={onUpload} hidden />
          </label>
          <span className="file-name" title={fileName}>
            {fileName}
          </span>
        </div>

        <label className="field">
          <span>Scale · {scale.toFixed(2)}×</span>
          <input
            type="range"
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
        </label>

        {autoRotate && (
          <div className="field">
            <span>Rotation speed</span>
            <div className="selector cols-3">
              {(Object.keys(ROTATE_SPEEDS) as RotateSpeed[]).map((k) => (
                <button
                  key={k}
                  className={rotateSpeed === k ? 'sel on' : 'sel'}
                  onClick={() => setRotateSpeed(k)}
                >
                  {ROTATE_SPEEDS[k].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="row">
          <button
            className={autoRotate ? 'toggle on' : 'toggle'}
            onClick={() => setAutoRotate((v) => !v)}
          >
            {autoRotate ? 'Auto-rotate: on' : 'Auto-rotate: off'}
          </button>
          <button
            className="ghost"
            onClick={() => {
              controls.current?.reset()
              setScale(1)
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
