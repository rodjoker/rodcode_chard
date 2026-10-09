// Flujo de ejemplo: la estrategia bancaria de la guía de Amazon Connect.
import { KINDS, type DiagramData, type KindId, type StoredEdge, type StoredNode } from './kinds'

export function exampleDiagram(): DiagramData {
  const nodes: StoredNode[] = []
  const edges: StoredEdge[] = []
  const N = (
    id: string, type: KindId, x: number, y: number, label?: string,
    size?: { w?: number; h?: number }, parentId?: string,
  ) => {
    const k = KINDS[type]
    nodes.push({
      id, type, position: { x, y },
      width: size?.w ?? k.w, height: size?.h ?? k.h,
      ...(parentId ? { parentId } : {}),
      data: { label: label ?? k.label },
    })
  }
  const E = (source: string, target: string, sh = 'r', th = 'l') =>
    edges.push({ id: `e-${source}-${target}`, source, target, sourceHandle: sh, targetHandle: th })

  N('c1', 'customer', 95, 110, 'Customer')
  N('e1', 'entry', 128, 262)
  N('fm', 'flow', 252, 268, 'Flow')
  N('f1', 'flow', 322, 225, '')
  N('f2', 'flow', 322, 271, '')
  N('f3', 'flow', 322, 317, '')
  N('f4', 'flow', 322, 363, '')
  N('fg', 'flow', 396, 190, '')
  N('fs', 'flow', 396, 322, '')
  N('fl', 'flow', 396, 462, 'Flow')

  // Las colas van antes que sus hijos: React Flow exige el padre primero en el arreglo.
  const queues: Array<[string, string, number, number, number]> = [
    ['q1', 'General queue', 45, 120, 2],
    ['q2', 'Checking queue', 175, 90, 0],
    ['q3', 'Savings queue', 275, 90, 0],
    ['q4', 'Loans queue', 375, 120, 2],
    ['q5', 'Mortgage queue', 505, 90, 0],
  ]
  for (const [id, label, y, h, chats] of queues) {
    N(id, 'queue', 484, y, label, { h })
    for (let i = 0; i < 3; i++) N(`${id}p${i}`, 'phone', 22 + i * 70, 30, '', undefined, id)
    for (let i = 0; i < chats; i++) N(`${id}c${i}`, 'chat', 19 + i * 70, 86, '', undefined, id)
  }

  N('b1', 'brace', 736, 45, '', { h: 320 })
  N('b2', 'brace', 736, 375, '', { h: 220 })
  N('r1', 'profile', 768, 128, 'Routing profile:\nBanking1')
  N('r2', 'profile', 768, 392, 'Routing profile:\nLoans1')
  N('a1', 'agents', 940, 196, 'Agents')
  N('a2', 'agents', 940, 468, 'Agents')
  N('s1', 'strategy', 950, 326, 'Contact center strategy')
  ;([['1', 166, 318], ['2', 398, 544], ['3', 490, 178], ['4', 694, 178], ['5', 772, 84], ['6', 880, 84], ['7', 992, 290], ['8', 1096, 410]] as const)
    .forEach(([l, x, y], i) => N(`k${i}`, 'badge', x, y, l))

  E('e1', 'fm'); E('fm', 'f1'); E('fm', 'f2'); E('fm', 'f3'); E('fm', 'f4')
  E('fm', 'fl', 'b', 't')
  E('f1', 'fg'); E('f3', 'fs'); E('fg', 'q1'); E('fg', 'q2'); E('fs', 'q3'); E('fl', 'q4'); E('fl', 'q5')
  E('b1', 'a1'); E('b2', 'a2')
  return { nodes, edges }
}
