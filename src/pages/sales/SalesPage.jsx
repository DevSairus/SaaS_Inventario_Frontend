import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import {
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Layout from '../../components/layout/Layout';
import salesApi from '../../api/sales';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const navigate = useNavigate();

  const {
    sales,
    loading,
    error,
    fetchSales,
    confirmSale,
    cancelSale,
    deleteSale,
    setFilters,
    filters,
  } = useSalesStore();

  const [showFilters, setShowFilters] = useState(false);
  const [sendingWA, setSendingWA] = useState(null); // sale id being sent
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    sale: null,
    action: null,
  });

  useEffect(() => {
    fetchSales();
  }, []);

  const handleConfirmSale = (sale) => {
    setConfirmDialog({ show: true, sale, action: 'confirm' });
  };

  const handleCancelSale = (sale) => {
    setConfirmDialog({ show: true, sale, action: 'cancel' });
  };

  const handleDeleteSale = (sale) => {
    setConfirmDialog({ show: true, sale, action: 'delete' });
  };

  const executeAction = async () => {
    const { sale, action } = confirmDialog;

    try {
      if (action === 'confirm') await confirmSale(sale.id);
      if (action === 'cancel') await cancelSale(sale.id);
      if (action === 'delete') await deleteSale(sale.id);

      setConfirmDialog({ show: false, sale: null, action: null });
      fetchSales();
    } catch (err) {
      toast.error(err.message || 'Error ejecutando acción');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
  };

  const handleSendWhatsApp = async (saleId) => {
    // Abrir ventana ANTES del await para evitar el bloqueador de popups
    const win = window.open('', '_blank');
    try {
      setSendingWA(saleId);
      const res = await salesApi.sendWhatsApp(saleId);
      const { waLink } = res.data;
      if (waLink && win) {
        win.location.href = waLink;
        toast.success('Se abrió WhatsApp con el mensaje listo. Presiona Enviar ↑', { duration: 5000 });
      } else {
        win?.close();
        toast.error('No se pudo generar el enlace de WhatsApp.');
      }
    } catch (e) {
      win?.close();
      toast.error(e.response?.data?.message || 'Error al generar enlace de WhatsApp');
    } finally {
      setSendingWA(null);
    }
  };

  const handleDownloadPDF = async (saleId) => {
    try {
      const response = await salesApi.generatePDF(saleId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Error al generar el PDF');
    }
  };

  const applyFilters = () => {
    fetchSales(filters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      customer_id: '',
      from_date: '',
      to_date: '',
      document_type: '',
      customer_name: '',
      vehicle_plate: '',
    });
    fetchSales();
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      pending: 'info',       // pending = confirmada activa
      completed: 'success',  // completed = entregada
      cancelled: 'danger',
    };

    const labels = {
      draft: 'Borrador',
      pending: 'Confirmada',
      completed: 'Entregada',
      cancelled: 'Cancelada',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      partial: 'info',
      paid: 'success',
    };

    const labels = {
      pending: 'Pendiente',
      partial: 'Parcial',
      paid: 'Pagada',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (loading && !sales.length) return <Loading />;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ventas y Remisiones</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestiona tus ventas, remisiones y facturación</p>
          </div>
          <Link to="/sales/new">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
              <PlusIcon className="h-5 w-5" />
              Nueva Venta
            </button>
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-2"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>{showFilters ? 'Ocultar' : 'Mostrar'} filtros</span>
            </button>
          </div>

          {showFilters && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="pending">Confirmada</option>
                  <option value="completed">Entregada</option>
                  <option value="cancelled">Cancelada</option>
                </select>

                <select
                  value={filters.document_type}
                  onChange={(e) => handleFilterChange('document_type', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Todos los documentos</option>
                  <option value="remision">Remisión</option>
                  <option value="factura">Factura</option>
                  <option value="cotizacion">Cotización</option>
                </select>

                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                  placeholder="Desde"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />

                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                  placeholder="Hasta"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Nueva fila para búsqueda por nombre y placa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={filters.customer_name || ''}
                  onChange={(e) => handleFilterChange('customer_name', e.target.value)}
                  placeholder="Buscar por nombre de cliente..."
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />

                <input
                  type="text"
                  value={filters.vehicle_plate || ''}
                  onChange={(e) => handleFilterChange('vehicle_plate', e.target.value.toUpperCase())}
                  placeholder="Buscar por placa del vehículo..."
                  className="border border-gray-300 rounded-lg px-3 py-2 uppercase"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar
                </Button>
                <Button variant="primary" onClick={applyFilters}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                    No hay ventas registradas
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{sale.sale_number}</td>
                    <td className="px-6 py-4 text-sm">{sale.customer_name}</td>
                    <td className="px-6 py-4 text-sm">
                      {sale.vehicle_plate ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {sale.vehicle_plate}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDate(sale.sale_date)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(sale.total_amount)}</td>
                    <td className="px-6 py-4">{getStatusBadge(sale.status)}</td>
                    <td className="px-6 py-4">{getPaymentStatusBadge(sale.payment_status)}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => navigate(`/sales/${sale.id}`)} className="text-blue-600">
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {sale.status === 'draft' && (
                        <button onClick={() => handleConfirmSale(sale)} className="text-green-600">
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      )}
                      {sale.status === 'draft' && (
                        <button onClick={() => handleCancelSale(sale)} className="text-red-600">
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSendWhatsApp(sale.id)}
                        disabled={sendingWA === sale.id}
                        title="Enviar por WhatsApp"
                        className="p-1.5 text-green-600 hover:text-green-800 disabled:opacity-40 transition-colors"
                      >
                        {sendingWA === sale.id
                          ? <span className="text-xs">...</span>
                          : <WhatsAppSvg />}
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(sale.id)}
                        className="text-purple-600"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ConfirmDialog
          isOpen={confirmDialog.show}
          onClose={() => setConfirmDialog({ show: false, sale: null, action: null })}
          onConfirm={executeAction}
          title="Confirmar acción"
          message="¿Deseas continuar con esta acción?"
        />
      </div>
    </Layout>
  );
}
function WhatsAppSvg() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}