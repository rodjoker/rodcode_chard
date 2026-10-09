'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { exampleDiagram } from '@/lib/diagram/example'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// El formulario manda template=example para empezar con el flujo bancario.
export async function createDiagram(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fromExample = formData.get('template') === 'example'
  const { data, error } = await supabase
    .from('diagrams')
    .insert({
      title: fromExample ? 'Estrategia de contacto · Banco' : 'Diagrama sin título',
      data: fromExample ? exampleDiagram() : { nodes: [], edges: [] },
    })
    .select('id')
    .single()
  if (error || !data) throw new Error('No se pudo crear el diagrama')
  redirect(`/editor/${data.id}`)
}

export async function deleteDiagram(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!UUID.test(id)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await supabase.from('diagrams').delete().eq('id', id)
  revalidatePath('/dashboard')
}
