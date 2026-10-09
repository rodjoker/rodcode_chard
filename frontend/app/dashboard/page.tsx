import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createDiagram, deleteDiagram, logout } from './actions'

const fmt = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

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
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">Rodchard</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/profile"
              className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
            >
              {profile?.full_name ?? profile?.email}
              {profile?.role && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize">{profile.role}</span>}
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-900">Mis diagramas</h2>
          <div className="flex gap-2">
            <form action={createDiagram}>
              <input type="hidden" name="template" value="example" />
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Nuevo desde ejemplo
              </button>
            </form>
            <form action={createDiagram}>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Nuevo en blanco
              </button>
            </form>
          </div>
        </div>

        {diagrams && diagrams.length > 0 ? (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {diagrams.map((d) => {
              const count = Array.isArray((d.data as { nodes?: unknown })?.nodes)
                ? (d.data as { nodes: unknown[] }).nodes.length
                : 0
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/editor/${d.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 hover:underline">{d.title}</p>
                    <p className="text-xs text-zinc-500">
                      {count} figuras · editado {fmt.format(new Date(d.updated_at))}
                    </p>
                  </Link>
                  <form action={deleteDiagram}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2.5 py-1 text-sm text-red-600 hover:bg-red-50"
                      aria-label={`Eliminar ${d.title}`}
                    >
                      Eliminar
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="font-medium text-zinc-900">Aún no tienes diagramas</p>
            <p className="mt-1 text-sm text-zinc-500">
              Empieza en blanco o con el flujo bancario de ejemplo para ver cómo funciona.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
