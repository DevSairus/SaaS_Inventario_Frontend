// frontend/src/utils/boardSounds.js
// Sonidos de la pantalla de taller, generados con Web Audio (sin archivos).
// Un patrón distinto por tipo de aviso para reconocerlo sin mirar el TV:
//   created    — dos notas subiendo        (entró una OT)
//   status     — una nota                  (cambió de estado)
//   ready      — tres notas subiendo       (pasó a "Listo")
//   technician — dos notas iguales cortas  (cambió el técnico)
//   bay        — nota grave                (entró/salió de bahía)
//   quote      — dos notas bajando         (el cliente respondió la cotización)
//
// Los navegadores no dejan sonar audio hasta que alguien interactúa con la
// página: unlockAudio() se llama desde el clic de "Activar sonido".

let ctx = null;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export async function unlockAudio() {
  const c = audioCtx();
  if (!c) return false;
  if (c.state === 'suspended') await c.resume().catch(() => {});
  return c.state === 'running';
}

export function audioUnlocked() {
  return !!ctx && ctx.state === 'running';
}

const PATTERNS = {
  created:    [[660, 0, 0.16], [880, 0.18, 0.22]],
  status:     [[740, 0, 0.25]],
  ready:      [[523, 0, 0.14], [659, 0.16, 0.14], [784, 0.32, 0.3]],
  technician: [[600, 0, 0.1], [600, 0.16, 0.1]],
  bay:        [[392, 0, 0.3]],
  quote:      [[880, 0, 0.16], [660, 0.18, 0.24]],
};

export function soundFor(event) {
  if (!event || event.kind === 'refresh') return null;
  if (event.kind === 'status' && event.status === 'listo') return 'ready';
  return PATTERNS[event.kind] ? event.kind : 'status';
}

export function playBoardSound(name, volume = 0.6) {
  const c = audioCtx();
  const notes = PATTERNS[name];
  if (!c || !notes || c.state !== 'running') return;
  const now = c.currentTime + 0.02;
  for (const [freq, start, dur] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  }
}
