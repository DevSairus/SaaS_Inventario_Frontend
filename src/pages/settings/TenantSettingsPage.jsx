// frontend/src/pages/settings/TenantSettingsPage.jsx
import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';

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
        // ✅ Manejar tanto URLs locales como de Cloudinary
        if (response.data.data.logo_url) {
          const logoUrl = response.data.data.logo_url;
          // Si es URL de Cloudinary (contiene http), usar directamente
          if (logoUrl.startsWith('http')) {
            setLogoPreview(logoUrl);
          } else {
            // Si es nombre de archivo local, construir URL
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            setLogoPreview(`${baseUrl}/uploads/logos/${logoUrl}`);
          }
        }
      }
    } catch (error) {
      toast.error('Error al cargar la configuración');
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
        toast('Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG o WEBP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast('El archivo es demasiado grande. El tamaño máximo es 5MB');
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
      toast('Selecciona un archivo primero');
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
        toast.success('Logo subido exitosamente');
        setConfig(prev => ({
          ...prev,
          logo_url: response.data.data.logo_url
        }));
        setLogoFile(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al subir el logo');
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
        toast.success('Logo eliminado exitosamente');
        setConfig(prev => ({
          ...prev,
          logo_url: ''
        }));
        setLogoPreview(null);
        setLogoFile(null);
      }
    } catch (error) {
      toast.error('Error al eliminar el logo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await axios.put('/tenant/config', config);
      
      if (response.data.success) {
        toast.success('Configuración actualizada exitosamente');
      }
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Datos y personalización de tu empresa</p>
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