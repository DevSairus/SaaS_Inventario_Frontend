// frontend/src/pages/customers/CustomersPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useCustomersStore from '../../store/customersStore';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EyeIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Layout from '../../components/layout/Layout';
import CustomerFormModal from '../../components/customers/CustomerFormModal';
import { HabeasStatusBadge } from '../../components/consents/HabeasDataPanel';
import LibroAuxiliarModal from '../../components/accounting/LibroAuxiliarModal';
import useCanReadAccounting from '../../hooks/useCanReadAccounting';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import useUrlPageSync from '../../hooks/useUrlPageSync';

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const canReadAccounting = useCanReadAccounting();
  const { customers, customersTotal, loading, error, fetchCustomers, deleteCustomer } = useCustomersStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ show: false, customer: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);

  // La búsqueda va al backend (no solo sobre lo ya cargado) para que un
  // cliente creado por fuera de este formulario (p. ej. desde el formato
  // rápido de Taller/Ventas) siempre aparezca, sin importar cuántos clientes
  // haya antes en orden alfabético. Debounce para no disparar una request
  // por cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers({ search: searchTerm || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);
  useUrlPageSync(page, setPage);

  const handleSearchChange = (value) => { setSearchTerm(value); setPage(1); };

  const handleOpenModal = (customer = null) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingCustomer(null); };

  const reload = () => fetchCustomers({ search: searchTerm || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  const handleDelete = async () => {
    try { await deleteCustomer(deleteDialog.customer.id); setDeleteDialog({ show: false, customer: null }); reload(); }
    catch (err) { toast.error('Error eliminando cliente: ' + (err.response?.data?.message || err.message)); }
  };

  if (loading && !customers.length) return <Loading />;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Gestiona tu base de clientes</p>
          </div>
          <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
            <PlusIcon className="h-5 w-5" /> Nuevo Cliente
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 dark:bg-graphite">
          <div className="relative">
            <input type="text" placeholder="Buscar por nombre, NIT o email..." value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600" />
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3 dark:text-gray-500" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 dark:bg-red-900/30 dark:border-red-800/40 dark:text-red-300">{error}</div>}

        <div className="bg-white rounded-lg shadow dark:bg-graphite">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-graphite-2">
                <tr>
                  {['Cliente','Tipo','Contacto','Ciudad','Estado','Acciones'].map(h => (
                    <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500 ${h==='Acciones'?'text-right':'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-graphite dark:divide-white/10">
                {customers.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-500">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </td></tr>
                ) : customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer.full_name}</div>
                      {customer.business_name && <div className="text-xs text-gray-500 dark:text-gray-500">{customer.business_name}</div>}
                      <div className="text-xs text-gray-500 dark:text-gray-500">{customer.tax_id}</div>
                      {customer.habeas_data_status && <HabeasStatusBadge status={customer.habeas_data_status} className="inline-block mt-1" />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={customer.customer_type === 'company' ? 'info' : 'secondary'}>
                        {customer.customer_type === 'company' ? 'Empresa' : 'Persona'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{customer.phone || customer.mobile}</div>
                      {customer.email && <div className="text-xs text-gray-500 dark:text-gray-500">{customer.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-500">{customer.city || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={customer.is_active ? 'success' : 'danger'}>
                        {customer.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link to={`/customers/${customer.id}`} className="text-blue-600 hover:text-blue-900" title="Ver detalle"><EyeIcon className="h-5 w-5" /></Link>
                        {canReadAccounting && (
                          <button
                            onClick={() => setLedgerCustomer({ id: customer.id, type: 'customer', name: customer.business_name || customer.full_name, tax_id: customer.tax_id })}
                            className="text-indigo-600 hover:text-indigo-900" title="Ver Libro Auxiliar (cartera)"
                          ><BookOpenIcon className="h-5 w-5" /></button>
                        )}
                        <button onClick={() => handleOpenModal(customer)} className="text-yellow-600 hover:text-yellow-900" title="Editar"><PencilIcon className="h-5 w-5" /></button>
                        <button onClick={() => setDeleteDialog({ show: true, customer })} className="text-red-600 hover:text-red-900" title="Eliminar"><TrashIcon className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            className="px-6 py-3 border-t border-gray-200 dark:border-white/10"
            currentPage={page}
            totalPages={Math.ceil(customersTotal / PAGE_SIZE)}
            totalItems={customersTotal}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>

        <CustomerFormModal isOpen={showModal} onClose={handleCloseModal} customer={editingCustomer} onSaved={reload} />

        <ConfirmDialog open={deleteDialog.show} onCancel={() => setDeleteDialog({ show: false, customer: null })}
          onConfirm={handleDelete} title="Eliminar Cliente"
          message={`¿Estás seguro de eliminar al cliente "${deleteDialog.customer?.full_name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar" confirmVariant="danger" />

        {ledgerCustomer && <LibroAuxiliarModal thirdParty={ledgerCustomer} onClose={() => setLedgerCustomer(null)} />}
      </div>
    </Layout>
  );
}