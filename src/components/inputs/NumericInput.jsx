import { useEffect, useState } from 'react';
import { formatNumber } from '@utils/formatters';

/**
 * Input de dinero/cantidades con separador de miles. Mientras el usuario
 * escribe se ve el número "pelado" (sin separadores) -- formatear en vivo
 * mientras se teclea mueve el cursor de forma impredecible; al perder el
 * foco se re-formatea con separadores para que quede legible.
 *
 * Reemplazo directo de `<input type="number">`: `onChange` recibe un
 * evento con la misma forma (`e.target.name`, `e.target.value`), así que
 * sigue funcionando con manejadores existentes como `handleNumberInput`
 * (ver utils/formatters.js) sin tocarlos.
 */
export default function NumericInput({ value, onChange, name, decimals = 0, onBlur, onFocus, type: _type, ...props }) {
  const [enfocado, setEnfocado] = useState(false);
  const [texto, setTexto] = useState(() => (value === '' || value == null ? '' : formatNumber(value, decimals)));

  useEffect(() => {
    if (enfocado) return;
    setTexto(value === '' || value == null ? '' : formatNumber(value, decimals));
  }, [value, decimals, enfocado]);

  function alEnfocar(e) {
    setEnfocado(true);
    setTexto(value === '' || value == null ? '' : String(value));
    onFocus?.(e);
  }

  function alDesenfocar(e) {
    setEnfocado(false);
    onBlur?.(e);
  }

  function alCambiar(e) {
    const crudo = e.target.value;
    // Mientras se escribe: dígitos, un separador decimal (. o ,) y signo negativo al inicio.
    if (!/^-?\d*([.,]\d*)?$/.test(crudo)) return;
    setTexto(crudo);
    onChange?.({ target: { name, value: crudo } });
  }

  return (
    <input
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
