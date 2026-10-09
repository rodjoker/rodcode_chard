'use server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeDiagram } from '@/lib/diagram/sanitize'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function saveDiagram(
  id: string,
  title: string,
  data: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID.test(id)) return { ok: false, error: 'Diagrama no válido' }
  const clean = sanitizeDiagram(data)
  if (!clean) return { ok: false, error: 'El diagrama no es válido o es demasiado grande' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  // RLS ya limita la fila al dueño; .select() permite detectar que no se actualizó nada.
  const { data: rows, error } = await supabase
    .from('diagrams')
    .update({ title: title.trim().slice(0, 80) || 'Diagrama sin título', data: clean })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: 'No se pudo guardar' }
  if (!rows?.length) return { ok: false, error: 'Diagrama no encontrado' }
  return { ok: true }
}
