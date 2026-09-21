import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Float, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const PLAN = { time: 10, cost: 8, quality: 6 };
const FACT = { time: 15, cost: 6.4, quality: 4.8 };

function AxisLine({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  return (
    <line>
      <bufferGeometry attach="geometry">
        <float32BufferAttribute attach="attributes-position" count={2} array={new Float32Array([...start, ...end])} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color={color} linewidth={2} transparent opacity={0.6} />
    </line>
  );
}

function DataCube({ position, size, color, emissive, label, isPlan }: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive: string;
  label: string;
  isPlan: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.05;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <group position={position}>
        <RoundedBox ref={meshRef} args={size} radius={0.15} smoothness={4}>
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={isPlan ? 0.3 : 0.6}
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={isPlan ? 0.7 : 0.9}
          />
        </RoundedBox>

        <Text
          position={[0, size[1] / 2 + 0.8, 0]}
          fontSize={0.5}
          color={emissive}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function CoordinateSystem() {
  const axisLength = 18;
  return (
    <group>
      <AxisLine start={[-axisLength, 0, 0]} end={[axisLength, 0, 0]} color="#64748b" />
      <AxisLine start={[0, -axisLength, 0]} end={[0, axisLength, 0]} color="#64748b" />
      <AxisLine start={[0, 0, axisLength]} end={[0, 0, -axisLength]} color="#64748b" />
      <Text position={[axisLength + 1, 0, 0]} fontSize={0.6} color="#94a3b8">Время (X)</Text>
      <Text position={[0, axisLength + 1, 0]} fontSize={0.6} color="#94a3b8">Бюджет (Y)</Text>
      <Text position={[0, 0, -axisLength - 1]} fontSize={0.6} color="#94a3b8" rotation={[0, Math.PI / 4, 0]}>Качество (Z)</Text>
      <gridHelper args={[36, 36, '#334155', '#1e293b']} position={[0, 0, 0]} />
    </group>
  );
}

export function CubeScene() {
  const planPos: [number, number, number] = [PLAN.time / 2, PLAN.cost / 2, -PLAN.quality / 2];
  const factPos: [number, number, number] = [FACT.time / 2, FACT.cost / 2, -FACT.quality / 2];

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#0f172a', borderRadius: '12px' }}>
      <Canvas camera={{ position: [25, 20, 25], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} />
        <pointLight position={[-10, 10, -10]} intensity={0.8} color="#60a5fa" />

        <CoordinateSystem />

        <DataCube position={planPos} size={[PLAN.time, PLAN.cost, PLAN.quality]} color="#22d3ee" emissive="#06b6d4" label="ПЛАН" isPlan={true} />
        <DataCube position={factPos} size={[FACT.time, FACT.cost, FACT.quality]} color="#fbbf24" emissive="#f59e0b" label="ФАКТ" isPlan={false} />

        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={40} blur={2} far={20} color="#000000" />
        <OrbitControls enablePan enableZoom enableRotate minDistance={10} maxDistance={60} />
      </Canvas>
    </div>
  );
}