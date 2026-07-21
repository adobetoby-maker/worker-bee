"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

/**
 * ParticleSwarm — ~3,500 light packets distributed in a flattened torus.
 * Custom GLSL shader animates radial pulse + vertical breathing.
 * Particles are additively blended with a center-bright falloff,
 * suggesting energy quanta orbiting a contract resolution core.
 */
function ParticleSwarm({ count = 3500 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const palette = [
      new THREE.Color("#F8E58C"), // spark — incandescent filament
      new THREE.Color("#F4DDA0"), // bullion-100
      new THREE.Color("#EBC777"), // bullion-200
      new THREE.Color("#D4A752"), // bullion-400
      new THREE.Color("#B98A3D"), // bullion-500
    ];

    for (let i = 0; i < count; i++) {
      // Flattened torus distribution — like Saturn's rings, but golden
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const R = 1.55 + (Math.random() - 0.5) * 0.55; // major radius
      const r = 0.15 + Math.random() * 0.55;          // minor radius

      const flatten = 0.32; // squash into a disc
      positions[i * 3 + 0] = (R + r * Math.cos(phi)) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * flatten;
      positions[i * 3 + 2] = (R + r * Math.cos(phi)) * Math.sin(theta);

      // Sprinkle a scattered halo (10% of particles drift out further)
      if (Math.random() < 0.1) {
        const f = 1.4 + Math.random() * 0.6;
        positions[i * 3 + 0] *= f;
        positions[i * 3 + 1] *= 1.8;
        positions[i * 3 + 2] *= f;
      }

      // Color biased toward the brighter end of the palette near the core
      const distFromCore = Math.hypot(positions[i * 3], positions[i * 3 + 2]);
      const brightnessBias = Math.max(0, 1 - distFromCore / 2.5);
      const idx = Math.min(
        palette.length - 1,
        Math.floor(Math.random() * palette.length * (1 - brightnessBias * 0.4))
      );
      const c = palette[idx];
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.8 + Math.random() * 2.6;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    return {
      geometry: g,
      uniforms: { uTime: { value: 0 } },
    };
  }, [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (material.current) {
      material.current.uniforms.uTime.value = t;
    }
    if (points.current) {
      const { x, y } = state.pointer;
      // Continuous slow rotation + mouse parallax
      points.current.rotation.y = THREE.MathUtils.lerp(
        points.current.rotation.y,
        x * 0.35 + t * 0.06,
        0.04
      );
      points.current.rotation.x = THREE.MathUtils.lerp(
        points.current.rotation.x,
        -y * 0.22 + 0.32,
        0.04
      );
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          attribute vec3 aColor;
          attribute float aSize;
          attribute float aPhase;
          varying vec3 vColor;
          varying float vTwinkle;

          void main() {
            vColor = aColor;
            vec3 pos = position;

            // Vertical breathing
            pos.y += sin(uTime * 0.55 + aPhase * 1.7) * 0.04;

            // Subtle radial pulse — particles drift in/out
            float radial = 1.0 + sin(uTime * 0.32 + aPhase) * 0.018;
            pos.x *= radial;
            pos.z *= radial;

            // Twinkle phase, used in fragment for brightness modulation
            vTwinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase * 4.3);

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aSize * (320.0 / -mvPosition.z);
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vTwinkle;

          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float dist = length(uv);
            if (dist > 0.5) discard;

            float alpha = smoothstep(0.5, 0.0, dist);
            float core  = smoothstep(0.22, 0.0, dist);

            // Mix toward white-hot at the core
            vec3 col = mix(vColor, vec3(1.0, 0.97, 0.85), core * 0.75);

            gl_FragColor = vec4(col * vTwinkle, alpha * 0.92);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** CoreOrb — the contract-resolution node at the center of the field. */
function CoreOrb() {
  const ref = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.18;
      ref.current.rotation.x = Math.sin(t * 0.27) * 0.18;
      const pulse = 1 + Math.sin(t * 1.2) * 0.08;
      ref.current.scale.setScalar(pulse);
    }
    if (halo.current) {
      halo.current.rotation.y = -t * 0.06;
      const pulse = 1 + Math.sin(t * 0.8) * 0.05;
      halo.current.scale.setScalar(pulse);
    }
  });
  return (
    <group>
      {/* Wireframe halo */}
      <mesh ref={halo}>
        <icosahedronGeometry args={[0.46, 1]} />
        <meshBasicMaterial color="#D4A752" wireframe transparent opacity={0.18} toneMapped={false} />
      </mesh>
      {/* Core */}
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.18, 1]} />
        <meshBasicMaterial color="#FBEFCF" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function ParticleField({
  density = "high",
}: {
  density?: "low" | "med" | "high";
}) {
  const count = density === "low" ? 1200 : density === "med" ? 2200 : 3500;
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.0, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.25} />
        <ParticleSwarm count={count} />
        <CoreOrb />
        <EffectComposer>
          <Bloom
            intensity={1.35}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.55}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
