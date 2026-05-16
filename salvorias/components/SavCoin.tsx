"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows, Float } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

function Coin() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current || !inner.current) return;
    const t = state.clock.getElapsedTime();
    // Continuous slow rotation around Y
    inner.current.rotation.y = t * 0.5;
    // Subtle parallax tilt from mouse
    const { x, y } = state.pointer;
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -y * 0.25, 0.06);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, x * 0.25, 0.06);
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.05} floatIntensity={0.4}>
        <mesh ref={inner} castShadow receiveShadow>
          {/* Cylinder = the coin disc. Thin, with a wide diameter */}
          <cylinderGeometry args={[1.6, 1.6, 0.18, 96, 1, false]} />
          <meshStandardMaterial
            color="#D4A752"
            metalness={1}
            roughness={0.18}
            envMapIntensity={1.4}
          />
        </mesh>

        {/* Beveled rim — slightly larger torus around the edge */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.045, 24, 96]} />
          <meshStandardMaterial
            color="#F4DDA0"
            metalness={1}
            roughness={0.08}
            envMapIntensity={1.6}
          />
        </mesh>

        {/* Front face emblem — concentric ring */}
        <mesh position={[0, 0.0901, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.18, 96]} />
          <meshStandardMaterial
            color="#5C4421"
            metalness={1}
            roughness={0.4}
            envMapIntensity={0.8}
          />
        </mesh>

        {/* Center medallion (raised disc) — front */}
        <mesh position={[0, 0.0951, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.02, 64]} />
          <meshStandardMaterial
            color="#EBC777"
            metalness={1}
            roughness={0.12}
            envMapIntensity={1.5}
          />
        </mesh>

        {/* "S" mark — front (extruded letter approximated with a torus arc) */}
        <group position={[0, 0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.18, 0]}>
            <torusGeometry args={[0.28, 0.075, 16, 32, Math.PI]} />
            <meshStandardMaterial
              color="#3D2E14"
              metalness={1}
              roughness={0.45}
            />
          </mesh>
          <mesh position={[0, -0.18, 0]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.28, 0.075, 16, 32, Math.PI]} />
            <meshStandardMaterial
              color="#3D2E14"
              metalness={1}
              roughness={0.45}
            />
          </mesh>
        </group>

        {/* Back face — also detailed (so back-rotation looks intentional) */}
        <mesh position={[0, -0.0901, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.18, 96]} />
          <meshStandardMaterial
            color="#5C4421"
            metalness={1}
            roughness={0.4}
            envMapIntensity={0.8}
          />
        </mesh>
        <mesh position={[0, -0.0951, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.02, 64]} />
          <meshStandardMaterial
            color="#EBC777"
            metalness={1}
            roughness={0.12}
            envMapIntensity={1.5}
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function SavCoin() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 4.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} color="#FBEFCF" castShadow />
        <directionalLight position={[-4, -2, -3]} intensity={0.5} color="#B98A3D" />
        <pointLight position={[0, 0, 4]} intensity={0.6} color="#F4DDA0" />

        <Coin />

        <ContactShadows
          position={[0, -1.7, 0]}
          opacity={0.55}
          scale={6}
          blur={2.6}
          far={2.5}
          color="#000000"
        />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  );
}
