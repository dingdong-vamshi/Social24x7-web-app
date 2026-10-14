export const creatorPlatforms = ['instagram', 'facebook', 'tiktok', 'youtube', 'website'] as const
export const sellerPlatforms = ['website', 'instagram', 'facebook', 'googleMaps'] as const
export type SocialPlatform = typeof creatorPlatforms[number] | 'googleMaps'
export const platformLabels: Record<SocialPlatform, string> = { website: 'Business website', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', googleMaps: 'Google Maps business link' }
const hosts: Partial<Record<SocialPlatform, string[]>> = {
  instagram: ['instagram.com'], facebook: ['facebook.com', 'fb.com'], tiktok: ['tiktok.com'], youtube: ['youtube.com'], googleMaps: ['google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'],
}
export function socialUrl(value: string, platform: SocialPlatform): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const input = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try { url = new URL(input) } catch { throw new Error(`Enter a valid ${platformLabels[platform]} URL.`) }
  if (url.protocol !== 'https:' || url.username || url.password || /[\s\\]/.test(input) || !url.hostname.includes('.') || url.port || /\.(local|localhost|internal)$/.test(url.hostname) || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw new Error('Use a public HTTPS URL without a password or custom port.')
  const domain = url.hostname.toLowerCase().replace(/^www\./, '')
  if (hosts[platform] && !hosts[platform]!.includes(domain)) throw new Error(`Use an official ${platformLabels[platform]} URL.`)
  if (platform !== 'website' && (url.pathname === '/' || !url.pathname)) throw new Error(`Enter your actual ${platformLabels[platform]} profile link.`)
  if (platform === 'googleMaps' && domain === 'google.com' && !url.pathname.startsWith('/maps')) throw new Error('Use a Google Maps business/place link.')
  if (platform === 'googleMaps' && domain === 'goo.gl' && !url.pathname.startsWith('/maps/')) throw new Error('Use a Google Maps business/place link.')
  url.hash = ''
  return url.href
}
export const normalizePan = (value: string) => value.trim().toUpperCase()
export const validPan = (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizePan(value))

// Exact legal names, identifiers and intentional mixed-case names are never rewritten.
const acronyms = new Set(['GST', 'PAN', 'LLP', 'LLC', 'PVT', 'LTD', 'IT', 'AI', 'NGO', 'USA', 'UK'])
export function formatBusinessText(value: string, field: string) {
  if (!['businessName', 'storefrontName', 'city', 'about'].includes(field)) return value
  const trimmed = value.trim().replace(/\s+/g, ' ')
  const word = (part: string) => {
    if (acronyms.has(part)) return part
    if (/^[A-Z][a-z]+[A-Z]/.test(part) || /^[a-z]+[A-Z][a-z]+/.test(part)) return part
    return part.replace(/^[a-zA-Z]/, char => char.toUpperCase()).replace(/(?<=^[A-Za-z]).*/, rest => rest.toLowerCase())
  }
  if (field === 'about') return trimmed.replace(/^[a-z]/, char => char.toUpperCase())
  return trimmed.split(' ').map(word).join(' ')
}
export function applicationSocialLinks(form: Record<string, unknown>, role: 'seller' | 'creator') {
  const selected = Array.isArray(form.selectedPlatforms) ? form.selectedPlatforms : null
  return Object.fromEntries((role === 'seller' ? sellerPlatforms : creatorPlatforms).map(platform => [platform, role === 'creator' && selected && !selected.includes(platform) ? '' : socialUrl(typeof form[platform] === 'string' ? form[platform] as string : '', platform)]))
}
