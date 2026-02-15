import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Dropdown = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Calcular posición del dropdown
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px
      const spacing = 8; // mt-2 = 0.5rem = 8px
      
      let left = rect.left;
      let top = rect.bottom + spacing;

      // Alinear a la derecha si es necesario
      if (align === 'right') {
        left = rect.right - dropdownWidth;
      }

      // Ajustar si se sale por la derecha
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      // Ajustar si se sale por la izquierda
      if (left < 10) {
        left = 10;
      }

      // Verificar si hay espacio abajo, si no, mostrar arriba
      const dropdownHeight = items.length * 40 + 16; // aproximado
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - spacing;
      }

      setPosition({ top, left });
      // Pequeño delay para asegurar que la posición esté lista
      requestAnimationFrame(() => {
        setIsPositioned(true);
      });
    } else {
      setIsPositioned(false);
    }
  }, [isOpen, align, items.length]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block" ref={triggerRef}>
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      </div>

      {isOpen && isPositioned && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="py-1">
            {items.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <>
                  {Icon && <Icon className="w-4 h-4 mr-3" />}
                  {item.label}
                </>
              );

              const className = `flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                item.className || 'text-gray-700'
              }`;

              if (item.to) {
                return (
                  <Link
                    key={index}
                    to={item.to}
                    className={className}
                    onClick={() => setIsOpen(false)}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default Dropdown;