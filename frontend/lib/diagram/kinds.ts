// Catálogo de figuras del editor. Cada "kind" es también el `type` del nodo en React Flow.
export type Group = 'cc' | 'fc' | 'an'

export interface Kind {
  name: string
  w: number
  h: number
  group: Group
  label: string // texto por defecto
  resizable?: boolean
  labelBelow?: boolean // el texto va debajo del ícono
  container?: boolean // cola: contiene teléfonos y chats
}

const DEFS = {
  customer: { name: 'Cliente', w: 150, h: 100, group: 'cc', label: 'Customer', labelBelow: true },
  entry: { name: 'Entry point', w: 100, h: 44, group: 'cc', label: 'Entry point' },
  flow: { name: 'Flow', w: 52, h: 40, group: 'cc', label: 'Flow', labelBelow: true },
  queue: { name: 'Cola (Queue)', w: 240, h: 110, group: 'cc', label: 'Queue', resizable: true, container: true },
  phone: { name: 'Voz', w: 36, h: 48, group: 'cc', label: '' },
  chat: { name: 'Chat', w: 42, h: 34, group: 'cc', label: '' },
  profile: { name: 'Routing profile', w: 170, h: 44, group: 'cc', label: 'Routing profile:\nProfile1' },
  agents: { name: 'Agentes', w: 96, h: 72, group: 'cc', label: 'Agents', labelBelow: true },
  strategy: { name: 'Estrategia', w: 104, h: 64, group: 'cc', label: 'Contact center strategy', labelBelow: true },
  proc: { name: 'Proceso', w: 120, h: 60, group: 'fc', label: 'Proceso', resizable: true },
  dec: { name: 'Decisión', w: 120, h: 80, group: 'fc', label: '¿Condición?', resizable: true },
  term: { name: 'Inicio / Fin', w: 110, h: 44, group: 'fc', label: 'Inicio', resizable: true },
  data: { name: 'Datos', w: 130, h: 56, group: 'fc', label: 'Datos', resizable: true },
  text: { name: 'Texto', w: 130, h: 30, group: 'an', label: 'Texto' },
  brace: { name: 'Llave', w: 24, h: 160, group: 'an', label: '', resizable: true },
  badge: { name: 'Paso', w: 28, h: 28, group: 'an', label: '1' },
  note: { name: 'Nota', w: 130, h: 80, group: 'an', label: 'Nota', resizable: true },
} satisfies Record<string, Kind>

export type KindId = keyof typeof DEFS
// Tipado ancho (con campos opcionales) para poder leer `container`, `resizable`, etc. en cualquier figura.
export const KINDS: Record<KindId, Kind> = DEFS
export const KIND_IDS = Object.keys(KINDS) as KindId[]
export const isKind = (t: unknown): t is KindId => typeof t === 'string' && t in KINDS
export const kindOf = (id: KindId): Kind => KINDS[id]

export const GROUPS: Array<[Group, string]> = [
  ['cc', 'Centro de contacto'],
  ['fc', 'Diagrama de flujo'],
  ['an', 'Anotaciones'],
]

// Forma que se guarda en la BD (jsonb) y se exporta como JSON.
export interface StoredNode {
  id: string
  type: KindId
  position: { x: number; y: number }
  width: number
  height: number
  parentId?: string
  data: { label: string }
}
export interface StoredEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}
export interface DiagramData {
  nodes: StoredNode[]
  edges: StoredEdge[]
}
