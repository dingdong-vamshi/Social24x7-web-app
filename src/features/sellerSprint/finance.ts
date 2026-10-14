export interface FinanceOrder { id: string; currency: string; status: string; total_minor: number }
export interface FinanceCommission { order_id: string; commission_minor: number; status: string }
export interface FinanceReturn { id: string; status: string; order_item_id: string }
export interface FinanceItem { id: string; order_id: string; subtotal_minor: number }
export interface FinanceCurrency { currency: string; gross: number; delivered: number; commission: number; returns: number; estimate: number; orders: number }
export function summarizeFinance(orders: FinanceOrder[], commissions: FinanceCommission[], returns: FinanceReturn[], items: FinanceItem[]) {
  const currencies = new Map<string, FinanceCurrency>(), byOrder = new Map(orders.map(order => [order.id, order]))
  function totals(currency: string) {
    if (!currencies.has(currency)) currencies.set(currency, { currency, gross: 0, delivered: 0, commission: 0, returns: 0, estimate: 0, orders: 0 })
    return currencies.get(currency)!
  }
  for (const order of orders) {
    const summary = totals(order.currency)
    if (!['draft', 'cancelled', 'refunded'].includes(order.status)) { summary.gross += order.total_minor; summary.orders++ }
    if (order.status === 'delivered') summary.delivered += order.total_minor
  }
  for (const commission of commissions.filter(row => !['reversed', 'cancelled'].includes(row.status))) {
    const order = byOrder.get(commission.order_id)
    if (!order) throw new Error('A commission has no accessible order currency. An incomplete financial estimate is not shown.')
    totals(order.currency).commission += commission.commission_minor
  }
  const approved = new Set(returns.filter(row => ['approved', 'received', 'refunded'].includes(row.status)).map(row => row.order_item_id))
  const itemMap = new Map(items.map(item => [item.id, item]))
  for (const id of approved) {
    const item = itemMap.get(id), order = item && byOrder.get(item.order_id)
    if (!item || !order) throw new Error('An approved return has no accessible order item. An incomplete financial estimate is not shown.')
    totals(order.currency).returns += item.subtotal_minor
  }
  for (const summary of currencies.values()) summary.estimate = Math.max(0, summary.gross - summary.commission - summary.returns)
  return [...currencies.values()]
}
