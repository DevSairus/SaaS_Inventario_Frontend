import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSupportStore from '../../store/supportStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { Paperclip, X, FileText, Image } from 'lucide-react';

const CATEGORIES = [
  'Facturación',
  'DIAN / NCF',
  'Productos / Inventario',
  'Ventas',
  'Taller',
  'Usuarios / Permisos',
  'Configuración',
  'Error / Bug',
  'Otro',
];

const CreateTicket = () => {
  const navigate = useNavigate();
  const { createNewTicket } = useSupportStore();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: '',
  });
  const [files, setFiles] = useState([]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileAdd = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5)); // max 5
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Asunto y descripción son obligatorios');
      return;
    }

    setSubmitting(true);
    const ticket = await createNewTicket(form, files.length > 0 ? files : undefined);
    if (ticket) {
      toast.success('Ticket creado correctamente');
      navigate(`/support/tickets/${ticket.id}`);
    } else {
      toast.error('Error al crear el ticket');
    }
    setSubmitting(false);
  };

  return (
    <Layout>
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/support')}
        className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block"
      >
        &larr; Volver a Soporte
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Escalar a Soporte</h1>
      <p className="text-sm text-gray-500 mb-6">Describe tu problema y nuestro equipo te ayudará</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Asunto *</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            placeholder="Resumen breve de tu consulta"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Seleccionar...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridad sugerida</label>
            <select
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción *</label>
          <textarea
            required
            rows={6}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe tu problema con el mayor detalle posible..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Adjuntos (opcional)</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600 transition-colors">
              <Paperclip className="w-4 h-4" />
              Seleccionar archivos
              <input type="file" multiple onChange={handleFileAdd} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
            </label>
            <span className="text-xs text-gray-400">Máx. 5 archivos, 10MB c/u</span>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  {f.type?.startsWith('image/') ? <Image className="w-4 h-4 text-gray-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                  <span className="flex-1 truncate text-gray-700">{f.name}</span>
                  <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {submitting ? 'Creando...' : 'Crear Ticket'}
          </button>
        </div>
      </form>
    </div>
    </Layout>
  );
};

export default CreateTicket;
