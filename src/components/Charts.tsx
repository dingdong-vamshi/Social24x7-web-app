import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const revenueData = [
  { day: 'Mon', value: 18200, orders: 18 }, { day: 'Tue', value: 24900, orders: 24 }, { day: 'Wed', value: 21300, orders: 20 }, { day: 'Thu', value: 32800, orders: 31 }, { day: 'Fri', value: 28900, orders: 27 }, { day: 'Sat', value: 36400, orders: 35 }, { day: 'Sun', value: 41800, orders: 39 },
]

export function RevenueChart() {
  return <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueData} margin={{ left: -18, right: 8 }}><defs><linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2eaf70" stopOpacity={0.34}/><stop offset="1" stopColor="#2eaf70" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7ece9" /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} /><Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Net sales']} /><Area type="monotone" dataKey="value" stroke="#16724c" strokeWidth={3} fill="url(#areaGreen)" /></AreaChart></ResponsiveContainer></div>
}

export function OrdersChart() {
  return <div className="chart compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenueData}><CartesianGrid vertical={false} stroke="#e7ece9" /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="orders" fill="#2eaf70" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
}
