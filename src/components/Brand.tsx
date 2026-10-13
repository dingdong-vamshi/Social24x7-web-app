import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="SOCIAL 24-7 home">
      <span className="brand-mark" aria-hidden="true"><MessageCircle size={25} fill="white" color="white" /></span>
      {!compact && <span><strong>SOCIAL 24-7</strong><small>Connect. Share. Always.</small></span>}
    </Link>
  )
}
