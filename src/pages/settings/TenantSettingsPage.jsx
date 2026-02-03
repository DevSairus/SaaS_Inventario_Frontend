// frontend/src/pages/settings/TenantSettingsPage.jsx
import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Layout from '../../components/layout/Layout';

const TenantSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [config, setConfig] = useState({
    company_name: '',
    business_name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: '',
    primary_color: '#2563eb',
    secondary_color: '#475569'
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/tenant/config');
      if (response.data.success) {
        setConfig(response.data.data);
        if (response.data.data.logo_url) {
          setLogoPreview(`/uploads/logos/${response.data.data.logo_url}`);
        }
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      alert('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG o WEBP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. El tamaño máximo es 5MB');
        return;
      }

      setLogoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      alert('Selecciona un archivo primero');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await axios.post('/tenant/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Logo subido exitosamente');
        setConfig(prev => ({
          ...prev,
          logo_url: response.data.data.logo_url
        }));
        setLogoFile(null);
      }
    } catch (error) {
      console.error('Error subiendo logo:', error);
      alert(error.response?.data?.message || 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('¿Estás seguro de eliminar el logo?')) {
      return;
    }

    try {
      const response = await axios.delete('/tenant/logo');
      if (response.data.success) {
        alert('Logo eliminado exitosamente');
        setConfig(prev => ({
          ...prev,
          logo_url: ''
        }));
        setLogoPreview(null);
        setLogoFile(null);
      }
    } catch (error) {
      console.error('Error eliminando logo:', error);
      alert('Error al eliminar el logo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await axios.put('/tenant/config', config);
      
      if (response.data.success) {
        alert('Configuración actualizada exitosamente');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-500 to-gray-600 rounded-2xl shadow-xl p-8 text-white mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <h1 className="text-3xl font-bold">Configuración</h1>
            <p className="text-slate-200">Datos y personalización de tu empresa</p>
          </div>
        </div>
      </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Logo de la Empresa</h2>
              
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs">Sin logo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-3">
                    Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 5MB
                  </p>
                  
                  <div className="flex gap-2 mb-3">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-center">
                        Seleccionar archivo
                      </div>
                    </label>
                    
                    {logoFile && (
                      <Button
                        type="button"
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                      </Button>
                    )}
                  </div>

                  {config.logo_url && (
                    <Button
                      type="button"
                      onClick={handleDeleteLogo}
                      variant="danger"
                      size="sm"
                    >
                      Eliminar logo actual
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Información de la empresa */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Información de la Empresa</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre Comercial"
                  name="company_name"
                  value={config.company_name}
                  onChange={handleChange}
                  required
                />
                
                <Input
                  label="Razón Social"
                  name="business_name"
                  value={config.business_name || ''}
                  onChange={handleChange}
                />
                
                <Input
                  label="NIT / Tax ID"
                  name="tax_id"
                  value={config.tax_id || ''}
                  onChange={handleChange}
                />
                
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={config.email}
                  onChange={handleChange}
                  required
                />
                
                <Input
                  label="Teléfono"
                  name="phone"
                  value={config.phone || ''}
                  onChange={handleChange}
                />
                
                <Input
                  label="Sitio Web"
                  name="website"
                  value={config.website || ''}
                  onChange={handleChange}
                  placeholder="https://www.ejemplo.com"
                />
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <textarea
                    name="address"
                    value={config.address || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={loadConfig}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TenantSettingsPage;