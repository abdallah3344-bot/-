import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * رابط المكتب الفرعي: <slug>.masryps.com يفتح النظام باسم ذلك المكتب،
 * ويقبل دخول مستخدميه فقط. الرابط العام (law.masryps.com) يقبل الجميع
 * ويحدَّد المكتب من حساب المستخدم.
 */
const ROOT_DOMAIN = 'masryps.com'
const GENERIC = new Set(['law', 'www'])

export type HostOffice = { id: string; name: string; logo: string | null }

export async function getHostSlug(): Promise<string | null> {
  const host = (await headers()).get('host')?.toLowerCase().split(':')[0] ?? ''
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return null
  const slug = host.slice(0, -(ROOT_DOMAIN.length + 1))
  if (!slug || slug.includes('.') || GENERIC.has(slug)) return null
  return slug
}

/** المكتب الذي فُتح النظام من رابطه — null في الرابط العام. */
export const getHostOffice = cache(async (): Promise<HostOffice | null> => {
  const slug = await getHostSlug()
  if (!slug) return null
  const supabase = await createClient()
  const { data } = await supabase.rpc('office_public_info', { _slug: slug } as never)
  if (!data || typeof data !== 'object') return null
  const info = data as { id: string; name: string; logo: string | null }
  return { id: info.id, name: info.name, logo: info.logo ?? null }
})
