import { label } from '../../repositories/commerce'
import { isUuid } from './repository'

const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const text = (v: unknown) => typeof v === 'string' ? v : ''
export function SharedCommerceMessage({ kind, payload }: { kind: string; payload: unknown }) {
  const value = object(payload), product = object(value.product)
  if (kind === 'product' && isUuid(text(value.product_id)) && product.id === value.product_id) return <div className="chat-attachment"><strong>{text(product.title) || 'Shared company product'}</strong>{typeof product.price_minor === 'number' && Number.isFinite(product.price_minor) && <span>{(product.price_minor / 100).toLocaleString('en-IN', { style: 'currency', currency: /^[A-Z]{3}$/.test(text(product.currency)) ? text(product.currency) : 'INR' })}</span>}<small>Product snapshot · viewing does not place an order.</small></div>
  if (kind === 'order' && isUuid(text(value.order_id))) return <div className="chat-attachment"><strong>Order #{text(value.order_id).slice(0, 8).toUpperCase()}</strong><span>{label(text(value.order_status))}</span>{(Array.isArray(value.items) ? value.items : []).slice(0, 100).map((item, index) => <p key={index}>{text(object(item).product_title_snapshot) || 'Order item'} · Quantity {typeof object(item).quantity === 'number' ? String(object(item).quantity) : '—'}</p>)}<small>Conversation snapshot · check Order history for current status.</small></div>
  return <p className="chat-content-note">Shared {label(kind).toLowerCase()} details unavailable.</p>
}
