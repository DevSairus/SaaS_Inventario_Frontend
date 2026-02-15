// src/components/common/AnnouncementsModal.jsx
import { useState, useEffect } from 'react';
import useAnnouncementsStore from '../../store/announcementsStore';

const AnnouncementsModal = () => {
  const {
    pendingAnnouncements,
    showModal,
    isLoading,
    fetchPendingAnnouncements,
    markAsViewed,
    dismiss,
    closeModal
  } = useAnnouncementsStore();

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Cargar anuncios pendientes al montar
    fetchPendingAnnouncements();
  }, [fetchPendingAnnouncements]);

  const handleNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < pendingAnnouncements.length) {
      setCurrentIndex(nextIndex);
      // Marcar como visto
      await markAsViewed(pendingAnnouncements[nextIndex].id);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = async () => {
    await closeModal();
    setCurrentIndex(0);
  };

  const handleDismiss = async () => {
    const currentAnnouncement = pendingAnnouncements[currentIndex];
    await dismiss(currentAnnouncement.id);
    handleNext();
  };

  if (!showModal || pendingAnnouncements.length === 0 || isLoading) {
    return null;
  }

  const currentAnnouncement = pendingAnnouncements[currentIndex];

  // Iconos según el tipo
  const getIcon = () => {
    const iconMap = {
      feature: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      update: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      maintenance: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      info: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
    return iconMap[currentAnnouncement.type] || iconMap.info;
  };

  // Color según el tipo
  const getColorClasses = () => {
    const colorMap = {
      feature: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
      update: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
      maintenance: 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white',
      warning: 'bg-gradient-to-br from-red-500 to-pink-500 text-white',
      info: 'bg-gradient-to-br from-gray-500 to-gray-700 text-white'
    };
    return colorMap[currentAnnouncement.type] || colorMap.info;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleDismiss}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all">
          {/* Header con gradiente */}
          <div className={`p-8 text-center ${getColorClasses()}`}>
            <div className="flex justify-center mb-4">
              {getIcon()}
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {currentAnnouncement.title}
            </h2>
            {currentAnnouncement.version && (
              <span className="inline-block px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">
                {currentAnnouncement.version}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                {currentAnnouncement.content}
              </p>
            </div>

            {/* Footer con contador y botones */}
            <div className="mt-8 flex items-center justify-between border-t pt-6">
              <div className="text-sm text-gray-500">
                {currentIndex + 1} de {pendingAnnouncements.length} novedades
              </div>

              <div className="flex gap-3">
                {currentIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Anterior
                  </button>
                )}

                {currentIndex < pendingAnnouncements.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-md transition-all"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-medium shadow-md transition-all"
                  >
                    ¡Entendido!
                  </button>
                )}
              </div>
            </div>

            {/* Botón cerrar en esquina */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
              title="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Indicadores de progreso */}
          {pendingAnnouncements.length > 1 && (
            <div className="px-8 pb-6">
              <div className="flex gap-2 justify-center">
                {pendingAnnouncements.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'w-8 bg-blue-500'
                        : index < currentIndex
                        ? 'w-2 bg-green-400'
                        : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsModal;