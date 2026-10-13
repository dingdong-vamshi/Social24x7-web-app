export function safeNext(value: string | null, fallback = '/onboarding') {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/^\/(partner\/|web\/)?(login|register)(\/|\?|$)/.test(value) ? value : fallback
}
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}
