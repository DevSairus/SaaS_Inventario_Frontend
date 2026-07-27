import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSuperAdminSupportStore from '../../../store/superAdminSupportStore';
import useAuthStore from '../../../store/authStore';
import toast from 'react-hot-toast';
import { Paperclip, X, FileText, Image, Download, Monitor, UserCheck, MousePointer } from 'lucide-react';
import { createRemoteSession, cancelRemoteSession, getTenantUsers } from '../../../api/superadminSupport';
import { useRemoteSocket } from '../../../hooks/useRemoteSocket';
import RemoteViewer from './RemoteViewer';

const SLA_STATUS_CONFIG = {
  on_track: { text: 'A tiempo', color: 'bg-green-100 text-green-700' },
  at_risk: { text: 'En riesgo', color: 'bg-yellow-100 text-yellow-700' },
  breached: { text: 'Vencido', color: 'bg-red-100 text-red-700' },
  met: { text: 'Cumplido', color: 'bg-blue-100 text-blue-700' },
};

function SlaBadge({ status, remainingHours }) {
  const config = SLA_STATUS_CONFIG[status] || SLA_STATUS_CONFIG.on_track;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
      {remainingHours != null && status !== 'met' && status !== 'breached' && (
        <span className="ml-1 opacity-75">({remainingHours}h)</span>
      )}
    </span>
  );
}

const resolveFileUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || ''}${url}`;
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'waiting_customer', label: 'Esperando cliente' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

const SupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentTicket, ticketLoading, fetchTicketDetail, updateTicket, sendMessage } = useSuperAdminSupportStore();
  const { emit, on } = useRemoteSocket();
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [msgFiles, setMsgFiles] = useState([]);
  const [remoteSession, setRemoteSession] = useState(null);
  const [requestingRemote, setRequestingRemote] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicketDetail(id);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTicket?.messages]);

  // Mientras la sesión remota está pendiente, el agente ya se une a la sala del
  // socket para recibir el aviso en cuanto el cliente acepte y se una (evento
  // "session:peer-joined") — así se pasa a mostrar el visor sin tener que
  // recargar ni hacer polling.
  useEffect(() => {
    if (!remoteSession || remoteSession.status !== 'pending') return;
    const sid = remoteSession.id;
    emit('session:join', { sessionId: sid });
    const unsub = on('session:peer-joined', ({ sessionId }) => {
      if (sessionId !== sid) return;
      setRemoteSession((prev) => (prev && prev.id === sid ? { ...prev, status: 'active' } : prev));
    });
    return unsub;
  }, [remoteSession?.id, remoteSession?.status, emit, on]);

  // Si el CLIENTE termina la sesión desde su lado (o se desconecta), este
  // banner se quedaba mostrando "activa" para siempre — no había nada
  // escuchando 'session:ended' fuera del visor de pantalla completa.
  useEffect(() => {
    if (!remoteSession || remoteSession.status !== 'active') return;
    const sid = remoteSession.id;
    const unsub = on('session:ended', ({ sessionId }) => {
      if (sessionId !== sid) return;
      console.log('[SupportTicketDetail] session:ended recibido para', sid);
      setRemoteSession(null);
    });
    return unsub;
  }, [remoteSession?.id, remoteSession?.status, on]);

  const handleStatusChange = async (status) => {
    setUpdating(true);
    const ok = await updateTicket(id, { status });
    if (ok) toast.success('Estado actualizado');
    else toast.error('Error al actualizar');
    setUpdating(false);
  };

  const handlePriorityChange = async (priority) => {
    setUpdating(true);
    const ok = await updateTicket(id, { priority });
    if (ok) toast.success('Prioridad actualizada');
    else toast.error('Error al actualizar');
    setUpdating(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && msgFiles.length === 0) return;
    setSending(true);
    const ok = await sendMessage(id, { message: newMessage.trim(), is_internal_note: isInternalNote }, msgFiles.length > 0 ? msgFiles : undefined);
    if (ok) {
      setNewMessage('');
      setIsInternalNote(false);
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

  const handleRequestRemote = async (targetUserId, remoteMode = 'view_only') => {
    setRequestingRemote(true);
    setShowUserPicker(false);
    try {
      const data = await createRemoteSession(id, targetUserId, remoteMode);
      if (data.success) {
        setRemoteSession(data.data);
        toast.success(`Solicitud ${remoteMode === 'remote_control' ? 'de control remoto' : ''} enviada. Esperando consentimiento...`);
      } else {
        toast.error(data.message || 'Error al solicitar acceso');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al solicitar acceso remoto');
    }
    setRequestingRemote(false);
  };

  const handleCancelRemote = async () => {
    if (!remoteSession) return;
    try {
      await cancelRemoteSession(remoteSession.id);
      setRemoteSession(null);
      toast.success('Solicitud cancelada');
    } catch {
      toast.error('Error al cancelar');
    }
  };

  const handleOpenUserPicker = async () => {
    if (!currentTicket?.tenant_id) return;
    setLoadingUsers(true);
    setShowUserPicker(true);
    try {
      const data = await getTenantUsers(currentTicket.tenant_id);
      if (data.success) setTenantUsers(data.data);
    } catch { /* silent */ }
    setLoadingUsers(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
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
        <button onClick={() => navigate('/superadmin/support/tickets')} className="mt-2 text-indigo-600 text-sm">
          Volver a la bandeja
        </button>
      </div>
    );
  }

  const ticket = currentTicket;

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/superadmin/support/tickets')}
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 inline-block"
        >
          &larr; Bandeja de soporte
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500">
              <span>Tenant: <span className="font-medium">{ticket.tenant?.company_name}</span></span>
              <span>·</span>
              <span>Creado por: <span className="font-medium">{ticket.creator?.first_name} {ticket.creator?.last_name}</span></span>
              <span>·</span>
              <span>{formatDate(ticket.created_at)}</span>
              {ticket.category && <span>· {ticket.category}</span>}
            </div>
          </div>
        </div>

        {/* Remote access button */}
        {!remoteSession && !['resolved', 'closed'].includes(ticket.status) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleRequestRemote(undefined, 'view_only')}
              disabled={requestingRemote}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              <Monitor className="w-4 h-4" />
              {requestingRemote ? 'Solicitando...' : 'Solo ver (creador)'}
            </button>
            <button
              onClick={() => handleRequestRemote(undefined, 'remote_control')}
              disabled={requestingRemote}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            >
              <MousePointer className="w-4 h-4" />
              {requestingRemote ? 'Solicitando...' : 'Control remoto (creador)'}
            </button>
            <button
              onClick={handleOpenUserPicker}
              disabled={requestingRemote}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              <UserCheck className="w-4 h-4" />
              Elegir usuario
            </button>
          </div>
        )}
        {remoteSession && (
          <div className="mt-3 inline-flex items-center gap-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <Monitor className="w-4 h-4" />
            <span>
              Sesión remota {remoteSession.status === 'pending' ? '— esperando consentimiento' : remoteSession.status === 'active' ? '— activa' : `— ${remoteSession.status}`}
            </span>
            {remoteSession.status === 'pending' && (
              <button
                onClick={handleCancelRemote}
                className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Cancelar
              </button>
            )}
          </div>
        )}

        {/* User picker modal */}
        {showUserPicker && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setShowUserPicker(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Seleccionar usuario</h3>
                <button onClick={() => setShowUserPicker(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">Sin usuarios disponibles</p>
                ) : (
                  tenantUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {(u.first_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email} · {u.role}</p>
                      </div>
                      <button
                        onClick={() => handleRequestRemote(u.id, 'view_only')}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleRequestRemote(u.id, 'remote_control')}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        Control
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Messages */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3 min-h-[300px] max-h-[500px]">
            {ticket.messages?.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No hay mensajes aún</p>
            ) : (
              ticket.messages.map((msg) => {
                const isMine = msg.author_id === user?.id;
                const isNote = msg.is_internal_note;

                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                        isNote
                          ? 'bg-yellow-50 border border-yellow-200 text-gray-800'
                          : isMine
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      {isNote && (
                        <p className="text-[11px] font-medium text-yellow-600 mb-1">Nota interna</p>
                      )}
                      {!isMine && !isNote && (
                        <p className="text-[11px] font-medium text-gray-400 mb-1">
                          {msg.author?.first_name} {msg.author?.last_name}
                          {msg.author?.role && ` (${msg.author.role})`}
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
                                isNote ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : isMine ? 'bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                              }`}
                            >
                              {att.mime_type?.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                              <span className="truncate flex-1">{att.file_name}</span>
                              <Download className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                      <p className={`text-[10px] mt-1 ${isMine && !isNote ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <form onSubmit={handleSend} className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                Nota interna
              </label>
            </div>
            {msgFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
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
                placeholder={isInternalNote ? 'Escribe una nota interna...' : 'Escribe tu respuesta...'}
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
        </div>

        {/* Right: Ticket info */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalles del ticket</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  disabled={updating}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Agente asignado</label>
                <p className="text-sm text-gray-800">
                  {ticket.assigned_agent
                    ? `${ticket.assigned_agent.first_name} ${ticket.assigned_agent.last_name}`
                    : <span className="text-gray-400 italic">Sin asignar</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tiempos</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Creado</span>
                <span className="text-gray-800">{formatDate(ticket.created_at)}</span>
              </div>
              {ticket.first_response_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Primera respuesta</span>
                  <span className="text-gray-800">{formatDate(ticket.first_response_at)}</span>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Resuelto</span>
                  <span className="text-gray-800">{formatDate(ticket.resolved_at)}</span>
                </div>
              )}
              {ticket.closed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cerrado</span>
                  <span className="text-gray-800">{formatDate(ticket.closed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* SLA */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">SLA</h3>
            <div className="space-y-2 text-xs">
              {ticket.sla?.due_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Vence</span>
                  <span className="text-gray-800">{formatDate(ticket.sla.due_at)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado</span>
                <SlaBadge status={ticket.sla?.status} remainingHours={ticket.sla?.remaining_hours} />
              </div>
            </div>
          </div>

          {ticket.rating && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Calificación</h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${star <= ticket.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor" viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-sm text-gray-600 ml-1">{ticket.rating}/5</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Remote Viewer */}
    {remoteSession && remoteSession.status === 'active' && (
      <RemoteViewer sessionId={remoteSession.id} onEnd={() => setRemoteSession(null)} />
    )}
    </>
  );
};

export default SupportTicketDetail;
