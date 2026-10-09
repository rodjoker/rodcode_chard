import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createDiagram, deleteDiagram, logout } from './actions'

const fmt = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="8" height="6" rx="1.5" stroke="var(--rc-accent)" strokeWidth="1.8" />
      <rect x="14" y="15" width="8" height="6" rx="1.5" stroke="var(--rc-flow)" strokeWidth="1.8" />
      <path d="M6 9v3.5a2.5 2.5 0 0 0 2.5 2.5H14" stroke="var(--rc-ink)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('id', user.id)
    .single()

  const { data: diagrams } = await supabase
    .from('diagrams')
    .select('id, title, updated_at, data')
    .order('updated_at', { ascending: false })

  return (
    <div className="rc-page">
      <header className="rc-bar">
        <div className="rc-brand">
          <Logo />
          <span>Rodchard</span>
        </div>
        <div className="grow" />
        <Link href="/dashboard/profile" className="rc-user">
          <span>{profile?.full_name ?? profile?.email}</span>
          {profile?.role && <span className="rc-chip">{profile.role}</span>}
        </Link>
        <form action={logout}>
          <button type="submit" className="rc-btn">Cerrar sesión</button>
        </form>
      </header>

      <main className="rc-main">
        <div className="rc-head">
          <div>
            <h1>Mis diagramas</h1>
            <p className="sub">Flujos de centro de contacto guardados en tu cuenta.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <form action={createDiagram}>
              <input type="hidden" name="template" value="example" />
              <button type="submit" className="rc-btn">Nuevo desde ejemplo</button>
            </form>
            <form action={createDiagram}>
              <button type="submit" className="rc-btn pri">Nuevo en blanco</button>
            </form>
          </div>
        </div>

        {diagrams && diagrams.length > 0 ? (
          <ul className="rc-list">
            {diagrams.map((d) => {
              const count = Array.isArray((d.data as { nodes?: unknown })?.nodes)
                ? (d.data as { nodes: unknown[] }).nodes.length
                : 0
              return (
                <li key={d.id} className="rc-row">
                  <div className="rc-thumb" aria-hidden="true">
                    <Logo size={20} />
                  </div>
                  <Link href={`/editor/${d.id}`} className="rc-rowlink">
                    <strong>{d.title}</strong>
                    <span>
                      {count} figuras · editado {fmt.format(new Date(d.updated_at))}
                    </span>
                  </Link>
                  <form action={deleteDiagram}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="rc-btn dng" aria-label={`Eliminar ${d.title}`}>
                      Eliminar
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rc-empty">
            <strong>Aún no tienes diagramas</strong>
            <p>Empieza en blanco o con el flujo bancario de ejemplo para ver cómo funciona.</p>
          </div>
        )}
      </main>
    </div>
  )
}
