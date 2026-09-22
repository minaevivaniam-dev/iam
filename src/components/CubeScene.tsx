import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { loadRemoteDocument, subscribeToTask } from '../lib/documentWorkspace';

type GanttTask = {
  title: string;
  startDay: number;
  duration: number;
  startDate: string;
  endDate: string;
  taskId: string;
  defaultMetrics: { startDate: string; endDate: string; quality: number; cost: number };
};

const PREPARATION_TASKS: GanttTask[] = [
  { title: 'Аудит каналов', startDay: 1, duration: 6, startDate: '15.09.2026', endDate: '22.09.2026', taskId: 'audit-channels', defaultMetrics: { startDate: '2026-09-15', endDate: '2026-09-22', quality: 10, cost: 10 } },
  { title: 'Рубрикатор', startDay: 0, duration: 7, startDate: '14.09.2026', endDate: '22.09.2026', taskId: 'rubricator-update', defaultMetrics: { startDate: '2026-09-14', endDate: '2026-09-22', quality: 10, cost: 10 } },
  { title: 'Tone of voice', startDay: 3, duration: 4, startDate: '17.09.2026', endDate: '22.09.2026', taskId: 'tone-of-voice', defaultMetrics: { startDate: '2026-09-17', endDate: '2026-09-22', quality: 10, cost: 10 } },
  { title: 'Визуальные шаблоны', startDay: 7, duration: 5, startDate: '21.09.2026', endDate: '25.09.2026', taskId: 'visual-template-kit', defaultMetrics: { startDate: '2026-09-21', endDate: '2026-09-25', quality: 10, cost: 10 } },
  { title: 'Концепция каналов', startDay: 8, duration: 3, startDate: '22.09.2026', endDate: '24.09.2026', taskId: 'channel-concept', defaultMetrics: { startDate: '2026-09-22', endDate: '2026-09-24', quality: 10, cost: 10 } },
  { title: 'Графические материалы', startDay: 10, duration: 7, startDate: '24.09.2026', endDate: '02.10.2026', taskId: 'graphic-materials', defaultMetrics: { startDate: '2026-09-24', endDate: '2026-10-02', quality: 10, cost: 10 } },
  { title: 'Страницы сообществ', startDay: 24, duration: 1, startDate: '08.10.2026', endDate: '08.10.2026', taskId: 'community-pages', defaultMetrics: { startDate: '2026-10-08', endDate: '2026-10-08', quality: 10, cost: 10 } },
];

const timelineStart = new Date(Date.UTC(2026, 8, 14));

