import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSupportStore from '../../store/supportStore';
import useAuthStore from '../../store/authStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { Paperclip, X, FileText, Image, Download } from 'lucide-react';

const resolveFileUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || ''}${url}`;
};

const STATUS_LABELS = {
  open: { text: 'Abierto', color: 'bg-blue-100 text-blue-800' },
  in_progress: { text: 'En progreso', color: 'bg-yellow-100 text-yellow-800' },
  waiting_customer: { text: 'Esperando tu respuesta', color: 'bg-orange-100 text-orange-800' },
  resolved: { text: 'Resuelto', color: 'bg-green-100 text-green-800' },
  closed: { text: 'Cerrado', color: 'bg-gray-100 text-gray-600' },
};

const PRIORITY_LABELS = {
  low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente',
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentTicket, ticketLoading, fetchTicketDetail, sendMessage, rateTicketAction } = useSupportStore();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [msgFiles, setMsgFiles] = useState([]);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicketDetail(id);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTicket?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && msgFiles.length === 0) return;
    setSending(true);
    const ok = await sendMessage(id, newMessage.trim(), msgFiles.length > 0 ? msgFiles : undefined);
    if (ok) {
      setNewMessage('');
      setMsgFiles([]);
    } else {
      toast.error('Error al enviar el mensaje');
    }
    setSending(false);
  };

  const handleMsgFileAdd = (e) => {
    const newFiles = Array.from(e.target.files);
    setMsgFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    e.target.value = '';
  };

  const removeMsgFile = (index) => {
    setMsgFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleRate = async (value) => {
    setSubmittingRating(true);
    const ok = await rateTicketAction(id, value);
    if (ok) toast.success('¡Gracias por tu calificación!');
    else toast.error('Error al calificar');
    setSubmittingRating(false);
  };

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!currentTicket) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Ticket no encontrado</p>
        <button onClick={() => navigate('/support/tickets')} className="mt-2 text-indigo-600 text-sm">
          Volver a mis tickets
        </button>
      </div>
    );
  }

  const ticket = currentTicket;
  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.open;
  const isClosed = ['resolved', 'closed'].includes(ticket.status);

  return (
    <>
    <Layout>
    <div className="p-6 max-w-3xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/support/tickets')}
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
        >
          &larr; Mis tickets
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                {status.text}
              </span>
              <span className="text-xs text-gray-500">
                Prioridad: {PRIORITY_LABELS[ticket.priority] || ticket.priority}
              </span>
              {ticket.category && (
                <span className="text-xs text-gray-500">· {ticket.category}</span>
              )}
              <span className="text-xs text-gray-400">· Creado: {formatDate(ticket.created_at)}</span>
            </div>
          </div>
        </div>
        {ticket.assigned_agent && (
          <p className="text-xs text-gray-500 mt-1">
            Agente asignado: <span className="font-medium">{ticket.assigned_agent.first_name} {ticket.assigned_agent.last_name}</span>
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3 mb-4">
        {ticket.messages?.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No hay mensajes aún</p>
        ) : (
          ticket.messages.map((msg) => {
            const isMine = msg.author_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                    isMine
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {!isMine && (
                    <p className={`text-[11px] font-medium mb-1 ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {msg.author?.first_name} {msg.author?.last_name}
                      {msg.author?.role === 'support' && ' (Soporte)'}
                      {msg.author?.role === 'super_admin' && ' (Admin)'}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-line">{msg.message}</p>
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={resolveFileUrl(att.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded transition-colors ${
                            isMine ? 'bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          {att.mime_type?.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          <span className="truncate flex-1">{att.file_name}</span>
                          <Download className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="text-center py-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">Este ticket está {status.text.toLowerCase()}</p>
        </div>
      ) : (
        <form onSubmit={handleSend}>
          {msgFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {msgFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs">
                  <FileText className="w-3 h-3 text-gray-400" />
                  <span className="truncate max-w-[120px] text-gray-700">{f.name}</span>
                  <button type="button" onClick={() => removeMsgFile(i)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <input type="file" multiple onChange={handleMsgFileAdd} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && msgFiles.length === 0)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {sending ? '...' : 'Enviar'}
            </button>
          </div>
        </form>
      )}

      {/* Rating post-cierre */}
      {isClosed && !ticket.rating && (
        <div className="mt-3 bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">¿Cómo fue la atención?</p>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setRatingHover(star)}
                onMouseLeave={() => setRatingHover(0)}
                onClick={() => setRating(star)}
                disabled={submittingRating}
                className="p-0.5"
              >
                <svg
                  className={`w-8 h-8 transition-colors ${
                    star <= (ratingHover || rating) ? 'text-yellow-400' : 'text-gray-300'
                  } ${submittingRating ? 'opacity-50' : 'cursor-pointer hover:text-yellow-400'}`}
                  fill="currentColor" viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <button
              onClick={() => handleRate(rating)}
              disabled={submittingRating}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {submittingRating ? 'Enviando...' : 'Calificar'}
            </button>
          )}
        </div>
      )}
      {isClosed && ticket.rating && (
        <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Tu calificación</p>
          <div className="flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} className={`w-5 h-5 ${star <= ticket.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      )}
    </div>
    </Layout>
    </>
  );
};

export default TicketDetail;
