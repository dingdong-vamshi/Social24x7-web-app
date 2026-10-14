import type { TrafficEvent, TrafficOrder } from './repository'
export interface DailyTraffic { date: string; views: number; visitors: number; orders: number }
export function dailyTraffic(events: TrafficEvent[], orders: TrafficOrder[], from: string, until: string) {
  const localKey = (value: string | Date) => { const d = typeof value === 'string' ? new Date(value) : value; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const buckets = new Map<string, { views: number; visitors: Set<string>; orders: number }>()
  const day = new Date(from), last = localKey(until)
  for (let count = 0; count < 31 && localKey(day) <= last; count++, day.setDate(day.getDate() + 1)) buckets.set(localKey(day), { views: 0, visitors: new Set(), orders: 0 })
  for (const event of events) {
    const bucket = buckets.get(localKey(event.occurred_at)); if (!bucket) continue
    if (event.event_type === 'storefront_view') bucket.views++
    if (event.visitor_id) bucket.visitors.add(`user:${event.visitor_id}`)
    else if (event.session_key) bucket.visitors.add(`session:${event.session_key}`)
  }
  for (const order of orders) { const bucket = buckets.get(localKey(order.created_at)); if (bucket) bucket.orders++ }
  const qualifying = orders.filter(order => !['draft', 'cancelled', 'refunded'].includes(order.status))
  return {
    dailySeries: [...buckets].map(([date, bucket]): DailyTraffic => ({ date, views: bucket.views, visitors: bucket.visitors.size, orders: bucket.orders })),
    dailyVisitors: buckets.get(last)?.visitors.size ?? 0,
    paymentMix: [
      { label: 'Cash on delivery', value: qualifying.filter(order => order.payment_method === 'cod').length },
      { label: 'Other payment methods', value: qualifying.filter(order => order.payment_method && order.payment_method !== 'cod').length },
      { label: 'Not recorded', value: qualifying.filter(order => !order.payment_method).length },
    ],
  }
}
