// frontend/src/components/workshop/board/WorkshopBoardView.jsx
// Mapa de ocupación del taller (solo lectura). Lo usan el TV
// (WorkshopDisplayPage, sin login) y la vista interna (WorkshopBoardPage).
// Pensado para leerse a distancia: tema oscuro, placa grande, color por estado.
import { bayKindLabel } from '../../../api/workshopBoard';

export const STATUS_META = {
  recibido:   { label: 'Recibido',   dot: 'bg-sky-400',     chip: 'bg-sky-500/15 text-sky-300 ring-sky-400/40',         bar: 'bg-sky-400' },
  en_proceso: { label: 'En proceso', dot: 'bg-amber-400',   chip: 'bg-amber-500/15 text-amber-300 ring-amber-400/40',   bar: 'bg-amber-400' },
  en_espera:  { label: 'En espera',  dot: 'bg-orange-500',  chip: 'bg-orange-500/15 text-orange-300 ring-orange-400/40', bar: 'bg-orange-500' },
  listo:      { label: 'Listo',      dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40', bar: 'bg-emerald-400' },
};
const STATUS_ORDER = ['recibido', 'en_proceso', 'en_espera', 'listo'];

function duration(fromIso, now) {
  if (!fromIso) return '';
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ${mins % 60 ? `${mins % 60} min` : ''}`.trim();
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24 ? `${h % 24} h` : ''}`.trim();
}

const timeFmt = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
const dateFmt = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

// Entrega prometida: atrasada (roja), hoy (ámbar) o fecha.
function promise(card, now) {
  if (!card.promised_at || card.status === 'listo') return null;
  const t = new Date(card.promised_at).getTime();
  if (t < now) return { tone: 'late', text: `Atrasada ${duration(card.promised_at, now)}` };
  const sameDay = new Date(t).toDateString() === new Date(now).toDateString();
  return sameDay
    ? { tone: 'today', text: `Entrega hoy ${timeFmt(card.promised_at)}` }
    : { tone: 'later', text: `Entrega ${dateFmt(card.promised_at)}` };
}

const PROMISE_TONE = {
  late: 'bg-red-500/20 text-red-300 ring-1 ring-red-400/50',
  today: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/40',
  later: 'text-zinc-400',
};

function Plate({ plate, size = 'lg' }) {
  const cls = size === 'lg'
    ? 'text-[clamp(1.6rem,2.6vw,3rem)] px-3 py-0.5 border-[3px]'
    : 'text-lg px-2 py-0 border-2';
  return (
    <span className={`inline-block rounded-md bg-yellow-400 text-zinc-950 font-black tracking-[0.12em] font-mono leading-tight border-zinc-950 shadow-[0_0_0_2px_rgba(250,204,21,0.5)] ${cls}`}>
      {plate || 'SIN PLACA'}
    </span>
  );
}

function StatusChip({ status, big }) {
  const m = STATUS_META[status] || STATUS_META.recibido;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-semibold ${m.chip} ${big ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs'}`}>
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function BayTile({ bay, now, highlighted }) {
  const c = bay.order;
  const m = c ? STATUS_META[c.status] || STATUS_META.recibido : null;
  const p = c ? promise(c, now) : null;
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border transition-shadow ${
        c ? 'border-zinc-700 bg-zinc-900' : 'border-dashed border-zinc-700/70 bg-zinc-900/40'
      } ${highlighted ? 'board-flash' : ''}`}
    >
      {c && <div className={`h-1.5 ${m.bar}`} />}
      <div className="flex items-start justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <div className="truncate text-[clamp(1rem,1.3vw,1.4rem)] font-bold text-zinc-100">{bay.name}</div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">{bayKindLabel(bay.kind)}</div>
        </div>
        {c && <StatusChip status={c.status} big />}
      </div>
      {c ? (
        <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
          <div><Plate plate={c.plate} /></div>
          <div className="truncate text-[clamp(0.9rem,1.1vw,1.15rem)] text-zinc-300">
            {c.vehicle || '—'}{c.color ? ` · ${c.color}` : ''}
          </div>
          <div className="truncate text-[clamp(0.95rem,1.15vw,1.25rem)] font-medium text-zinc-100">
            🔧 {c.technicians.length ? c.technicians.join(', ') : <span className="text-zinc-500">Sin técnico</span>}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
            <span className="font-mono text-zinc-400">{c.order_number}</span>
            <span className="text-zinc-400">⏱ {duration(c.status_since, now)}</span>
            {c.awaiting_quote && <span className="rounded px-1.5 py-0.5 bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/40">Esperando aprobación</span>}
            {p && <span className={`rounded px-1.5 py-0.5 ${PROMISE_TONE[p.tone]}`}>{p.text}</span>}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center pb-6 pt-4 text-[clamp(1.2rem,1.8vw,2rem)] font-bold tracking-widest text-zinc-600">
          LIBRE
        </div>
      )}
    </div>
  );
}

function QueueRow({ card, now, highlighted }) {
  const p = promise(card, now);
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 ${highlighted ? 'board-flash' : ''}`}>
      <Plate plate={card.plate} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-100">
          {card.technicians.length ? card.technicians.join(', ') : <span className="text-zinc-500">Sin técnico</span>}
        </div>
        <div className="truncate text-xs text-zinc-400">
          {card.order_number} · {duration(card.status_since, now)}
          {card.awaiting_quote ? ' · Esperando aprobación' : ''}
        </div>
      </div>
      {p?.tone === 'late' && <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${PROMISE_TONE.late}`}>Atrasada</span>}
    </div>
  );
}

export default function WorkshopBoardView({ data, now, highlightIds, header }) {
  const hl = highlightIds || new Set();
  const queue = STATUS_ORDER
    .map((s) => ({ status: s, cards: data.unassigned.filter((c) => c.status === s) }))
    .filter((g) => g.cards.length);
  const occupied = data.bays.filter((b) => b.order).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <style>{`
        @keyframes boardFlash { 0%,100% { box-shadow: 0 0 0 0 rgba(250,204,21,0); } 50% { box-shadow: 0 0 0 6px rgba(250,204,21,.85); } }
        .board-flash { animation: boardFlash 1.2s ease-in-out 5; }
      `}</style>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {header}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-sm text-zinc-300 ring-1 ring-zinc-800">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
              <span className="font-bold text-zinc-100">{data.counts?.[s] || 0}</span>
            </span>
          ))}
          {data.bays.length > 0 && (
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-sm text-zinc-300 ring-1 ring-zinc-800">
              Bahías ocupadas <span className="font-bold text-zinc-100">{occupied}/{data.bays.length}</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="min-h-0 overflow-auto">
          {data.bays.length === 0 ? (
            <div className="flex h-full min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
              Esta sede no tiene bahías configuradas. Créalas en Configuración → Taller → Bahías y pantalla de taller.
            </div>
          ) : (
            // auto-fit: con pocas bahías las tarjetas crecen y llenan la fila.
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
              {data.bays.map((bay) => (
                <BayTile key={bay.id} bay={bay} now={now} highlighted={bay.order && hl.has(bay.order.id)} />
              ))}
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-base font-bold text-zinc-100">Sin bahía</h2>
            <span className="text-sm text-zinc-400">{data.unassigned.length} OT</span>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
            {queue.length === 0 && <p className="px-1 text-sm text-zinc-500">Todas las OT activas están en una bahía.</p>}
            {queue.map((g) => (
              <div key={g.status} className="space-y-1.5">
                <div className="px-1"><StatusChip status={g.status} /></div>
                {g.cards.map((c) => <QueueRow key={c.id} card={c} now={now} highlighted={hl.has(c.id)} />)}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
