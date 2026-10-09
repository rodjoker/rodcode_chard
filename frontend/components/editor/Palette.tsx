'use client'
import { GROUPS, KINDS, KIND_IDS, type KindId } from '@/lib/diagram/kinds'
import { ShapePreview } from './Shapes'

export const DRAG_MIME = 'application/x-rodchard-kind'

export default function Palette({ onAdd }: { onAdd: (type: KindId) => void }) {
  return (
    <nav className="rc-pal" aria-label="Figuras">
      {GROUPS.map(([group, name]) => (
        <section key={group}>
          <h3>{name}</h3>
          <div className="rc-pgrid">
            {KIND_IDS.filter((k) => KINDS[k].group === group).map((k) => (
              <button
                key={k}
                type="button"
                className="rc-pi"
                title={KINDS[k].name}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, k)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => onAdd(k)}
              >
                <ShapePreview type={k} />
                <span>{KINDS[k].name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <p className="rc-hint">
        Arrastra una figura al lienzo o pulsa para añadirla. Pasa el mouse sobre una figura y arrastra
        uno de sus puntos para conectarla.
      </p>
    </nav>
  )
}
