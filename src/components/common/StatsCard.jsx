import React from 'react';

/**
 * Tarjeta de estadística moderna y reutilizable
 * 
 * @param {string} title - Título de la estadística
 * @param {string|number} value - Valor a mostrar
 * @param {React.Component} icon - Icono de Lucide React
 * @param {string} color - Color del tema (blue, green, red, gray, purple, etc.)
 * @param {string} subtitle - Texto adicional opcional
 * @param {string} trend - Indicador de tendencia (up, down, neutral)
 * @param {boolean} isGradient - Usar gradiente en toda la tarjeta
 * @param {function} onClick - Función al hacer click (opcional)
 */
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  subtitle,
  trend,
  isGradient = false,
  onClick
}) => {
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-300',
      valueText: 'text-blue-600 dark:text-blue-300',
      border: 'border-blue-100 dark:border-blue-800/40',
      gradient: 'from-blue-500 to-blue-600'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-300',
      valueText: 'text-green-600 dark:text-green-300',
      border: 'border-green-100 dark:border-green-800/40',
      gradient: 'from-green-500 to-emerald-600'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-300',
      valueText: 'text-red-600 dark:text-red-300',
      border: 'border-red-100 dark:border-red-800/40',
      gradient: 'from-red-500 to-red-600'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-300',
      valueText: 'text-purple-600 dark:text-purple-300',
      border: 'border-purple-100 dark:border-purple-800/40',
      gradient: 'from-purple-500 to-purple-600'
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-graphite-2',
      text: 'text-gray-600 dark:text-gray-400',
      valueText: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-100 dark:border-white/10',
      gradient: 'from-gray-500 to-gray-600'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-300',
      valueText: 'text-yellow-600 dark:text-yellow-300',
      border: 'border-yellow-100 dark:border-yellow-800/40',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/30',
      text: 'text-indigo-600 dark:text-indigo-300',
      valueText: 'text-indigo-600 dark:text-indigo-300',
      border: 'border-indigo-100 dark:border-indigo-800/40',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    accent: {
      bg: 'bg-accent/10',
      text: 'text-accent',
      valueText: 'text-accent',
      border: 'border-accent/15',
      gradient: 'from-accent to-accent-soft'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.blue;

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend === 'up') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    } else if (trend === 'down') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
    
    return null;
  };

  if (isGradient) {
    return (
      <div 
        className={`bg-gradient-to-br ${scheme.gradient} rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-white ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-white/20 rounded-xl">
            {Icon && <Icon className="w-6 h-6 text-white" />}
          </div>
          {getTrendIcon()}
        </div>
        <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold break-words">{value}</p>
        {subtitle && <p className="text-white/70 text-xs mt-2">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div 
      className={`bg-white dark:bg-graphite rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border ${scheme.border} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 ${scheme.bg} rounded-xl`}>
          {Icon && <Icon className={`w-6 h-6 ${scheme.text}`} />}
        </div>
        {getTrendIcon()}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
      <p className={`text-3xl font-bold ${scheme.valueText}`}>{value}</p>
      {subtitle && <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">{subtitle}</p>}
    </div>
  );
};

export default StatsCard;