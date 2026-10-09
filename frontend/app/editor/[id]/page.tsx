import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizeDiagram } from '@/lib/diagram/sanitize'
import Editor from '@/components/editor/Editor'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = { title: 'Editor · Rodchard' }

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: row } = await supabase
    .from('diagrams')
    .select('id, title, data')
    .eq('id', id)
    .maybeSingle()
  if (!row) notFound()

  const data = sanitizeDiagram(row.data) ?? { nodes: [], edges: [] }
  return <Editor id={row.id} initialTitle={row.title} initialData={data} />
}
