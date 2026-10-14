import type { DailyTraffic } from './analytics'

export function TrafficCharts({ rows, paymentMix }: { rows: DailyTraffic[]; paymentMix: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.flatMap(row => [row.views, row.visitors, row.orders]))
  const width = 700, height = 210, step = (width - 60) / Math.max(rows.length, 1)
  const series = [{ key: 'views' as const, label: 'Storefront views', color: '#16724c' }, { key: 'visitors' as const, label: 'Unique visitors', color: '#5583b5' }, { key: 'orders' as const, label: 'Recorded orders', color: '#b87913' }]
  const total = paymentMix.reduce((sum, row) => sum + row.value, 0)
  return <><figure style={{ margin: '24px 0', minWidth: 0 }}><figcaption>Daily recorded activity · local calendar days</figcaption><svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Daily storefront views, unique visitors and recorded orders. Exact values follow in the data table.">
    <line x1="35" x2={width - 10} y1="175" y2="175" stroke="#a5b5aa"/><text x="5" y="178" fontSize="11">0</text><text x="5" y="25" fontSize="11">{max}</text>
    {rows.map((row, index) => <g key={row.date}>{series.map((item, s) => <rect key={item.key} x={40 + index * step + s * step / 4} y={175 - row[item.key] / max * 150} width={step / 4 - 1} height={row[item.key] / max * 150} fill={item.color}><title>{row.date}: {item.label} {row[item.key]}</title></rect>)}{index % Math.ceil(rows.length / 7) === 0 && <text x={40 + index * step} y="195" fontSize="10">{row.date.slice(5)}</text>}</g>)}
  </svg><div className="commerce-row-actions">{series.map(item => <span key={item.key} style={{ color: item.color }}>● {item.label}</span>)}</div><p>Daily order bars include all recorded statuses, matching the original charts. Conversion and payment mix exclude draft, cancelled and refunded orders.</p></figure>
    <details><summary>Daily activity data</summary><div className="table-card commerce-table"><table><thead><tr><th>Date</th><th>Storefront views</th><th>Unique visitors</th><th>Recorded orders</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><td data-label="Date">{row.date}</td><td data-label="Storefront views">{row.views}</td><td data-label="Unique visitors">{row.visitors}</td><td data-label="Recorded orders">{row.orders}</td></tr>)}</tbody></table></div></details>
    <h3>Payment method mix</h3>{total ? <div className="commerce-status-bars">{paymentMix.map(row => <div key={row.label}><span>{row.label}<strong>{row.value}</strong></span><meter aria-label={`${row.label}: ${row.value} qualifying orders`} min={0} max={total} value={row.value}/></div>)}</div> : <p>No qualifying orders in this reporting period.</p>}<p>Recorded method, not payment capture or settlement confirmation.</p></>
}
