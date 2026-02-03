import React from 'react';

const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  helperText, // ← Capturar aquí
  disabled = false,
  placeholder = '',
  required = false,
  className = '',
  ...rest // El resto de props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`input ${error ? 'border-red-500' : ''} ${className}`}
        {...rest} // Spread el resto AQUÍ (sin helperText)
      />
      {helperText && !error && (
        <p className="text-sm text-gray-500 mt-1">{helperText}</p>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default Input;
