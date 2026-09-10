import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type Framing = { target: [number, number, number]; radius: number; width: number; height: number; depth: number }

export function CameraRig({ framing, zoom, rotate, speed, reset, modelKey, reducedMotion }: {
  framing: Framing; zoom: number; rotate: boolean; speed: number
  reset: number; modelKey: string; reducedMotion: boolean
}) {
  const { camera, gl, size, invalidate } = useThree()
  const controls = useRef<OrbitControls | null>(null)
  const interacting = useRef(false)
  const resumeAt = useRef(0)
  const needsHome = useRef(true)
  const direction = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const rotationSpeed = useRef(0)
  const previousModel = useRef(modelKey)
  const home = useRef(new THREE.Vector3(0.38, 0.24, 1).normalize())
  const shift = useRef(new THREE.Vector3())

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.enablePan = false
    c.enableZoom = false
    c.enableDamping = true
    c.rotateSpeed = 0.6
    c.minPolarAngle = 0.15
    c.maxPolarAngle = Math.PI / 2 - 0.035
    const start = () => { interacting.current = true; needsHome.current = false }
    const end = () => { interacting.current = false; resumeAt.current = performance.now() + 1800 }
    c.addEventListener('change', () => invalidate())
    c.addEventListener('start', start)
    c.addEventListener('end', end)
    controls.current = c
    return () => { c.dispose(); controls.current = null }
  }, [camera, gl, invalidate])

  useEffect(() => { needsHome.current = true }, [reset, modelKey])

  useFrame((_, delta) => {
    const c = controls.current
    if (!c) return
    // A tab returning from the background must not jump through seconds of motion.
    const dt = Math.min(delta, 0.05)
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-dt * 8)
    target.current.set(...framing.target)
    const perspective = camera as THREE.PerspectiveCamera
    const vertical = THREE.MathUtils.degToRad(perspective.fov / 2)
    const horizontal = Math.atan(Math.tan(vertical) * size.width / size.height)
    const availableHeight = Math.max(100, size.height - (size.width < 600 ? 140 : 250))
    const halfWidth = Math.hypot(framing.width, framing.depth * 0.5) / 2
    const halfHeight = framing.height / 2 + framing.depth * 0.12
    const distance = (Math.max(halfWidth / Math.tan(horizontal), halfHeight / (Math.tan(vertical) * availableHeight / size.height)) * 1.13 + framing.depth * 0.3) / zoom
    const changed = previousModel.current !== modelKey
    if (changed) {
      // Product swaps occur behind the short stage fade. Start at a correctly
      // framed position, including when crossing from a tent to a 14 cm pen.
      c.target.copy(target.current)
      camera.position.copy(target.current).addScaledVector(home.current, distance * 1.06)
      previousModel.current = modelKey
    }
    shift.current.copy(target.current).sub(c.target).multiplyScalar(alpha)
    c.target.add(shift.current)
    camera.position.add(shift.current)
    direction.current.copy(camera.position).sub(c.target)
    const currentDistance = direction.current.length()
    direction.current.normalize()
    if (needsHome.current && !interacting.current) {
      direction.current.lerp(home.current, alpha).normalize()
      if (direction.current.distanceTo(home.current) < 0.001) needsHome.current = false
    }
    const easedDistance = Math.exp(THREE.MathUtils.lerp(Math.log(Math.max(0.001, currentDistance)), Math.log(distance), alpha))
    camera.position.copy(c.target).addScaledVector(direction.current, easedDistance)
    const desiredSpeed = rotate && !reducedMotion && !interacting.current && performance.now() > resumeAt.current && !needsHome.current ? speed : 0
    rotationSpeed.current = reducedMotion ? 0 : THREE.MathUtils.damp(rotationSpeed.current, desiredSpeed, 3, dt)
    c.autoRotate = rotationSpeed.current > 0.001
    c.autoRotateSpeed = rotationSpeed.current
    c.dampingFactor = 1 - Math.exp(-dt * 10)
    c.update(dt)
    if ((rotate && !reducedMotion) || interacting.current || needsHome.current || Math.abs(currentDistance - distance) > distance * 0.0001 || shift.current.lengthSq() > 0.00000001) invalidate()
  })
  return null
}
