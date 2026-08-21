import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatNumber } from '@utils/formatters';

// Inserta puntos de miles cada 3 dígitos desde la derecha (solo dígitos, sin signo).
const conMiles = (digitos) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Input de dinero/cantidades con separador de miles, formateado EN VIVO
 * mientras el usuario escribe (estilo es-CO: punto de miles, coma decimal).
 *
 * El cursor se reposiciona a mano en cada tecleo: contamos cuántos dígitos
 * (y la coma decimal, si aplica) había antes del cursor en lo que el
 * usuario acaba de escribir, formateamos, y volvemos a ubicar el cursor
 * después de esa misma cantidad de dígitos en el texto ya formateado. Así
 * los puntos de miles que se insertan/quitan a la izquierda del cursor no
 * lo desplazan de forma rara.
 *
 * Reemplazo directo de `<input type="number">`: `onChange` recibe un
 * evento con la misma forma (`e.target.name`, `e.target.value`), y el
 * valor que entrega siempre es un número "crudo" parseable con `Number()`
 * (con `.` como separador decimal, sin puntos de miles), así que sigue
 * funcionando con manejadores existentes como `handleNumberInput` o
 * `toInteger`/`toNumber` (ver utils/formatters.js) sin tocarlos.
 */
export default function NumericInput({ value, onChange, name, decimals = 0, onBlur, onFocus, type: _type, ...props }) {
  const inputRef = useRef(null);
  const cursorPendiente = useRef(null);
  const [enfocado, setEnfocado] = useState(false);
  const [texto, setTexto] = useState(() => (value === '' || value == null ? '' : formatNumber(value, decimals)));

  useEffect(() => {
    if (enfocado) return;
    setTexto(value === '' || value == null ? '' : formatNumber(value, decimals));
  }, [value, decimals, enfocado]);

  // Reaplicar la posición del cursor calculada en alCambiar, después de que
  // React actualice el DOM con el texto ya formateado.
  useLayoutEffect(() => {
    if (cursorPendiente.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPendiente.current, cursorPendiente.current);
      cursorPendiente.current = null;
    }
  }, [texto]);

  function alEnfocar(e) {
    setEnfocado(true);
    onFocus?.(e);
  }

  function alDesenfocar(e) {
    setEnfocado(false);
    onBlur?.(e);
  }

  function alCambiar(e) {
    const cursorPrevio = e.target.selectionStart;
    const crudo = e.target.value;

    // Solo dígitos, puntos/comas (miles o decimal) y signo negativo al inicio.
    if (!/^-?[\d.,]*$/.test(crudo)) return;

    // Cuántos dígitos (contando también una coma decimal) había antes del
    // cursor -- se usa para reubicarlo después de formatear.
    const digitosAntesDelCursor = (crudo.slice(0, cursorPrevio).match(/[\d,]/g) || []).length;

    const negativo = crudo.trim().startsWith('-');
    // Los puntos que ya haya en el texto son separadores de miles que
    // nosotros mismos insertamos -- se descartan y se regeneran solos.
    const limpio = crudo.replace(/\./g, '').replace(/^-/, '');

    let enteraStr;
    let decimalStr = null;
    if (decimals > 0 && limpio.includes(',')) {
      const [entrada, ...resto] = limpio.split(',');
      enteraStr = entrada.replace(/\D/g, '');
      decimalStr = resto.join('').replace(/\D/g, '').slice(0, decimals);
    } else {
      enteraStr = limpio.replace(/\D/g, '');
    }
    enteraStr = enteraStr.replace(/^0+(?=\d)/, '');

    if (!enteraStr && decimalStr === null) {
      // Nada tecleado aún, o solo el signo "-" (se deja para que el
      // usuario siga escribiendo el número a continuación).
      const textoVacio = negativo ? '-' : '';
      cursorPendiente.current = textoVacio.length;
      setTexto(textoVacio);
      onChange?.({ target: { name, value: textoVacio } });
      return;
    }

    const textoFormateado = (negativo ? '-' : '') + conMiles(enteraStr || '0') + (decimalStr !== null ? ',' + decimalStr : '');
    const valorCrudo = (negativo ? '-' : '') + (enteraStr || '0') + (decimalStr !== null ? '.' + decimalStr : '');

    let nuevaPos = textoFormateado.length;
    let contados = 0;
    for (let i = 0; i < textoFormateado.length; i++) {
      if (contados >= digitosAntesDelCursor) {
        nuevaPos = i;
        break;
      }
      if (/[\d,]/.test(textoFormateado[i])) contados++;
    }
    cursorPendiente.current = nuevaPos;

    setTexto(textoFormateado);
    onChange?.({ target: { name, value: valorCrudo } });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      {...props}
      name={name}
      value={texto}
      onFocus={alEnfocar}
      onBlur={alDesenfocar}
      onChange={alCambiar}
    />
  );
}