'use client'
import { memo } from 'react'
import { Handle, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react'
import { KINDS, type KindId } from '@/lib/diagram/kinds'
import { ShapeBody } from './Shapes'

export type DiagramNode = Node<{ label: string }, KindId>

const SIDES: Array<[string, Position]> = [
  ['t', Position.Top],
  ['r', Position.Right],
  ['b', Position.Bottom],
  ['l', Position.Left],
]

function ShapeNodeImpl({ type, data, selected, width, height }: NodeProps<DiagramNode>) {
  const k = KINDS[type]
  const w = width ?? k.w
  const h = height ?? k.h
  return (
    <div className="rc-node" style={{ width: w, height: h }}>
      {k.resizable && <NodeResizer isVisible={selected} minWidth={24} minHeight={24} />}
      <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
        <ShapeBody type={type} w={w} h={h} label={data.label} />
      </svg>
      {/* Con connectionMode "loose" cualquier punto sirve de origen y destino. */}
      {SIDES.map(([id, pos]) => (
        <Handle key={id} id={id} type="source" position={pos} />
      ))}
    </div>
  )
}

export default memo(ShapeNodeImpl)
