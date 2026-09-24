import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { loadRemoteDocument, subscribeToTask } from '../lib/documentWorkspace';

type GanttTask = {
  title: string;
  description: string;
  block: string;
  blockColor: string;
  startDay: number;
  duration: number;
  startDate: string;
  endDate: string;
  taskId: string;
  defaultMetrics: { startDate: string; endDate: string; quality: number; cost: number };
};

const PREPARATION_TASKS: GanttTask[] = [
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Аудит каналов', description: 'Оценка текущей структуры контента, форматов, периодичности и показателей вовлечённости.', startDay: 1, duration: 6, startDate: '15.09.2026', endDate: '22.09.2026', taskId: 'audit-channels', defaultMetrics: { startDate: '2026-09-15', endDate: '2026-09-22', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Рубрикатор', description: 'Перечень постоянных тематических рубрик с назначением, каналом, аудиторией и форматом.', startDay: 0, duration: 7, startDate: '14.09.2026', endDate: '22.09.2026', taskId: 'rubricator-update', defaultMetrics: { startDate: '2026-09-14', endDate: '2026-09-22', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Tone of voice', description: 'Принципы обращения к аудитории, недопустимая лексика и правила подачи экспертной информации.', startDay: 3, duration: 4, startDate: '17.09.2026', endDate: '22.09.2026', taskId: 'tone-of-voice', defaultMetrics: { startDate: '2026-09-17', endDate: '2026-09-22', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Контент-матрица', description: 'Проверка и обновление соответствия контента целям, аудиториям, форматам и стадиям воронки.', startDay: 9, duration: 7, startDate: '23.09.2026', endDate: '29.09.2026', taskId: 'content-matrix', defaultMetrics: { startDate: '2026-09-23', endDate: '2026-09-29', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Визуальные шаблоны', description: 'Не менее пяти шаблонов: обложка, карточка, инфографика, титульный кадр и цитата эксперта.', startDay: 7, duration: 5, startDate: '21.09.2026', endDate: '25.09.2026', taskId: 'visual-template-kit', defaultMetrics: { startDate: '2026-09-21', endDate: '2026-09-25', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Стратегический документ', description: 'Вывод всех подготовительных материалов в единый стратегический документ с целями, позиционированием и планом действий.', startDay: 14, duration: 5, startDate: '28.09.2026', endDate: '02.10.2026', taskId: 'strategic-document', defaultMetrics: { startDate: '2026-09-28', endDate: '2026-10-02', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Концепция каналов', description: 'Утверждение названий, рубрикатора и общей концепции новых каналов.', startDay: 8, duration: 3, startDate: '22.09.2026', endDate: '24.09.2026', taskId: 'channel-concept', defaultMetrics: { startDate: '2026-09-22', endDate: '2026-09-24', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Графические материалы', description: 'Подготовка аватара, обложки и системы брендинга публикаций.', startDay: 10, duration: 7, startDate: '24.09.2026', endDate: '02.10.2026', taskId: 'graphic-materials', defaultMetrics: { startDate: '2026-09-24', endDate: '2026-10-02', quality: 10, cost: 10 } },
  { block: 'Подготовительный этап', blockColor: '#38bdf8', title: 'Страницы сообществ', description: 'Создание и первичная настройка страниц сообществ для выбранных каналов.', startDay: 24, duration: 1, startDate: '08.10.2026', endDate: '08.10.2026', taskId: 'community-pages', defaultMetrics: { startDate: '2026-10-08', endDate: '2026-10-08', quality: 10, cost: 10 } },
];

const SOCIAL_MEDIA_TASKS: GanttTask[] = [
  { block: 'Контент Соцмедиа', blockColor: '#a78bfa', title: 'Контент-план', description: 'Разработка контент-плана публикаций для социальных сетей.', startDay: 28, duration: 14, startDate: '12.10.2026', endDate: '25.10.2026', taskId: 'content-plan', defaultMetrics: { startDate: '2026-10-12', endDate: '2026-10-25', quality: 10, cost: 10 } },
  { block: 'Контент Соцмедиа', blockColor: '#a78bfa', title: 'Подготовка текстов', description: 'Написание постов и текстовых материалов для каналов.', startDay: 35, duration: 21, startDate: '19.10.2026', endDate: '08.11.2026', taskId: 'text-preparation', defaultMetrics: { startDate: '2026-10-19', endDate: '2026-11-08', quality: 10, cost: 10 } },
  { block: 'Контент Соцмедиа', blockColor: '#a78bfa', title: 'Подготовка вложений', description: 'Подготовка графических и медиавложений для публикаций.', startDay: 42, duration: 21, startDate: '26.10.2026', endDate: '15.11.2026', taskId: 'attachment-preparation', defaultMetrics: { startDate: '2026-10-26', endDate: '2026-11-15', quality: 10, cost: 10 } },
];

const MEDIA_TASKS: GanttTask[] = [
  { block: 'Контент СМИ', blockColor: '#fb923c', title: 'Идеи тем', description: 'Генерация идей тем и инфоповодов для публикаций в СМИ.', startDay: 28, duration: 10, startDate: '12.10.2026', endDate: '21.10.2026', taskId: 'ideas-topics', defaultMetrics: { startDate: '2026-10-12', endDate: '2026-10-21', quality: 10, cost: 10 } },
  { block: 'Контент СМИ', blockColor: '#fb923c', title: 'Создание материалов', description: 'Создание пресс-релизов, колонок, комментариев и интервью для изданий.', startDay: 38, duration: 25, startDate: '22.10.2026', endDate: '15.11.2026', taskId: 'create-materials', defaultMetrics: { startDate: '2026-10-22', endDate: '2026-11-15', quality: 10, cost: 10 } },
];

const ALL_TASKS: GanttTask[] = [...PREPARATION_TASKS, ...SOCIAL_MEDIA_TASKS, ...MEDIA_TASKS];

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
      <AxisLine start={[0, 0, 0]} end={[axisLength, 0, 0]} />
      <AxisLine start={[0, 0, 0]} end={[0, 3, 0]} />
      <AxisLine start={[0, 0, 0]} end={[0, 0, qualityLength]} />
      <Text position={[axisLength + 1, 0, 0]} fontSize={0.55} color="#cbd5e1">Время, дни (X)</Text>
      <Text position={[0, 3.5, 0]} fontSize={0.55} color="#cbd5e1">Бюджет (Y)</Text>
      <Text position={[0, 0, qualityLength + 0.7]} fontSize={0.55} color="#cbd5e1" rotation={[0, Math.PI / 2, 0]}>Качество (Z)</Text>
      <gridHelper args={[axisLength, axisLength, '#334155', '#1e293b']} position={[axisLength / 2, 0, qualityLength / 2]} />
      {Array.from({ length: axisLength + 1 }, (_, day) => (
        day % 2 === 0 ? <Text key={day} position={[day, -0.45, qualityLength + 0.35]} fontSize={0.27} color="#94a3b8">{formatDate(day)}</Text> : null
      ))}
      {[0, 1, 2].map((value) => <Text key={value} position={[-0.4, value + 0.5, 0]} fontSize={0.3} color="#94a3b8">{value}</Text>)}
    </group>
  );
}

