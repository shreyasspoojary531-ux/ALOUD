export const CORE_UPLINK_VERTEX_SHADER = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const CORE_UPLINK_FRAGMENT_SHADER = `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uGridScale;
uniform float uMouseAmount;
uniform float uPulseSpeed;
uniform float uRadius;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  uv.x *= aspect;
  uv += uMouse * uMouseAmount;
  vec2 grid = fract(uv * uGridScale);
  vec2 id = floor(uv * uGridScale);
  float dist = length(grid - vec2(0.5));
  float pulse = sin(uTime * uPulseSpeed + id.x * 0.05 + id.y * 0.05) * 0.5 + 0.5;
  float radius = 0.08 + pulse * uRadius;
  // Valid GLSL smoothstep formulation (edge0 < edge1)
  float alpha = 1.0 - smoothstep(radius - 0.05, radius, dist);
  vec2 center = vec2(0.5 * aspect, 0.5);
  float depthFade = smoothstep(1.5, 0.1, length(uv - center));
  // Terracotta tone matching Aloud design tokens (#cf5700)
  vec3 color = vec3(0.81, 0.34, 0.0) * (0.7 + pulse * 0.3);
  gl_FragColor = vec4(color, alpha * depthFade * uOpacity);
}
`;