function formatDate(day: number) {
  const date = new Date(timelineStart);
  date.setUTCDate(timelineStart.getUTCDate() + day);
  return `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

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

function CoordinateSystem({ axisLength, qualityLength }: { axisLength: number; qualityLength: number }) {
  return (
    <group>
      <AxisLine start={[-1, 0, 0]} end={[axisLength, 0, 0]} />
      <AxisLine start={[0, 0, 0]} end={[0, 3, 0]} />
      <AxisLine start={[0, 0, 0]} end={[0, 0, -qualityLength]} />
      <Text position={[axisLength + 1, 0, 0]} fontSize={0.55} color="#cbd5e1">Время, дни (X)</Text>
      <Text position={[0, 3.5, 0]} fontSize={0.55} color="#cbd5e1">Бюджет (Y)</Text>
      <Text position={[0, 0, -qualityLength - 0.7]} fontSize={0.55} color="#cbd5e1" rotation={[0, Math.PI / 2, 0]}>Качество (Z)</Text>
      <gridHelper args={[axisLength, axisLength, '#334155', '#1e293b']} position={[(axisLength - 1) / 2, 0, 0]} />
      {Array.from({ length: axisLength + 1 }, (_, day) => (
        day % 2 === 0 ? <Text key={day} position={[day, -0.45, 0]} fontSize={0.27} color="#94a3b8">{formatDate(day)}</Text> : null
      ))}
      {[0, 1, 2].map((value) => <Text key={value} position={[-0.4, value + 0.5, 0]} fontSize={0.3} color="#94a3b8">{value}</Text>)}
    </group>
  );
}

function GanttCube({ task, metrics, qualityOffset, onOpenTask }: { task: GanttTask; metrics: { startDate: string; endDate: string; quality: number; cost: number }; qualityOffset: number; onOpenTask: (taskId: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const lineRef = useRef<THREE.LineSegments>(null);
  const start = new Date(`${metrics.startDate}T00:00:00Z`);
  const end = new Date(`${metrics.endDate}T00:00:00Z`);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const startDay = Math.max(0, Math.round((start.getTime() - timelineStart.getTime()) / 86400000));
  const size: [number, number, number] = [duration, metrics.cost / 10, metrics.quality / 10];
  const position: [number, number, number] = [startDay + duration / 2, (metrics.cost / 10) / 2, -(qualityOffset + (metrics.quality / 10) / 2)];

  useEffect(() => {
    lineRef.current?.computeLineDistances();
  }, []);

  const [width, height, depth] = size;
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const edgePoints = [
    -x, -y, -z, x, -y, -z, x, -y, -z, x, y, -z, x, y, -z, -x, y, -z, -x, y, -z, -x, -y, -z,
    -x, -y, z, x, -y, z, x, -y, z, x, y, z, x, y, z, -x, y, z, -x, y, z, -x, -y, z,
    -x, -y, -z, -x, -y, z, x, -y, -z, x, -y, z, x, y, -z, x, y, z, -x, y, -z, -x, y, z,
  ];

  return (
    <group position={position} onPointerOver={(event) => { event.stopPropagation(); setIsHovered(true); }} onPointerOut={() => setIsHovered(false)} onClick={(event) => { event.stopPropagation(); onOpenTask(task.taskId); }}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.035} depthWrite={false} />
      </mesh>
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <float32BufferAttribute attach="attributes-position" args={[new Float32Array(edgePoints), 3]} itemSize={3} />
        </bufferGeometry>
        <lineDashedMaterial color="#4ade80" transparent opacity={0.85} dashSize={0.18} gapSize={0.12} linewidth={1} />
      </lineSegments>
      <Text position={[0, 0.72, -0.52]} fontSize={0.3} color="#86efac" anchorX="center" anchorY="middle" maxWidth={Math.max(1.2, task.duration - 0.2)}>{task.title}</Text>
      <Text position={[0, -0.72, 0]} fontSize={0.25} color="#86efac" anchorX="center">{metrics.startDate} - {metrics.endDate}</Text>
      {isHovered && (
        <Html distanceFactor={8} position={[0, 1.3, 0]} center>
          <div className="pointer-events-none w-56 rounded-lg border border-emerald-400/60 bg-slate-950/95 p-3 text-left text-xs text-slate-200 shadow-xl">
            <p className="font-semibold text-emerald-300">{task.title}</p>
            <p className="mt-1">Срок: {task.startDate} - {task.endDate}</p>
            <p>Время: {metrics.startDate} - {metrics.endDate}</p>
            <p>Деньги: {metrics.cost} · Качество: {metrics.quality}</p>
            <p>Качество: {metrics.quality}</p>
            <p className="mt-2 text-emerald-400">Нажмите кубик, чтобы открыть задачу</p>
          </div>
        </Html>
      )}
    </group>
  );
}

export function CubeScene({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const axisLength = 27;
  const [taskMetrics, setTaskMetrics] = useState<Record<string, { startDate: string; endDate: string; quality: number; cost: number }>>({});

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      const entries = await Promise.all(PREPARATION_TASKS.map(async (task) => {
        const document = await loadRemoteDocument(task.taskId, task.title);
        return [task.taskId, document.metrics ?? task.defaultMetrics] as const;
      }));
      if (mounted) setTaskMetrics(Object.fromEntries(entries));
    };
    void loadMetrics();
    const unsubscribers = PREPARATION_TASKS.map((task) => subscribeToTask(task.taskId, () => { void loadMetrics(); }));
    return () => { mounted = false; unsubscribers.forEach((unsubscribe) => unsubscribe()); };
  }, []);

  const resolvedMetrics = PREPARATION_TASKS.map((task) => taskMetrics[task.taskId] ?? task.defaultMetrics);
  const qualityOffsets: number[] = [];
  let qualityCursor = 0;
  resolvedMetrics.forEach((metrics) => {
    qualityOffsets.push(qualityCursor);
    qualityCursor += Math.max(1, metrics.quality / 10) + 1;
  });
  const qualityLength = qualityCursor;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#0f172a', borderRadius: '12px', position: 'relative' }}>
      <div className="absolute left-4 top-4 z-10 max-w-sm rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-xs text-slate-300">
        Подготовительный этап · деньги и качество: 10 = 1 клетка · время: период дат
      </div>
      <Canvas camera={{ position: [22, 15, 23], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[-10, 8, -8]} intensity={0.8} color="#60a5fa" />
        <CoordinateSystem axisLength={axisLength} qualityLength={qualityLength} />
        {PREPARATION_TASKS.map((task, index) => <GanttCube key={task.title} task={task} metrics={resolvedMetrics[index]} qualityOffset={qualityOffsets[index]} onOpenTask={onOpenTask} />)}
        <OrbitControls enablePan enableZoom enableRotate minDistance={10} maxDistance={65} />
      </Canvas>
    </div>
  );
}
