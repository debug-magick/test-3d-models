import { createContext, useContext } from 'react'
import { MathUtils } from 'three'

export class WindState {
  time = { value: 0 }
  strength = { value: 0 }
  update(dt: number, enabled: boolean, reducedMotion = false) {
    this.strength.value = reducedMotion ? 0 : MathUtils.damp(this.strength.value, enabled ? 1 : 0, 3, dt)
    if (enabled || this.strength.value > 0.001) this.time.value += dt
  }
}

export const WindContext = createContext({ time: { value: 0 }, strength: { value: 0 } })
export const useWind = () => useContext(WindContext)

// The same displacement is injected into the visible and shadow shaders.
export const windShader = `
attribute float windAnchor;
uniform float windTime;
uniform float windStrength;
float clothOffset(vec3 p) {
  float freeEdge = pow(clamp(abs(p.x) / 0.8, 0.0, 1.0), 1.4);
  float topPin = 1.0 - smoothstep(2.15, 3.05, p.y);
  return windStrength * windAnchor * freeEdge * topPin * (
    sin(p.x * 7.0 + p.y * 3.1 - windTime * 2.2) * 0.065 +
    sin(p.x * 12.5 - p.y * 4.0 - windTime * 3.4) * 0.022
  );
}
`
