'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Background, BackgroundVariant, ConnectionMode, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider,
  addEdge, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './editor.css'

import { KINDS, KIND_IDS, isKind, type DiagramData, type KindId } from '@/lib/diagram/kinds'
import { exampleDiagram } from '@/lib/diagram/example'
import { sanitizeDiagram } from '@/lib/diagram/sanitize'
import { saveDiagram } from '@/app/editor/[id]/actions'
import ShapeNode, { type DiagramNode } from './ShapeNode'
import Palette, { DRAG_MIME } from './Palette'

// Todas las figuras comparten el mismo componente; `type` decide qué dibuja.
const nodeTypes: NodeTypes = Object.fromEntries(KIND_IDS.map((k) => [k, ShapeNode]))

const DEFAULT_EDGE = { markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--rc-ink)' } }
const GRID = 8

/* ---------- conversión entre lo guardado y lo que pinta React Flow ---------- */
const rank = (n: DiagramNode) => (KINDS[n.type].container ? 0 : n.parentId ? 2 : 1)
// Colas primero (debajo de todo), hijos al final; React Flow exige el padre antes que el hijo.
const normalize = (ns: DiagramNode[]) => [...ns].sort((a, b) => rank(a) - rank(b))
const sizeOf = (n: DiagramNode) => ({
  w: n.width ?? n.measured?.width ?? KINDS[n.type].w,
  h: n.height ?? n.measured?.height ?? KINDS[n.type].h,
})

function toFlow(d: DiagramData): { nodes: DiagramNode[]; edges: Edge[] } {
  const nodes = normalize(
    d.nodes.map((n) => ({
      id: n.id, type: n.type, position: n.position, width: n.width, height: n.height,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      data: { label: n.data.label },
    })),
  )
  const edges: Edge[] = d.edges.map((e) => ({ ...e, ...DEFAULT_EDGE }))
  return { nodes, edges }
}

function fromFlow(nodes: DiagramNode[], edges: Edge[]): DiagramData {
  return {
    nodes: nodes.map((n) => {
      const { w, h } = sizeOf(n)
      return {
        id: n.id, type: n.type as KindId,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        width: Math.round(w), height: Math.round(h),
        ...(n.parentId ? { parentId: n.parentId } : {}),
        data: { label: n.data.label },
      }
    }),
    edges: edges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null,
    })),
  }
}

// Si el centro de la figura cae dentro de una cola, pasa a ser su hija (y se mueve con ella).
function reparent(ns: DiagramNode[], ids: string[]): DiagramNode[] {
  const byId = new Map(ns.map((n) => [n.id, n]))
  const abs = (n: DiagramNode) => {
    const p = n.parentId ? byId.get(n.parentId) : undefined
    return p ? { x: p.position.x + n.position.x, y: p.position.y + n.position.y } : n.position
  }
  const queues = ns.filter((n) => KINDS[n.type].container)
  return normalize(
    ns.map((n) => {
      if (!ids.includes(n.id) || KINDS[n.type].container) return n
      const a = abs(n)
      const { w, h } = sizeOf(n)
      const cx = a.x + w / 2
      const cy = a.y + h / 2
      const host = [...queues].reverse().find((q) => {
        const s = sizeOf(q)
        return cx > q.position.x && cx < q.position.x + s.w && cy > q.position.y && cy < q.position.y + s.h
      })
      if (host) {
        if (n.parentId === host.id) return n
        return { ...n, parentId: host.id, position: { x: a.x - host.position.x, y: a.y - host.position.y } }
      }
      if (n.parentId) {
        const rest = { ...n }
        delete rest.parentId
        return { ...rest, position: a }
      }
      return n
    }),
  )
}

const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const snapTo = (v: number) => Math.round(v / GRID) * GRID

type Status = 'saved' | 'pending' | 'saving' | 'error'
const STATUS_TEXT: Record<Status, string> = {
  saved: 'Guardado', pending: 'Sin guardar…', saving: 'Guardando…', error: 'Error al guardar',
}

