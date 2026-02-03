import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Eye } from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import Loading from '@components/common/Loading';

const SubscriptionInvoicesManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/subscription-invoices');
      setInvoices(data.invoices || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      paid: 'green',
      failed: 'red',
      cancelled: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      paid: 'Pagada',
      failed: 'Fallida',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  if (loading) return <Loading text="Cargando facturas..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Facturas de Suscripciones
          </h1>
          <p className="text-gray-600 mt-1">
            Historial de cobros de todas las suscripciones
          </p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchInvoices}>
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-3xl font-bold text-gray-900">
              {invoices.length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Pagadas</p>
            <p className="text-3xl font-bold text-green-600">
              {invoices.filter((i) => i.status === 'paid').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-3xl font-bold text-orange-600">
              {invoices.filter((i) => i.status === 'pending').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Monto Total</p>
            <p className="text-2xl font-bold text-gray-900">
              $
              {invoices
                .reduce((sum, i) => sum + (i.amount || 0), 0)
                .toLocaleString('es-CO')}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Tenant
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Vencimiento
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Pagada
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay facturas registradas
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {invoice.tenant?.company_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {invoice.plan?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${invoice.amount?.toLocaleString('es-CO')} COP
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={getStatusColor(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {invoice.due_date
                        ? new Date(invoice.due_date).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {invoice.paid_at
                        ? new Date(invoice.paid_at).toLocaleDateString('es-ES')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionInvoicesManagement;
