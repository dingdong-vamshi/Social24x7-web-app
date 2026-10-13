import { Link } from 'react-router-dom'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="Social24 Partner home">
      <span className="brand-mark" aria-hidden="true"><i /></span>
      {!compact && <span><strong>Social24</strong><small>Partner</small></span>}
    </Link>
  )
}
