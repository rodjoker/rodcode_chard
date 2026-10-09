// Valida y limpia un diagrama que viene de fuera (JSON pegado o petición al servidor).
// Descarta lo inválido en vez de fallar, y recorta tamaños para no guardar basura en la BD.
import { KINDS, isKind, type DiagramData, type StoredEdge, type StoredNode } from './kinds'

const MAX_NODES = 500
const MAX_EDGES = 1000
const HANDLES = new Set(['t', 'r', 'b', 'l'])

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null
const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null

export function sanitizeDiagram(raw: unknown): DiagramData | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { nodes?: unknown; edges?: unknown }
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges)) return null
  if (r.nodes.length > MAX_NODES || r.edges.length > MAX_EDGES) return null

  const nodes: StoredNode[] = []
  const ids = new Set<string>()
  for (const n of r.nodes) {
    if (!n || typeof n !== 'object') continue
    const o = n as Record<string, unknown>
    const id = str(o.id, 64)
    if (!id || ids.has(id) || !isKind(o.type)) continue
    const pos = o.position as { x?: unknown; y?: unknown } | undefined
    const x = num(pos?.x, -1e5, 1e5)
    const y = num(pos?.y, -1e5, 1e5)
    if (x === null || y === null) continue
    const k = KINDS[o.type]
    const label = (o.data as { label?: unknown } | undefined)?.label
    ids.add(id)
    nodes.push({
      id,
      type: o.type,
      position: { x, y },
      width: num(o.width, 8, 4000) ?? k.w,
      height: num(o.height, 8, 4000) ?? k.h,
      ...(typeof o.parentId === 'string' ? { parentId: o.parentId } : {}),
      data: { label: typeof label === 'string' ? label.slice(0, 500) : k.label },
    })
  }

  // Un padre válido es una cola que existe; si no, el nodo queda suelto.
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const n of nodes) {
    if (!n.parentId) continue
    const p = byId.get(n.parentId)
    if (!p || p === n || !KINDS[p.type].container || p.parentId || KINDS[n.type].container) delete n.parentId
  }

  const edges: StoredEdge[] = []
  const eids = new Set<string>()
  for (const e of r.edges) {
    if (!e || typeof e !== 'object') continue
    const o = e as Record<string, unknown>
    const id = str(o.id, 128)
    const source = str(o.source, 64)
    const target = str(o.target, 64)
    if (!id || !source || !target || eids.has(id) || !ids.has(source) || !ids.has(target)) continue
    eids.add(id)
    edges.push({
      id, source, target,
      sourceHandle: typeof o.sourceHandle === 'string' && HANDLES.has(o.sourceHandle) ? o.sourceHandle : null,
      targetHandle: typeof o.targetHandle === 'string' && HANDLES.has(o.targetHandle) ? o.targetHandle : null,
    })
  }
  return { nodes, edges }
}
