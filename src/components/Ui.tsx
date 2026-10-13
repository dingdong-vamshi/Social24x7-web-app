import type { ReactNode } from 'react'
import { ArrowRight, LoaderCircle, Search, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { announcePreviewAction } from '../utils/preview'

export function Button({ children, to, variant = 'primary', type = 'button', onClick, disabled }: { children: ReactNode; to?: string; variant?: 'primary' | 'secondary' | 'ghost'; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean }) {
  const className = `button ${variant}`
  const action = onClick ?? (type === 'submit' ? undefined : () => announcePreviewAction())
  return to ? <Link className={className} to={to}>{children}</Link> : <button className={className} type={type} onClick={action} disabled={disabled}>{children}</button>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</header>
}

export function MetricCard({ label, value, detail, tone = 'plain', icon }: { label: string; value: string; detail: string; tone?: 'plain' | 'green' | 'dark'; icon?: ReactNode }) {
  return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{detail}</small></article>
}

export function StatusPill({ children }: { children: ReactNode }) {
  const key = String(children).toLowerCase().replaceAll(' ', '-')
  return <span className={`status-pill ${key}`}>{children}</span>
}

export function FilterBar({ placeholder = 'Search', children }: { placeholder?: string; children?: ReactNode }) {
  return <div className="filter-bar"><label className="search-field"><Search size={17} /><span className="sr-only">Search</span><input placeholder={placeholder} /></label>{children}</div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="state-panel"><div className="state-icon"><Search size={22} /></div><h3>{title}</h3><p>{description}</p></div>
}

export function ErrorState({ message = 'Something went wrong. Please try again.' }: { message?: string }) {
  return <div className="state-panel error"><TriangleAlert size={28} /><h3>Unable to load this view</h3><p>{message}</p></div>
}

export function LoadingState() {
  return <div className="state-panel"><LoaderCircle className="spin" size={28} /><p>Loading business data…</p></div>
}

export function SectionCard({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`section-card ${className}`}><div className="section-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>
}

export function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="inline-link" to={to}>{children}<ArrowRight size={15} /></Link>
}
