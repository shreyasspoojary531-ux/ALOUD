"use client";
import { useEffect, useRef } from "react";
import {
  CORE_UPLINK_FRAGMENT_SHADER,
  CORE_UPLINK_VERTEX_SHADER,
} from "./dotMatrixShaders";

export const DOT_MATRIX_DEFAULTS = {
  speed: 1,
  gridScale: 60,
  mouseAmount: 0.04,
  pulseSpeed: 0.4,
  radius: 0.15,
  opacity: 0.55,
  hue: 0,
};

export function DotMatrixBackground({ className = "", ...props }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const optionsRef = useRef({ ...DOT_MATRIX_DEFAULTS, ...props });
  optionsRef.current = { ...DOT_MATRIX_DEFAULTS, ...props };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;

    // Create Shaders
    function createShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertShader = createShader(gl.VERTEX_SHADER, CORE_UPLINK_VERTEX_SHADER);
    const fragShader = createShader(gl.FRAGMENT_SHADER, CORE_UPLINK_FRAGMENT_SHADER);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Quad Geometry Setup (-1..1)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttrLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttrLoc);
    gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uTimeLoc = gl.getUniformLocation(program, "uTime");
    const uResolutionLoc = gl.getUniformLocation(program, "uResolution");
    const uMouseLoc = gl.getUniformLocation(program, "uMouse");
    const uGridScaleLoc = gl.getUniformLocation(program, "uGridScale");
    const uMouseAmountLoc = gl.getUniformLocation(program, "uMouseAmount");
    const uPulseSpeedLoc = gl.getUniformLocation(program, "uPulseSpeed");
    const uRadiusLoc = gl.getUniformLocation(program, "uRadius");
    const uOpacityLoc = gl.getUniformLocation(program, "uOpacity");

    // Enable Blending for Transparent Background
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let frame = 0;
    let visible = true;
    const startedAt = performance.now();

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const pointer = (event) => {
      if (prefersReducedMotion) return;
      const bounds = canvas.getBoundingClientRect();
      targetX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      targetY = -(((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 - 1);
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = bounds.width * dpr;
      canvas.height = bounds.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now) => {
      const options = optionsRef.current;
      const effectiveSpeed = prefersReducedMotion ? 0 : options.speed;

      // Smooth lerp pointer drift if motion is enabled
      if (!prefersReducedMotion) {
        mouseX += (targetX - mouseX) * 0.05;
        mouseY += (targetY - mouseY) * 0.05;
      }

      const elapsed = (now - startedAt) * 0.001 * effectiveSpeed;

      gl.useProgram(program);
      gl.uniform1f(uTimeLoc, elapsed);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      gl.uniform2f(uMouseLoc, mouseX, mouseY);
      gl.uniform1f(uGridScaleLoc, options.gridScale);
      gl.uniform1f(uMouseAmountLoc, options.mouseAmount);
      gl.uniform1f(uPulseSpeedLoc, options.pulseSpeed);
      gl.uniform1f(uRadiusLoc, options.radius);
      gl.uniform1f(uOpacityLoc, options.opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      frame = visible && !document.hidden ? requestAnimationFrame(render) : 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !frame) frame = requestAnimationFrame(render);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    resizeObserver.observe(host);
    intersection.observe(host);
    window.addEventListener("pointermove", pointer, { passive: true });
    resize();
    frame = requestAnimationFrame(render);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", pointer);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`threeui-background dot-matrix${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          filter: optionsRef.current.hue ? `hue-rotate(${optionsRef.current.hue}deg)` : "none",
        }}
      />
    </div>
  );
}
