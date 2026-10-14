import { Link, type LinkProps } from 'react-router-dom'
import { surfaceHref } from '../lib/domains'

/** React Router performs a normal document navigation for other origins. */
export function SurfaceLink({ to, ...props }: LinkProps) {
  return <Link {...props} to={typeof to === 'string' ? surfaceHref(to) : to} />
}
