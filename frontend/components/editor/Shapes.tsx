// Dibujo SVG de cada figura. Se usa en el nodo del lienzo y en la miniatura de la paleta.
import type { ReactNode } from 'react'
import { KINDS, type KindId } from '@/lib/diagram/kinds'

function Text({ lines, x, y, cls, top }: { lines: string[]; x: number; y: number; cls: string; top?: boolean }) {
  const k = lines.length
  return (
    <text className={cls} x={x} y={y} textAnchor="middle" dominantBaseline="central">
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={`${i ? 1.2 : top ? 0 : -(k - 1) * 0.6}em`}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

function Person({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <circle className="sf" cx={cx} cy={cy} r={r} />
      <path
        className="sf"
        d={`M${cx - 1.8 * r} ${cy + 3.4 * r}C${cx - 1.8 * r} ${cy + 1.7 * r} ${cx - 0.9 * r} ${cy + 1.4 * r} ${cx} ${cy + 1.4 * r}S${cx + 1.8 * r} ${cy + 1.7 * r} ${cx + 1.8 * r} ${cy + 3.4 * r}Z`}
      />
    </>
  )
}

function Headset({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <path className="s" d={`M${cx - 1.3 * r} ${cy + 0.1 * r}a${1.3 * r} ${1.3 * r} 0 0 1 ${2.6 * r} 0`} />
      <rect className="fi" x={cx - 1.6 * r} y={cy - 0.15 * r} width={0.55 * r} height={r} rx={0.2 * r} />
      <rect className="fi" x={cx + 1.05 * r} y={cy - 0.15 * r} width={0.55 * r} height={r} rx={0.2 * r} />
    </>
  )
}

interface Props {
  type: KindId
  w: number
  h: number
  label: string
  preview?: boolean
}

export function ShapeBody({ type, w, h, label, preview }: Props): ReactNode {
  const L = String(label || '').split('\n')
  const below = !preview && KINDS[type].labelBelow && label ? <Text lines={L} x={w / 2} y={h + 14} cls="t" top /> : null
  const inner = label ? <Text lines={L} x={w / 2} y={h / 2} cls="t" /> : null

  switch (type) {
    case 'customer':
      return (
        <>
          {[0, 1].flatMap((r) =>
            [0, 1, 2].map((c) => <Person key={`${r}${c}`} cx={w * (0.2 + 0.3 * c)} cy={14 + r * 44} r={9} />),
          )}
          {below}
        </>
      )
    case 'entry':
      return (
        <>
          <rect className="sf" width={w} height={h} rx={10} />
          {inner}
        </>
      )
    case 'flow':
      return (
        <>
          <rect className="sf" width={w} height={h} rx={6} />
          <path className="fl" d={`M10 12H${w - 10}M10 20H${w - 18}M10 28H${w - 26}`} />
          {below}
        </>
      )
    case 'queue':
      return (
        <>
          <rect className="qf" width={w} height={h} rx={4} />
          {label ? <Text lines={L} x={w / 2} y={16} cls="t tb" /> : null}
        </>
      )
    case 'phone':
      return (
        <>
          <rect className="sf" x={8} y={3} width={20} height={38} rx={4} />
          <path className="s" d="M15 7h6" />
          <circle className="fi" cx={18} cy={36} r={1.4} />
          <path className="wv" d="M5 15q-3 6 0 12M1.5 12q-5 9 0 18M31 15q3 6 0 12M34.5 12q5 9 0 18" />
        </>
      )
    case 'chat':
      return (
        <>
          <path className="fch" d="M4 2h34a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H18l-7 7v-7H4a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3z" />
          <circle className="dt" cx={13} cy={13.5} r={2} />
          <circle className="dt" cx={21} cy={13.5} r={2} />
          <circle className="dt" cx={29} cy={13.5} r={2} />
        </>
      )
    case 'profile':
      return preview ? <Text lines={['Aa']} x={w / 2} y={h / 2} cls="t tb" /> : inner
    case 'agents':
      return (
        <>
          <Person cx={w * 0.27} cy={13} r={8} />
          <Headset cx={w * 0.27} cy={13} r={8} />
          <Person cx={w * 0.73} cy={13} r={8} />
          <Headset cx={w * 0.73} cy={13} r={8} />
          <Person cx={w * 0.5} cy={40} r={8} />
          <Headset cx={w * 0.5} cy={40} r={8} />
          {below}
        </>
      )
    case 'strategy':
      return (
        <>
          <Person cx={24} cy={13} r={9} />
          <rect className="sf" x={44} y={14} width={52} height={34} rx={3} />
          <path className="s" d="M36 54H104" />
          {below}
        </>
      )
    case 'proc':
      return (
        <>
          <rect className="sf" width={w} height={h} rx={3} />
          {inner}
        </>
      )
    case 'dec':
      return (
        <>
          <polygon className="sf" points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} />
          {inner}
        </>
      )
    case 'term':
      return (
        <>
          <rect className="sf" width={w} height={h} rx={h / 2} />
          {inner}
        </>
      )
    case 'data': {
      const s = Math.min(18, w / 4)
      return (
        <>
          <polygon className="sf" points={`${s},0 ${w},0 ${w - s},${h} 0,${h}`} />
          {inner}
        </>
      )
    }
    case 'text':
      return preview ? <Text lines={['Aa']} x={w / 2} y={h / 2} cls="t" /> : inner
    case 'brace':
      return (
        <path
          className="s"
          d={`M0 0Q${w / 2} 0 ${w / 2} 18L${w / 2} ${h / 2 - 18}Q${w / 2} ${h / 2} ${w} ${h / 2}Q${w / 2} ${h / 2} ${w / 2} ${h / 2 + 18}L${w / 2} ${h - 18}Q${w / 2} ${h} 0 ${h}`}
        />
      )
    case 'badge':
      return (
        <>
          <circle className="bd" cx={w / 2} cy={h / 2} r={w / 2} />
          <Text lines={[label || '']} x={w / 2} y={h / 2} cls="t tw" />
        </>
      )
    case 'note':
      return (
        <>
          <rect className="nt" width={w} height={h} rx={2} />
          {label ? <Text lines={L} x={w / 2} y={h / 2} cls="t tn" /> : null}
        </>
      )
  }
}

// Miniatura para la paleta.
export function ShapePreview({ type }: { type: KindId }) {
  const k = KINDS[type]
  let w: number = k.w
  let h: number = k.h
  let label = ''
  if (type === 'queue') { w = 130; h = 64 }
  if (type === 'brace') { w = 22; h = 70 }
  if (type === 'badge') label = '1'
  if (type === 'entry') label = 'Entry'
  return (
    <svg viewBox={`-3 -3 ${w + 6} ${h + 6}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <ShapeBody type={type} w={w} h={h} label={label} preview />
    </svg>
  )
}
