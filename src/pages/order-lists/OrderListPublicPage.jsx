// frontend/src/pages/order-lists/OrderListPublicPage.jsx
// Página pública /pedido/:token -- el enlace que recibe el proveedor por
// WhatsApp (wa.me no adjunta archivos). Pide el PDF a
// /api/public/order-lists/:token/pdf y lo muestra con botones para abrirlo y
// descargarlo, así el enlace compartido es del dominio de la app y no del
// backend. Backend: orderLists.controller.js#getPublicOrderListPdf.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

// Los celulares (Chrome Android, por ejemplo) no muestran un PDF dentro de la
// página: ahí solo van los botones.
const canPreviewPdf = () => typeof navigator !== 'undefined' && navigator.pdfViewerEnabled === true;

function OrderListPublicPage() {
  const { token } = useParams();
  const [pdf, setPdf] = useState(null); // { url, filename }
  const [error, setError] = useState('');

  useEffect(() => {
    let url = null;
    api.get(`/public/order-lists/${token}/pdf`, { responseType: 'blob' })
      .then((res) => {
        const match = /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] || '');
        url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        setPdf({ url, filename: match?.[1] || 'Pedido.pdf' });
      })
      .catch((e) => setError(e.response?.status === 404 ? 'Este pedido no existe o ya no está disponible.' : 'No se pudo cargar el pedido. Intenta de nuevo más tarde.'));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-600 text-center">{error}</p>
      </div>
    );
  }
  if (!pdf) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
      </div>
    );
  }

  const title = pdf.filename.replace(/\.pdf$/i, '').replace('-', ' ');
  const buttons = (
    <>
      <a href={pdf.url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
        Abrir PDF
      </a>
      <a href={pdf.url} download={pdf.filename} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700">
        Descargar PDF
      </a>
    </>
  );

  if (!canPreviewPdf()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-lg font-semibold text-gray-800">{title}</p>
          <p className="text-sm text-gray-500">Te compartimos este pedido en PDF.</p>
          <div className="flex flex-col gap-2">{buttons}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex items-center justify-between gap-3 px-4 py-3 bg-white shadow-sm">
        <p className="font-semibold text-gray-800 truncate">{title}</p>
        <div className="flex gap-2 flex-shrink-0">{buttons}</div>
      </header>
      <iframe src={pdf.url} title={pdf.filename} className="flex-1 w-full border-0" style={{ minHeight: 'calc(100vh - 64px)' }} />
    </div>
  );
}

export default OrderListPublicPage;
