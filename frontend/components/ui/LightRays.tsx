'use client';

import React, { useEffect, useRef, useState } from 'react';

interface LightRaysProps {
  raysOrigin?: 'top-right' | 'bottom-center' | 'center';
  raysColor?: string;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

const LightRays: React.FC<LightRaysProps> = ({
  raysOrigin = 'bottom-center',
  raysColor = '#1bffc7',
  className = '',
  intensity = 'low',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  
  // Initialize start position based on origin
  const getInitialPosition = () => {
    switch (raysOrigin) {
      case 'top-right': return { x: 0.8, y: 0.8 };
      case 'bottom-center': return { x: 0.5, y: 0 };
      case 'center': return { x: 0.5, y: 0.5 };
      default: return { x: 0.5, y: 0.1 };
    }
  };

  const mouseRef = useRef(getInitialPosition());
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL support
    const glOptions = { alpha: true, antialias: true };
    const gl = canvas.getContext('webgl', glOptions) || canvas.getContext('experimental-webgl', glOptions);
    if (!gl) {
      setIsWebGLSupported(false);
      return;
    }

    let renderer: any;
    let program: any;
    let mesh: any;

    const initOGL = async () => {
      try {
        const OGL = await import('ogl');
        const { Renderer, Program, Mesh, Triangle } = OGL;

        renderer = new Renderer({
          canvas,
          width: container.offsetWidth,
          height: container.offsetHeight,
          dpr: Math.min(window.devicePixelRatio, 2),
          alpha: true,
          antialias: true,
        });

        const oglGl = renderer.gl;
        oglGl.clearColor(0, 0, 0, 0);

        // Parse color
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          } : { r: 0.1, g: 1, b: 0.78 };
        };

        const color = hexToRgb(raysColor);
        const intensityMap = { low: 0.6, medium: 0.8, high: 1.2 };
        const intensityValue = intensityMap[intensity];

        // Vertex shader
        const vertex = `
          attribute vec2 position;
          attribute vec2 uv;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `;

        // Fragment shader - Light rays effect
        const fragment = `
          precision highp float;
          varying vec2 vUv;
          uniform float uTime;
          uniform vec2 uMouse;
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform vec2 uResolution;

          #define PI 3.14159265359
          #define NUM_RAYS 10.0

          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
          }

          float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          void main() {
            vec2 uv = vUv;
            vec2 center = uMouse;
            
            // Distance from light source
            vec2 toCenter = uv - center;
            float dist = length(toCenter);
            float angle = atan(toCenter.y, toCenter.x);
            
            // Create sharper, more defined rays
            float rays = 0.0;
            for (float i = 0.0; i < NUM_RAYS; i++) {
              float rayAngle = (i / NUM_RAYS) * PI * 2.0;
              // Add multiple frequencies of rotation for jittery, realistic feel
              float timeAngle = uTime * (0.05 + 0.1 * random(vec2(i, 0.0))) + i * 0.7;
              float currentRayAngle = rayAngle + sin(timeAngle) * 0.2;
              
              float angleDiff = abs(mod(angle - currentRayAngle + PI, PI * 2.0) - PI);
              
              // Softer, expanding width for a natural spread
              float baseWidth = 0.012 + 0.025 * random(vec2(i, 1.0));
              // Rays widen as they get further from the source
              float rayWidth = baseWidth * (1.0 + dist * 2.0);
              float ray = smoothstep(rayWidth * 4.5, 0.0, angleDiff);
              
              // Significantly shortened length and falloff
              float lengthLimit = 0.35 + 0.45 * random(vec2(i, 2.0));
              ray *= smoothstep(lengthLimit, lengthLimit * 0.4, dist);
              
              // Pulsing intensity
              ray *= 0.4 + 0.6 * sin(uTime * (1.0 + random(vec2(i, 3.0))) + i);
              
              rays += ray;
            }
            
            // Slightly expanded core central glow
            float coreGlow = smoothstep(0.8, 0.0, dist) * 0.45;
            coreGlow += smoothstep(0.2, 0.0, dist) * 0.45;
            
            // Combine with higher contrast and less central wash
            float finalIntensity = (rays * 0.45 + coreGlow) * uIntensity;
            
            // Atmospheric dust/noise
            float atmosphericDust = noise(uv * 12.0 + uTime * 0.08) * 0.08;
            finalIntensity += atmosphericDust * smoothstep(1.5, 0.0, dist);
            
            // Final Color
            vec3 finalColor = uColor * finalIntensity;
            finalColor += uColor * coreGlow * 0.15;
            
            // Sharp falloff at very edge of rays
            finalIntensity *= smoothstep(2.5, 1.0, dist * 0.85);
            
            // Fade at edges of screen
            float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
            edgeFade *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
            
            gl_FragColor = vec4(finalColor, finalIntensity * edgeFade * 0.9);
          }
        `;

        program = new Program(oglGl, {
          vertex,
          fragment,
          uniforms: {
            uTime: { value: 0 },
            uMouse: { value: [mouseRef.current.x, mouseRef.current.y] },
            uColor: { value: [color.r, color.g, color.b] },
            uIntensity: { value: intensityValue },
            uResolution: { value: [container.offsetWidth, container.offsetHeight] },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const geometry = new Triangle(oglGl);
        mesh = new Mesh(oglGl, { geometry, program });

        // Animation loop
        let startTime = performance.now();
        const animate = () => {
          const elapsed = (performance.now() - startTime) / 1000;
          
          if (program && program.uniforms) {
            program.uniforms.uTime.value = elapsed;
            
            const targetX = mouseRef.current.x;
            const targetY = mouseRef.current.y;
            const currentX = program.uniforms.uMouse.value[0];
            const currentY = program.uniforms.uMouse.value[1];
            
            program.uniforms.uMouse.value[0] += (targetX - currentX) * 0.06;
            program.uniforms.uMouse.value[1] += (targetY - currentY) * 0.06;
          }

          if (renderer && mesh) {
            renderer.render({ scene: mesh });
          }
          animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        const handleMouseMove = (e: MouseEvent) => {
          const rect = container.getBoundingClientRect();
          mouseRef.current.x = (e.clientX - rect.left) / rect.width;
          mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
        };

        const handleResize = () => {
          if (renderer && container) {
            renderer.setSize(container.offsetWidth, container.offsetHeight);
            if (program && program.uniforms) {
              program.uniforms.uResolution.value = [container.offsetWidth, container.offsetHeight];
            }
          }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('OGL initialization error:', error);
        setIsWebGLSupported(false);
      }
    };

    const cleanupPromise = initOGL();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [raysColor, intensity, raysOrigin]);

  // Fallback CSS effect if WebGL not supported
  if (!isWebGLSupported) {
    const opacityMap = {
      low: { main: 0.15, secondary: 0.1 },
      medium: { main: 0.3, secondary: 0.2 },
      high: { main: 0.5, secondary: 0.35 },
    };
    const opacity = opacityMap[intensity];

    return (
      <div className={`w-full h-full pointer-events-none overflow-hidden absolute inset-0 ${className}`.trim()}>
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${mouseRef.current.x * 100}% ${(1 - mouseRef.current.y) * 100}%, ${raysColor}40 0%, transparent 70%)`,
            opacity: opacity.main,
          }}
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full pointer-events-none overflow-hidden absolute inset-0 ${className}`.trim()}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default LightRays;