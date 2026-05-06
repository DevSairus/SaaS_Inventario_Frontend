import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary capturó un error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ocurrió un error inesperado en la aplicación. Puedes recargar la página o volver al inicio.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-gray-100 text-gray-700 rounded-lg p-3 mb-4 overflow-auto max-h-48">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Recargar
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold transition-colors"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
