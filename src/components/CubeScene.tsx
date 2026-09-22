import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

type GanttTask = {
  title: string;
  startDay: number;
  duration: number;
  color: string;
};

const PREPARATION_TASKS: GanttTask[] = [
  { title: 'Аудит каналов', startDay: 1, duration: 6, color: '#38bdf8' },
  { title: 'Рубрикатор', startDay: 0, duration: 7, color: '#a78bfa' },
  { title: 'Tone of voice', startDay: 3, duration: 4, color: '#f472b6' },
  { title: 'Визуальные шаблоны', startDay: 7, duration: 5, color: '#34d399' },
  { title: 'Концепция каналов', startDay: 8, duration: 3, color: '#fbbf24' },
  { title: 'Графические материалы', startDay: 10, duration: 7, color: '#fb7185' },
  { title: 'Страницы сообществ', startDay: 24, duration: 1, color: '#60a5fa' },
];

function AxisLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  return (
    <line>
      <bufferGeometry attach="geometry">
        <float32BufferAttribute attach="attributes-position" args={[new Float32Array([...start, ...end]), 3]} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="#64748b" transparent opacity={0.75} />
    </line>
  );
}

function CoordinateSystem({ axisLength }: { axisLength: number }) {
  return (
    <group>
      <AxisLine start={[-1, 0, 0]} end={[axisLength, 0, 0]} />
      <AxisLine start={[0, 0, 0]} end={[0, 3, 0]} />
      <AxisLine start={[0, 0, 0]} end={[0, 0, -3]} />
      <Text position={[axisLength + 1, 0, 0]} fontSize={0.55} color="#cbd5e1">Время, дни (X)</Text>
      <Text position={[0, 3.5, 0]} fontSize={0.55} color="#cbd5e1">Бюджет (Y)</Text>
      <Text position={[0, 0, -3.6]} fontSize={0.55} color="#cbd5e1" rotation={[0, Math.PI / 2, 0]}>Качество (Z)</Text>
      <gridHelper args={[axisLength + 2, axisLength + 2, '#334155', '#1e293b']} position={[(axisLength - 1) / 2, 0, 0]} />
      {Array.from({ length: axisLength + 1 }, (_, day) => (
        <Text key={day} position={[day, -0.45, 0]} fontSize={0.28} color="#94a3b8">{day}</Text>
      ))}
      {[0, 1, 2].map((value) => <Text key={value} position={[-0.4, value + 0.5, 0]} fontSize={0.3} color="#94a3b8">{value}</Text>)}
    </group>
  );
}

function GanttCube({ task }: { task: GanttTask }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const size: [number, number, number] = [task.duration, 1, 1];
  const position: [number, number, number] = [task.startDay + task.duration / 2, 0.5, -0.5];

  useFrame((state) => {
    if (meshRef.current) meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 0.8 + task.startDay) * 0.035;
  });

  return (
    <group position={position}>
      <RoundedBox ref={meshRef} args={size} radius={0.12} smoothness={4}>
        <meshStandardMaterial color={task.color} emissive={task.color} emissiveIntensity={0.3} roughness={0.35} metalness={0.1} transparent opacity={0.88} />
      </RoundedBox>
      <Text position={[0, 1, -0.05]} fontSize={0.34} color="#f8fafc" anchorX="center" anchorY="middle" maxWidth={Math.max(1.2, task.duration - 0.2)}>{task.title}</Text>
      <Text position={[0, -0.72, 0]} fontSize={0.26} color="#cbd5e1" anchorX="center">{task.duration} дн.</Text>
    </group>
  );
}

export function CubeScene() {
  const axisLength = 27;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#0f172a', borderRadius: '12px', position: 'relative' }}>
      <div className="absolute left-4 top-4 z-10 max-w-sm rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-xs text-slate-300">
        Подготовительный этап · бюджет = 1 · качество = 1 · единица времени = рабочий день
      </div>
      <Canvas camera={{ position: [22, 15, 23], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[-10, 8, -8]} intensity={0.8} color="#60a5fa" />
        <CoordinateSystem axisLength={axisLength} />
        {PREPARATION_TASKS.map((task) => <GanttCube key={task.title} task={task} />)}
        <OrbitControls enablePan enableZoom enableRotate minDistance={10} maxDistance={65} />
      </Canvas>
    </div>
  );
}