interface Props {
  id: string
  initialTitle: string
  initialData: DiagramData
}

function EditorInner({ id, initialTitle, initialData }: Props) {
  const [init] = useState(() => toFlow(initialData))
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>(init.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(init.edges)
  const [title, setTitle] = useState(initialTitle)
  const [status, setStatus] = useState<Status>('saved')
  const [connecting, setConnecting] = useState(false)
  const [armed, setArmed] = useState<'clear' | 'example' | null>(null)
  const [json, setJson] = useState<string | null>(null)
  const [jsonErr, setJsonErr] = useState('')
  const [hs, setHs] = useState({ u: false, r: false })
  const [tick, setTick] = useState(0)

  const { screenToFlowPosition, fitView, deleteElements } = useReactFlow<DiagramNode, Edge>()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Copias "vivas" para leerlas desde callbacks y efectos sin recrearlos.
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const titleRef = useRef(title)
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
    titleRef.current = title
  })

  /* ---------- guardado automático ---------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const current = useRef(JSON.stringify(fromFlow(init.nodes, init.edges)))

  const doSave = useCallback(async () => {
    setStatus('saving')
    const res = await saveDiagram(id, titleRef.current, JSON.parse(current.current))
    setStatus(res.ok ? 'saved' : 'error')
  }, [id])

  const scheduleSave = useCallback(() => {
    setStatus('pending')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 900)
  }, [doSave])

  useEffect(() => () => clearTimeout(saveTimer.current), [])
  useEffect(() => {
    if (status !== 'pending' && status !== 'saving') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  /* ---------- historial (deshacer / rehacer) ---------- */
  const past = useRef<string[]>([])
  const future = useRef<string[]>([])
  const dirty = useRef(false)
  // Llamar después de un cambio completo (soltar, conectar, añadir...). El efecto toma la foto
  // cuando React ya aplicó el estado nuevo.
  const mark = useCallback(() => {
    dirty.current = true
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    dirty.current = false
    const s = JSON.stringify(fromFlow(nodesRef.current, edgesRef.current))
    if (s === current.current) return
    past.current.push(current.current)
    if (past.current.length > 80) past.current.shift()
    future.current = []
    current.current = s
    scheduleSave()
    setHs({ u: true, r: false })
  }, [tick, scheduleSave])

  const apply = useCallback(
    (s: string) => {
      const f = toFlow(JSON.parse(s) as DiagramData)
      setNodes(f.nodes)
      setEdges(f.edges)
      current.current = s
      scheduleSave()
      setHs({ u: past.current.length > 0, r: future.current.length > 0 })
    },
    [setNodes, setEdges, scheduleSave],
  )
  const undo = useCallback(() => {
    const s = past.current.pop()
    if (s === undefined) return
    future.current.push(current.current)
    apply(s)
  }, [apply])
  const redo = useCallback(() => {
    const s = future.current.pop()
    if (s === undefined) return
    past.current.push(current.current)
    apply(s)
  }, [apply])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      else if (k === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  /* ---------- edición ---------- */
  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((eds) => addEdge({ ...c, ...DEFAULT_EDGE }, eds))
      mark()
    },
    [setEdges, mark],
  )

  const addNode = useCallback(
    (type: KindId, at?: { x: number; y: number }) => {
      const k = KINDS[type]
      let c = at
      if (!c) {
        const r = wrapRef.current!.getBoundingClientRect()
        const jitter = (nodesRef.current.length % 6) * 16 - 40
        c = screenToFlowPosition({ x: r.left + r.width / 2 + jitter, y: r.top + r.height / 2 + jitter })
      }
      const nextBadge = String(
        nodesRef.current.filter((n) => n.type === 'badge').reduce((m, n) => Math.max(m, parseInt(n.data.label) || 0), 0) + 1,
      )
      const node: DiagramNode = {
        id: newId(), type, width: k.w, height: k.h, selected: true,
        position: { x: snapTo(c.x - k.w / 2), y: snapTo(c.y - k.h / 2) },
        data: { label: type === 'badge' ? nextBadge : k.label },
      }
      setNodes((ns) => reparent([...ns.map((n) => ({ ...n, selected: false })), node], [node.id]))
      mark()
    },
    [screenToFlowPosition, setNodes, mark],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const t = e.dataTransfer.getData(DRAG_MIME)
      if (isKind(t)) addNode(t, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
    },
    [addNode, screenToFlowPosition],
  )

  const onDragStop = useCallback(
    (_: unknown, __: DiagramNode, dragged: DiagramNode[]) => {
      setNodes((ns) => reparent(ns, dragged.map((n) => n.id)))
      mark()
    },
    [setNodes, mark],
  )

  const setLabel = (nid: string, label: string) =>
    setNodes((ns) => ns.map((n) => (n.id === nid ? { ...n, data: { ...n.data, label } } : n)))
  const setSize = (nid: string, w: number, h: number) =>
    setNodes((ns) => ns.map((n) => (n.id === nid ? { ...n, width: Math.max(24, w), height: Math.max(24, h) } : n)))
  const duplicate = (n: DiagramNode) => {
    const copy: DiagramNode = {
      ...n, id: newId(), selected: true,
      position: { x: n.position.x + 24, y: n.position.y + 24 },
      data: { ...n.data },
    }
    setNodes((ns) => normalize([...ns.map((m) => ({ ...m, selected: false })), copy]))
    mark()
  }
  const toFront = (nid: string) => {
    setNodes((ns) => normalize([...ns.filter((n) => n.id !== nid), ...ns.filter((n) => n.id === nid)]))
    mark()
  }
  const remove = async (opts: { nodes?: Array<{ id: string }>; edges?: Array<{ id: string }> }) => {
    await deleteElements(opts)
    mark()
  }
  const addToQueue = (q: DiagramNode, type: 'phone' | 'chat') => {
    const k = KINDS[type]
    const i = nodesRef.current.filter((n) => n.parentId === q.id && n.type === type).length
    const pos = { x: (type === 'phone' ? 22 : 19) + i * 70, y: type === 'phone' ? 30 : 86 }
    const child: DiagramNode = {
      id: newId(), type, parentId: q.id, position: pos, width: k.w, height: k.h, data: { label: '' },
    }
    setNodes((ns) =>
      normalize([
        ...ns.map((n) =>
          n.id === q.id
            ? {
                ...n,
                width: Math.max(sizeOf(n).w, 22 + (i + 1) * 70 + 8),
                height: Math.max(sizeOf(n).h, pos.y + k.h + 10),
              }
            : n,
        ),
        child,
      ]),
    )
    mark()
  }
  const invertEdge = (e: Edge) => {
    setEdges((es) =>
      es.map((x) =>
        x.id === e.id
          ? { ...x, source: x.target, target: x.source, sourceHandle: x.targetHandle, targetHandle: x.sourceHandle }
          : x,
      ),
    )
    mark()
  }

  /* ---------- barra superior ---------- */
  const arm = (what: 'clear' | 'example') => {
    if (armed !== what) {
      setArmed(what)
      setTimeout(() => setArmed((a) => (a === what ? null : a)), 3000)
      return
    }
    setArmed(null)
    const f = what === 'clear' ? { nodes: [], edges: [] } : toFlow(exampleDiagram())
    setNodes(f.nodes)
    setEdges(f.edges)
    mark()
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 250 }))
  }

  const openJson = () => {
    setJson(JSON.stringify(fromFlow(nodes, edges), null, 1))
    setJsonErr('')
  }
  const loadJson = () => {
    try {
      const clean = sanitizeDiagram(JSON.parse(json ?? ''))
      if (!clean) throw new Error('Debe tener "nodes" y "edges" válidos.')
      const f = toFlow(clean)
      setNodes(f.nodes)
      setEdges(f.edges)
      mark()
      setJson(null)
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 250 }))
    } catch (err) {
      setJsonErr(`No se pudo cargar: ${err instanceof Error ? err.message : 'JSON inválido'}`)
    }
  }
  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json ?? '')
      setJsonErr('')
    } catch {
      setJsonErr('Selecciona el texto y copia con Ctrl+C.')
    }
  }

  /* ---------- panel de propiedades ---------- */
  const selNodes = nodes.filter((n) => n.selected)
  const selEdges = edges.filter((e) => e.selected)
  const one = selNodes.length + selEdges.length === 1
  const node = one ? selNodes[0] : undefined
  const edge = one ? selEdges[0] : undefined
  const label = (n: DiagramNode) => (n.data.label || KINDS[n.type].name).replace(/\n/g, ' ')

  return (
    <div className={`rc${selNodes.length + selEdges.length ? ' has-sel' : ''}`}>
      <header className="rc-top">
        <Link href="/dashboard" className="rc-back">← Diagramas</Link>
        <input
          className="rc-title"
          value={title}
          maxLength={80}
          aria-label="Nombre del diagrama"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={scheduleSave}
        />
        <div className="rc-sp" />
        <span className={`rc-status ${status === 'error' ? 'err' : status === 'saved' ? 'ok' : ''}`} role="status">
          {STATUS_TEXT[status]}
        </span>
        <div className="rc-grp">
          <button className="rc-btn" onClick={undo} disabled={!hs.u} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↶</button>
          <button className="rc-btn" onClick={redo} disabled={!hs.r} title="Rehacer (Ctrl+Y)" aria-label="Rehacer">↷</button>
        </div>
        <div className="rc-grp">
          <button className="rc-btn" onClick={() => fitView({ padding: 0.15, duration: 250 })}>Ajustar</button>
          <button className={`rc-btn${armed === 'example' ? ' dng' : ''}`} onClick={() => arm('example')}>
            {armed === 'example' ? '¿Reemplazar?' : 'Ejemplo'}
          </button>
          <button className={`rc-btn${armed === 'clear' ? ' dng' : ''}`} onClick={() => arm('clear')}>
            {armed === 'clear' ? '¿Seguro?' : 'Limpiar'}
          </button>
          <button className="rc-btn pri" onClick={openJson}>JSON</button>
        </div>
      </header>

      <Palette onAdd={(t) => addNode(t)} />

      <main className="rc-cv" ref={wrapRef}>
        <ReactFlow<DiagramNode, Edge>
          className={connecting ? 'rc-connecting' : undefined}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={() => setConnecting(true)}
          onConnectEnd={() => setConnecting(false)}
          onNodeDragStop={onDragStop}
          onSelectionDragStop={(_, ns) => onDragStop(_, ns[0], ns)}
          onNodesDelete={mark}
          onEdgesDelete={mark}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
          defaultEdgeOptions={DEFAULT_EDGE}
          connectionMode={ConnectionMode.Loose}
          snapToGrid
          snapGrid={[GRID, GRID]}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2.5}
          colorMode="system"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="var(--rc-grid)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="var(--rc-grid)" />
        </ReactFlow>
        <div className="rc-foot"><b>{nodes.length}</b> figuras · <b>{edges.length}</b> conexiones</div>
      </main>

      <aside className="rc-props" aria-live="polite">
        {node ? (
          <>
            <h2>{KINDS[node.type].name}</h2>
            <div className="rc-kind">{sizeOf(node).w}×{sizeOf(node).h}</div>
            <div className="rc-fld">
              <label htmlFor="p-label">{node.type === 'badge' ? 'Número' : 'Texto'}</label>
              {node.type === 'badge' ? (
                <input id="p-label" value={node.data.label} maxLength={3}
                  onChange={(e) => setLabel(node.id, e.target.value)} onBlur={mark} />
              ) : (
                <textarea id="p-label" rows={2} value={node.data.label} maxLength={500}
                  onChange={(e) => setLabel(node.id, e.target.value)} onBlur={mark} />
              )}
            </div>
            {KINDS[node.type].resizable && (
              <div className="rc-two">
                <div className="rc-fld">
                  <label htmlFor="p-w">Ancho</label>
                  <input id="p-w" type="number" min={24} step={8} value={Math.round(sizeOf(node).w)}
                    onChange={(e) => setSize(node.id, +e.target.value || 24, sizeOf(node).h)} onBlur={mark} />
                </div>
                <div className="rc-fld">
                  <label htmlFor="p-h">Alto</label>
                  <input id="p-h" type="number" min={24} step={8} value={Math.round(sizeOf(node).h)}
                    onChange={(e) => setSize(node.id, sizeOf(node).w, +e.target.value || 24)} onBlur={mark} />
                </div>
              </div>
            )}
            {node.type === 'queue' && (
              <div className="rc-sec">
                <div className="rc-lbl" style={{ marginBottom: 8 }}>Canales de la cola</div>
                <div className="rc-acts">
                  <button className="rc-btn" onClick={() => addToQueue(node, 'phone')}>+ Voz</button>
                  <button className="rc-btn" onClick={() => addToQueue(node, 'chat')}>+ Chat</button>
                </div>
              </div>
            )}
            <div className="rc-sec">
              <div className="rc-acts">
                <button className="rc-btn" onClick={() => duplicate(node)}>Duplicar</button>
                <button className="rc-btn" onClick={() => toFront(node.id)}>Al frente</button>
                <button className="rc-btn dng" onClick={() => remove({ nodes: [{ id: node.id }] })}>Eliminar</button>
              </div>
            </div>
          </>
        ) : edge ? (
          <>
            <h2>Conexión</h2>
            <div className="rc-kind">{edge.id}</div>
            <div className="rc-lbl">Dirección</div>
            <p className="rc-link">
              {label(nodes.find((n) => n.id === edge.source)!)} → {label(nodes.find((n) => n.id === edge.target)!)}
            </p>
            <div className="rc-acts">
              <button className="rc-btn" onClick={() => invertEdge(edge)}>Invertir</button>
              <button className="rc-btn dng" onClick={() => remove({ edges: [{ id: edge.id }] })}>Eliminar</button>
            </div>
          </>
        ) : (
          <>
            <h2>Propiedades</h2>
            <div className="rc-kind">{selNodes.length + selEdges.length > 1 ? `${selNodes.length + selEdges.length} elementos` : 'nada seleccionado'}</div>
            <ul className="rc-tips">
              <li><b>Mover.</b> Arrastra una figura. Si es una cola, lleva consigo lo que tiene dentro.</li>
              <li><b>Meter en una cola.</b> Suelta un teléfono o chat sobre una cola.</li>
              <li><b>Conectar.</b> Arrastra uno de los puntos que aparecen en los bordes hasta otra figura.</li>
              <li><b>Varias figuras.</b> Mantén Shift y arrastra para seleccionar un grupo.</li>
              <li><b>Borrar.</b> Tecla Supr con algo seleccionado.</li>
            </ul>
          </>
        )}
      </aside>

      {json !== null && (
        <div className="rc-mdl" onPointerDown={(e) => { if (e.target === e.currentTarget) setJson(null) }}>
          <div className="box" role="dialog" aria-modal="true" aria-labelledby="rc-mt">
            <h2 id="rc-mt">Diagrama en JSON</h2>
            <p>Copia este texto para guardar el diagrama. Para cargar otro, pega su JSON y pulsa Cargar.</p>
            <textarea value={json} spellCheck={false} aria-label="JSON del diagrama"
              onChange={(e) => setJson(e.target.value)} />
            <div className="rc-err">{jsonErr}</div>
            <div className="acts">
              <button className="rc-btn" onClick={copyJson}>Copiar</button>
              <button className="rc-btn" onClick={loadJson}>Cargar</button>
              <button className="rc-btn pri" onClick={() => setJson(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Editor(props: Props) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  )
}
