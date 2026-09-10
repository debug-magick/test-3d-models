import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { EnvironmentMode } from './Ground'

/** Locally generated studio reflections: no remote HDR or loading dependency. */
function StudioReflections() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, 0.04)
    const previous = scene.environment
    // Three.js owns the mutable scene; this is an imperative renderer resource.
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = target.texture
    room.dispose()
    generator.dispose()
    return () => { scene.environment = previous; target.dispose() }
  }, [gl, scene])
  return null
}

export function Lighting({ mode, extent, small }: { mode: EnvironmentMode; extent: number; small: boolean }) {
  const outdoor = mode === 'outdoor'
  const size = Math.max(small ? 0.18 : 2, extent)
  const shadowCamera = useMemo(() => new THREE.OrthographicCamera(-size, size, size, -size, size * 0.05, size * 9), [size])
  return <>
    <color attach="background" args={[outdoor ? '#dce5e4' : '#eeede9']} />
    <fog attach="fog" args={[outdoor ? '#dce5e4' : '#eeede9', outdoor ? 18 : 24, outdoor ? 65 : 90]} />
    <StudioReflections />
    <hemisphereLight args={[outdoor ? '#d7e9ff' : '#eaf0ff', outdoor ? '#80754e' : '#b7aaa0', outdoor ? 1.0 : 0.65]} />
    <directionalLight
      position={[size * 1.5, size * 2.5, size * 1.5]}
      color={outdoor ? '#fff1d1' : '#fff5e8'}
      intensity={outdoor ? 2.6 : 2.1}
      castShadow
      shadow-camera={shadowCamera}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00008}
      shadow-normalBias={small ? 0.00008 : 0.008}
      shadow-radius={outdoor ? 3 : 5}
    />
    <directionalLight position={[-size * 2, size, -size]} color="#c8dbff" intensity={outdoor ? 0.3 : 0.8} />
  </>
}