function GanttCube({ task, metrics, qualityOffset, color, approvalStatus, collapsed, onHover, onOpenTask }: { task: GanttTask; metrics: { startDate: string; endDate: string; quality: number; cost: number }; qualityOffset: number; color: string; approvalStatus: 'draft' | 'pending' | 'approved' | 'rework'; collapsed: boolean; onHover: (hovered: boolean) => void; onOpenTask: (taskId: string) => void }) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const start = new Date(`${metrics.startDate}T00:00:00Z`);
  const end = new Date(`${metrics.endDate}T00:00:00Z`);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const startDay = Math.max(0, Math.round((start.getTime() - timelineStart.getTime()) / 86400000));
  const size: [number, number, number] = collapsed ? [duration, 1, 1] : [duration, metrics.cost / 10, metrics.quality / 10];
  const position: [number, number, number] = collapsed ? [startDay + duration / 2, 0.5, qualityOffset + 0.5] : [startDay + duration / 2, (metrics.cost / 10) / 2, qualityOffset + (metrics.quality / 10) / 2];
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const passedDuration = Math.max(0, Math.min(size[0], Math.ceil((todayUtc - start.getTime()) / 86400000) + 1));

  useEffect(() => {
    lineRef.current?.computeLineDistances();
  });

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
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} transparent opacity={approvalStatus === 'approved' ? 0.38 : collapsed ? 0.12 : 0.035} depthWrite={false} />
      </mesh>
      {passedDuration > 0 && <mesh position={[-width / 2 + passedDuration / 2, 0, 0]}>
        <boxGeometry args={[passedDuration, height, depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>}
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <float32BufferAttribute attach="attributes-position" args={[new Float32Array(edgePoints), 3]} itemSize={3} />
        </bufferGeometry>
        {approvalStatus === 'approved' ? <lineBasicMaterial color={color} transparent opacity={1} /> : <lineDashedMaterial color={color} transparent opacity={0.85} dashSize={0.18} gapSize={0.12} linewidth={1} />}
      </lineSegments>
      <mesh onPointerOver={(event) => { event.stopPropagation(); onHover(true); }} onPointerOut={(event) => { event.stopPropagation(); onHover(false); }} onClick={(event) => { event.stopPropagation(); onOpenTask(task.taskId); }}>
        <boxGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {!collapsed && <Text position={[0, height + 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color="#f8fafc" anchorX="center" anchorY="middle" maxWidth={Math.max(1.5, width - 0.3)}>{task.title}</Text>}
      {!collapsed && <Text position={[0, -0.35, z + 0.02]} fontSize={0.22} color="#cbd5e1" anchorX="center" anchorY="middle">{metrics.startDate} — {metrics.endDate}</Text>}
    </group>
  );
}

function BlockBand({ name, color, firstRow, lastRow, start, length, axisLength, collapsed, onToggle }: { name: string; color: string; firstRow: number; lastRow: number; start: number; length: number; axisLength: number; collapsed: boolean; onToggle: () => void }) {
  const center = start + length / 2;
  return (
    <group>
      <mesh position={[axisLength / 2, 0.015, center]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[axisLength, length]} />
        <meshBasicMaterial color={color} transparent opacity={collapsed ? 0.08 : 0.045} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Text position={[-1.45, 0.28, center]} fontSize={0.38} color={color} anchorX="right" maxWidth={3}>{name}</Text>
      <group
        onClick={(event) => { event.stopPropagation(); onToggle(); }}
        onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <Text position={[-0.45, 0.28, center]} fontSize={1.2} color={color} anchorX="center" rotation={[0, 0, collapsed ? Math.PI / 2 : -Math.PI / 2]}>{'{'}</Text>
        <mesh position={[-0.45, 0.28, center]}>
          <planeGeometry args={[0.9, Math.max(1.2, length)]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Text position={[-1.45, -0.25, center]} fontSize={0.25} color="#cbd5e1" anchorX="right">{collapsed ? 'свернут — кликните, чтобы развернуть' : `строки ${firstRow}-${lastRow} · клик — свернуть`}</Text>
    </group>
  );
}

export function CubeScene({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const axisLength = 65;
  const [taskMetrics, setTaskMetrics] = useState<Record<string, { startDate: string; endDate: string; quality: number; cost: number }>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, 'draft' | 'pending' | 'approved' | 'rework'>>({});
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      const entries = await Promise.all(ALL_TASKS.map(async (task) => {
        const document = await loadRemoteDocument(task.taskId, task.title);
        return [task.taskId, { metrics: document.metrics ?? task.defaultMetrics, status: document.approvalStatus ?? 'draft' }] as const;
      }));
      if (mounted) {
        setTaskMetrics(Object.fromEntries(entries.map(([id, value]) => [id, value.metrics])));
        setTaskStatuses(Object.fromEntries(entries.map(([id, value]) => [id, value.status])));
      }
    };
    void loadMetrics();
    const unsubscribers = ALL_TASKS.map((task) => subscribeToTask(task.taskId, () => { void loadMetrics(); }));
    return () => { mounted = false; unsubscribers.forEach((unsubscribe) => unsubscribe()); };
  }, []);

  const resolvedMetrics = ALL_TASKS.map((task) => taskMetrics[task.taskId] ?? task.defaultMetrics);
  const qualitySizes = resolvedMetrics.map((metrics) => Math.max(1, metrics.quality / 10));
  const qualityLength = axisLength;

  // Layout per block: collapsed blocks take a single row of height 1.
  const blockNames = Array.from(new Set(ALL_TASKS.map((task) => task.block)));
  const qualityOffsets: number[] = [];
  const blockGroups: { name: string; color: string; firstRow: number; lastRow: number; start: number; length: number; collapsed: boolean }[] = [];
  let qualityCursor = qualityLength - 1;
  let rowIndex = 0;
  blockNames.forEach((name) => {
    const indexes = ALL_TASKS.map((task, index) => task.block === name ? index : -1).filter((index) => index >= 0);
    const collapsed = !!collapsedBlocks[name];
    const first = indexes[0];
    const last = indexes[indexes.length - 1];
    if (collapsed) {
      const offset = qualityCursor;
      indexes.forEach(() => qualityOffsets.push(offset));
      blockGroups.push({ name, color: ALL_TASKS[first].blockColor, firstRow: rowIndex + 1, lastRow: rowIndex + 1, start: offset, length: 1, collapsed });
      qualityCursor -= 2;
      rowIndex += 1;
    } else {
      let cursor = qualityCursor;
      indexes.forEach((index, i) => {
        if (i > 0) cursor -= 1 + qualitySizes[index];
        qualityOffsets.push(cursor);
      });
      const start = qualityOffsets[last];
      const length = qualitySizes[first] + qualityOffsets[first] - start;
      blockGroups.push({ name, color: ALL_TASKS[first].blockColor, firstRow: rowIndex + 1, lastRow: rowIndex + indexes.length, start, length, collapsed });
      qualityCursor = start - 2;
      rowIndex += indexes.length;
    }
  });

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#0f172a', borderRadius: '12px', position: 'relative' }}>
      <div className="absolute left-4 top-4 z-10 max-w-sm rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-xs text-slate-300">
        Все этапы · клик по фигурной скобке — свернуть/развернуть блок · клик по кубику — открыть задачу
      </div>
      <Canvas camera={{ position: [30, 22, 45], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[-10, 8, -8]} intensity={0.8} color="#60a5fa" />
        <CoordinateSystem axisLength={axisLength} qualityLength={qualityLength} />
        {blockGroups.map((block) => <BlockBand key={block.name} {...block} axisLength={axisLength} onToggle={() => setCollapsedBlocks((prev) => ({ ...prev, [block.name]: !prev[block.name] }))} />)}
        {ALL_TASKS.map((task, index) => <GanttCube key={task.taskId} task={task} metrics={resolvedMetrics[index]} qualityOffset={qualityOffsets[index]} color={task.blockColor} approvalStatus={taskStatuses[task.taskId] ?? 'draft'} collapsed={!!collapsedBlocks[task.block]} onHover={(hovered) => setHoveredTaskId(hovered ? task.taskId : null)} onOpenTask={onOpenTask} />)}
        <OrbitControls enablePan enableZoom enableRotate minDistance={10} maxDistance={140} />
      </Canvas>
      {hoveredTaskId && (() => {
        const index = ALL_TASKS.findIndex((task) => task.taskId === hoveredTaskId);
        const task = ALL_TASKS[index];
        const metrics = resolvedMetrics[index];
        return <div className="absolute left-6 bottom-6 z-20 w-96 rounded-xl border border-slate-500/70 bg-slate-950/95 p-5 text-left text-sm text-slate-200 shadow-2xl pointer-events-none">
          <p className="text-base font-semibold" style={{ color: task.blockColor }}>{task.title}</p>
          <p className="mt-1 text-slate-400">{metrics.startDate} - {metrics.endDate}</p>
          <p className="mt-3 leading-6 text-slate-300">{task.description}</p>
          <p className="mt-2">Деньги: {metrics.cost}/10 · Качество: {metrics.quality}/10</p>
          <p className="mt-1" style={{ color: task.blockColor }}>Нажмите кубик, чтобы открыть задачу</p>
        </div>;
      })()}
    </div>
  );
}
