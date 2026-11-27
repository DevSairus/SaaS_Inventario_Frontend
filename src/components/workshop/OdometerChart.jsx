// frontend/src/components/workshop/OdometerChart.jsx
// Lecturas de kilometraje / horómetro en el tiempo (una sola serie). Las
// lecturas menores a una anterior (posible alteración o error) se marcan en
// rojo con anillo y se explican en el tooltip -- nunca solo por color: el
// componente que lo usa muestra además el aviso en texto.
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const SERIES = '#2563eb';
const CRITICAL = '#dc2626';
const SOURCE_LABEL = {
  ot_ingreso: 'Ingreso OT', ot_entrega: 'Entrega OT', peritaje: 'Peritaje', mantenimiento: 'Mantenimiento',
};
const fmtDate = (t) => new Date(t).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
const fmtNum = (n) => Number(n).toLocaleString('es-CO');

function Dot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  if (payload.anomaly) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={CRITICAL} stroke="#fff" strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={CRITICAL}>!</text>
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill={SERIES} stroke="#fff" strokeWidth={2} />;
}

function Tip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="text-gray-500">{fmtDate(p.t)} · {SOURCE_LABEL[p.source] || p.source}{p.ref ? ` ${p.ref}` : ''}</p>
      <p className="font-semibold text-gray-900">{fmtNum(p.value)} {unit}</p>
      {p.anomaly && <p className="text-red-600 font-medium mt-0.5">⚠ Menor a una lectura anterior</p>}
    </div>
  );
}

export default function OdometerChart({ readings = [], unit = 'km', height = 220 }) {
  const data = readings.map((r) => ({ ...r, t: new Date(r.date).getTime() }));
  if (data.length < 2) {
    return <p className="text-xs text-gray-400 py-6 text-center">Se necesitan al menos dos lecturas para la gráfica.</p>;
  }
  return (
    <div style={{ height }} role="img" aria-label={`Lecturas de ${unit === 'h' ? 'horómetro' : 'kilometraje'} en el tiempo`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#eef0f3" vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}k` : fmtNum(v))} allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false} tickLine={false} width={40} domain={['auto', 'auto']} />
          <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="value" stroke={SERIES} strokeWidth={2} dot={<Dot />} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
