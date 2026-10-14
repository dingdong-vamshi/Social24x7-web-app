import type { Order } from '../../repositories/commerce'

// Same payment-aware operational groupings as original seller-order-return-filters.ts.
export const operationalOrderQueues = ['on_hold', 'pending', 'ready_to_ship', 'in_transit']
export function matchesOrderQueue(order: Pick<Order, 'status' | 'payment_status'>, queue: string) {
  const onHold = order.status === 'placed' && !['captured', 'captured_test', 'paid', 'cod_pending', 'cod_collected'].includes((order.payment_status || '').toLowerCase())
  if (queue === 'on_hold') return onHold
  if (queue === 'pending') return ['placed', 'confirmed'].includes(order.status) && !onHold
  if (queue === 'ready_to_ship') return order.status === 'processing'
  if (queue === 'in_transit') return ['shipped', 'out_for_delivery'].includes(order.status)
  return true
}
