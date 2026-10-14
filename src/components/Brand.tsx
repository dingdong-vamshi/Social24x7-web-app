import { SurfaceLink as Link } from './SurfaceLink'

type BrandVariant = 'icon' | 'full' | 'compact' | 'sidebar' | 'footer'

export function Brand({ compact = false, variant = 'compact' }: { compact?: boolean; variant?: BrandVariant }) {
  const presentation = compact ? 'icon' : variant
  const full = presentation === 'full'
  return (
    <Link className={`brand brand--${presentation}`} to="/" aria-label="SOCIAL 24-7 home">
      <img className={full ? 'brand-full' : 'brand-mark'}
        src={`/branding/social24-7-${full ? 'logo' : 'icon'}-v1.webp`}
        width={full ? 724 : 419} height={full ? 680 : 433} alt="" />
      {!full && presentation !== 'icon' && <span className="brand-wordmark"><strong>SOCIAL 24-7</strong><small>Connect. Share. Always.</small></span>}
    </Link>
  )
}
