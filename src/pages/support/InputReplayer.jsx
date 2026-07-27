import { useEffect, useCallback } from 'react';
import { useRemoteSocket } from '../../hooks/useRemoteSocket';

/**
 * Recibe eventos de input del agente y los retransmite como eventos DOM reales.
 * Coordenadas normalizadas [0..1] se mapean al viewport del navegador.
 */
export default function InputReplayer({ sessionId }) {
  const { on } = useRemoteSocket();

  const dispatchAt = useCallback((eventType, nx, ny, extra = {}) => {
    const x = nx * window.innerWidth;
    const y = ny * window.innerHeight;
    const el = document.elementFromPoint(x, y);
    if (!el) {
      console.log(`[InputReplayer] No element at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      return;
    }

    el.dispatchEvent(new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: extra.button ?? 0,
    }));

    if (eventType === 'click' && typeof el.focus === 'function') {
      el.focus();
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const unsub = on('session:input', ({ input }) => {
      if (!input) return;
      console.log(`[InputReplayer] Received: ${input.type}`);

      switch (input.type) {
        case 'click': {
          // Se resuelve el elemento UNA sola vez y se despachan los tres
          // eventos sobre esa misma referencia — si se recalcula el punto
          // entre cada evento, un cambio de layout (ej. un acordeón que se
          // expande en el mousedown) hace que mouseup/click caigan sobre
          // otro elemento distinto y se vea "abrir y cerrar" en cascada.
          const x = input.x * window.innerWidth;
          const y = input.y * window.innerHeight;
          const el = document.elementFromPoint(x, y);
          if (!el) { console.log(`[InputReplayer] No element at (${x.toFixed(0)}, ${y.toFixed(0)})`); break; }
          const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: input.button ?? 0 };
          el.dispatchEvent(new MouseEvent('mousedown', opts));
          el.dispatchEvent(new MouseEvent('mouseup', opts));
          el.dispatchEvent(new MouseEvent('click', opts));
          if (typeof el.focus === 'function') el.focus();
          break;
        }

        case 'dblclick':
          dispatchAt('dblclick', input.x, input.y);
          break;

        case 'mousedown':
          dispatchAt('mousedown', input.x, input.y, { button: input.button });
          break;

        case 'mouseup':
          dispatchAt('mouseup', input.x, input.y, { button: input.button });
          break;

        case 'mousemove':
          dispatchAt('mousemove', input.x, input.y);
          break;

        case 'wheel': {
          const x = input.x !== undefined ? input.x * window.innerWidth : window.innerWidth / 2;
          const y = input.y !== undefined ? input.y * window.innerHeight : window.innerHeight / 2;
          const el = document.elementFromPoint(x, y);

          // Un WheelEvent despachado a mano no produce scroll nativo (eso lo hace
          // el motor del navegador, no el listener) — hay que mover el contenedor
          // scrolleable más cercano nosotros mismos con scrollBy().
          const isScrollable = (node) => {
            if (!node || node === document.documentElement) return false;
            const style = window.getComputedStyle(node);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll')
              && node.scrollHeight > node.clientHeight;
          };
          let scrollTarget = el;
          while (scrollTarget && !isScrollable(scrollTarget)) {
            scrollTarget = scrollTarget.parentElement;
          }
          (scrollTarget || document.scrollingElement || document.documentElement).scrollBy({
            left: input.deltaX || 0,
            top: input.deltaY || 0,
          });

          if (el) {
            el.dispatchEvent(new WheelEvent('wheel', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              deltaX: input.deltaX || 0,
              deltaY: input.deltaY || 0,
            }));
          }
          break;
        }

        case 'keydown': {
          const active = document.activeElement;
          if (!active || active === document.body) break;
          active.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: input.key,
            code: input.code,
            shiftKey: input.shiftKey || false,
            altKey: input.altKey || false,
          }));
          // Carácter imprimible → insertar texto
          if (input.key.length === 1 && !input.altKey && !input.shiftKey) {
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
              const setter = Object.getOwnPropertyDescriptor(
                active.tagName === 'INPUT'
                  ? window.HTMLInputElement.prototype
                  : window.HTMLTextAreaElement.prototype,
                'value'
              )?.set;
              if (setter) {
                const start = active.selectionStart ?? active.value.length;
                const end = active.selectionEnd ?? active.value.length;
                setter.call(active, active.value.substring(0, start) + input.key + active.value.substring(end));
                active.dispatchEvent(new Event('input', { bubbles: true }));
                active.setSelectionRange(start + 1, start + 1);
              }
            } else if (active.isContentEditable) {
              document.execCommand('insertText', false, input.key);
            }
          }
          break;
        }

        case 'keyup': {
          const active = document.activeElement;
          if (!active || active === document.body) break;
          active.dispatchEvent(new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            key: input.key,
            code: input.code,
          }));
          break;
        }

        default:
          break;
      }
    });

    return () => unsub();
  }, [sessionId, on, dispatchAt]);

  return null;
}
