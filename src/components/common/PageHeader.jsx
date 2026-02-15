import React from 'react';

/**
 * Componente de Header moderno y reutilizable para todas las páginas
 * 
 * @param {string} title - Título de la página
 * @param {string} subtitle - Subtítulo descriptivo
 * @param {React.Component} icon - Icono de Lucide React
 * @param {Array} actions - Botones de acción [{label, icon, onClick, variant}]
 * @param {string} gradient - Gradiente de colores (default: green-emerald)
 */
const PageHeader = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  actions = [],
  gradient = 'from-green-500 to-emerald-600'
}) => {
  const getButtonClass = (variant = 'primary') => {
    const variants = {
      primary: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
      secondary: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
      blue: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
      red: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
      gray: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
    };
    
    return variants[variant] || variants.primary;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            {Icon && (
              <div className={`p-3 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
            )}
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 mt-2 text-lg">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions.length > 0 && (
          <div className="flex gap-3">
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`flex items-center gap-2 px-6 py-3 ${getButtonClass(action.variant)} text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                  {ActionIcon && <ActionIcon className="w-5 h-5" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;