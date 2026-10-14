import type { SupabaseClient } from '@supabase/supabase-js'

/** Presentation only. Never write the prefix into legal/profile names. */
export async function verifiedDisplayNames(client: SupabaseClient, ids: string[]) {
  const names: Record<string, string> = {}
  const unique = [...new Set(ids)]
  for (let offset = 0; offset < unique.length; offset += 100) {
    try {
      const result = await client.rpc('get_partner_display_names', { target_ids: unique.slice(offset, offset + 100) })
      if (result.error || !Array.isArray(result.data)) continue
      for (const row of result.data) if (row.verified_doctor === true && typeof row.display_name === 'string') names[row.id] = row.display_name
    } catch { /* Fail closed: unavailable verification never adds a title. */ }
  }
  return names
}
