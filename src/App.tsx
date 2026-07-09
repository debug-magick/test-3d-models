import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EventDisplay } from './scene/EventDisplay'
import { Canopy } from './scene/Canopy'
import { FeatherFlag } from './scene/FeatherFlag'
import { TableCover } from './scene/TableCover'
import { YardSignScene } from './scene/YardSignScene'
import {
  TENT_SIZES,
  YARD_SIGN_SIZES,
  type TentSize,
  type YardSignSize,
} from './scene/sizes'
import { loadImage } from './scene/print'
import defaultPrint from './assets/event-display/Screenshot 2026-05-26 at 6.00.32 PM 2-1781915438822(1).png'
import logoUrl from './assets/packeze-favicon.webp'
import './App.css'

const SCALE_MIN = 0.4
const SCALE_MAX = 2.2

type ModelKey = 'kit' | 'canopy' | 'flag' | 'table' | 'yard'

/** Per-model camera framing so each preview opens nicely composed. */
const MODELS: Record<
  ModelKey,
  { label: string; camera: [number, number, number]; target: [number, number, number] }
> = {
  kit: { label: 'Full kit', camera: [5.5, 3.2, 8.5], target: [0, 1.5, 0] },
  canopy: { label: 'Canopy tent', camera: [4.4, 2.7, 6.6], target: [0, 1.6, 0] },
  // Flag target sits on the pole (x=0), so orbiting spins around the pole.
  flag: { label: 'Feather flag', camera: [2.8, 2.2, 4.6], target: [0, 1.8, 0] },
  table: { label: 'Table cover', camera: [1.7, 1.2, 2.9], target: [0, 0.55, 0] },
  yard: { label: 'Yard sign', camera: [2.9, 1.7, 4.2], target: [0, 0.85, 0] },
}

export default function App() {
  const [printUrl, setPrintUrl] = useState<string>(defaultPrint)
  const [printImage, setPrintImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState<string>('Default sample print')
  const [scale, setScale] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)
  const [model, setModel] = useState<ModelKey>('kit')
  const view = MODELS[model]

  // The model scales about the ground origin, so its visual centre rises and
  // falls with scale. Track it with the orbit target to keep it on screen.
  const target: [number, number, number] = [
    view.target[0] * scale,
    view.target[1] * scale,
    view.target[2] * scale,
  ]

  // Second-level model configuration.
  const [tentSize, setTentSize] = useState<TentSize>('10x10')
  const [yardSize, setYardSize] = useState<YardSignSize>('18x24')
  const [yardDoubleSided, setYardDoubleSided] = useState(true)

  // Packeze brand logo, printed on the tent top and flag tops.
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    loadImage(logoUrl).then(setLogoImage).catch(() => setLogoImage(null))
  }, [])

  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const objectUrl = useRef<string | null>(null)

  // (Re)load the print whenever the source URL changes.
  useEffect(() => {
    let active = true
    loadImage(printUrl)
      .then((img) => active && setPrintImage(img))
      .catch(() => active && setPrintImage(null))
    return () => {
      active = false
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
        {/* Remount the camera when the model changes so each preview reframes. */}
        <PerspectiveCamera key={model} makeDefault fov={42} position={view.camera} />
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

        <group scale={scale}>
          {model === 'kit' && (
            <EventDisplay print={printImage} logo={logoImage} tentSize={tentSize} />
          )}
          {model === 'canopy' && (
            <Canopy print={printImage} logo={logoImage} size={tentSize} />
          )}
          {model === 'flag' && (
            <FeatherFlag print={printImage} logo={logoImage} position={[0, 0, 0]} />
          )}
          {model === 'table' && <TableCover print={printImage} />}
          {model === 'yard' && (
            <YardSignScene
              print={printImage}
              size={yardSize}
              doubleSided={yardDoubleSided}
            />
          )}
        </group>

        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.45}
          scale={24}
          blur={2.4}
          far={12}
        />

        <OrbitControls
          key={model}
          ref={controls}
          target={target}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
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
