// frontend/src/pages/customers/CustomersPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useCustomersStore from '../../store/customersStore';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Layout from '../../components/layout/Layout';

export default function CustomersPage() {
  const { 
    customers, 
    loading, 
    error,
    fetchCustomers, 
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomersStore();

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ show: false, customer: null });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    customer_type: 'individual',
    full_name: '',
    business_name: '',
    tax_id: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    customer_category: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        customer_type: 'individual',
        full_name: '',
        business_name: '',
        tax_id: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        city: '',
        customer_category: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await createCustomer(formData);
      }
      
      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      alert('Error guardando cliente: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(deleteDialog.customer.id);
      setDeleteDialog({ show: false, customer: null });
      fetchCustomers();
    } catch (error) {
      alert('Error eliminando cliente: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.tax_id && customer.tax_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && !customers.length) return <Loading />;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestiona tu base de clientes</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Cliente
          </button>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, NIT o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2"
            />
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Tabla de clientes */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ciudad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.full_name}
                      </div>
                      {customer.business_name && (
                        <div className="text-xs text-gray-500">{customer.business_name}</div>
                      )}
                      <div className="text-xs text-gray-500">{customer.tax_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={customer.customer_type === 'business' ? 'info' : 'secondary'}>
                        {customer.customer_type === 'business' ? 'Empresa' : 'Persona'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{customer.phone || customer.mobile}</div>
                      {customer.email && (
                        <div className="text-xs text-gray-500">{customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={customer.is_active ? 'success' : 'danger'}>
                        {customer.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalle"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ show: true, customer })}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Modal de Cliente */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
          size="large"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cliente *
                </label>
                <select
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="individual">Persona Natural</option>
                  <option value="business">Empresa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.customer_category}
                  onChange={(e) => setFormData({ ...formData, customer_category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  <option value="retail">Minorista</option>
                  <option value="wholesale">Mayorista</option>
                  <option value="vip">VIP</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>

            <Input
              label="Nombre Completo *"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />

            {formData.customer_type === 'business' && (
              <Input
                label="Razón Social"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cédula / NIT"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Teléfono"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Celular"
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            <Input
              label="Dirección"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <Input
              label="Ciudad"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Notas adicionales sobre el cliente..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Dialog de confirmación de eliminación */}
        <ConfirmDialog
          isOpen={deleteDialog.show}
          onClose={() => setDeleteDialog({ show: false, customer: null })}
          onConfirm={handleDelete}
          title="Eliminar Cliente"
          message={`¿Estás seguro de eliminar al cliente "${deleteDialog.customer?.full_name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
        />
      </div>
    </Layout>
  );
}