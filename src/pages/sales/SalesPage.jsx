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
      alert(err.message || 'Error ejecutando acción');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
  };

  const handleDownloadPDF = async (saleId) => {
    try {
      const response = await salesApi.generatePDF(saleId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al generar el PDF');
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