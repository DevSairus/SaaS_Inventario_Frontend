import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import crmApi from '../../api/crm';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import { useWhatsAppSocket } from '../../hooks/useWhatsAppSocket';
import {
  MessageCircle, Search, Send, UserPlus, CheckCheck, Check, Loader2, Phone,
  Sparkles, Pin, PinOff, Clock, StickyNote, Settings2, SlidersHorizontal,
  AlertTriangle, CircleDot, ExternalLink, Paperclip, Mic, Square, FileText, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_PREFS = {
  show_follow_up: true,
  show_priority: true,
  show_pin: true,
  show_marks: true,
  show_internal_note: true,
  show_ai_suggest: true,
  show_ai_summarize: true,
  show_window_status: true,
  show_customer_link: true,
  show_assign: true,
  show_demo_simulate: true,
};

const PREF_LABELS = {
  show_follow_up: 'Seguimiento / recordatorio',
  show_priority: 'Prioridad',
  show_pin: 'Fijar conversación',
  show_marks: 'Marcas de gestión',
  show_internal_note: 'Nota interna',
  show_ai_suggest: 'IA — sugerir respuesta',
  show_ai_summarize: 'IA — resumir',
  show_window_status: 'Estado ventana 24h',
  show_customer_link: 'Link a cliente CRM',
  show_assign: 'Asignación',
  show_demo_simulate: 'Simular mensaje del cliente (demo)',
};

const MARK_META = {
  waiting_customer: { label: 'Esperando cliente', className: 'bg-amber-100 text-amber-800' },
  quote_sent: { label: 'Cotización enviada', className: 'bg-sky-100 text-sky-800' },
  hot_lead: { label: 'Lead caliente', className: 'bg-red-100 text-red-800' },
  payment_pending: { label: 'Pago pendiente', className: 'bg-violet-100 text-violet-800' },
  appointment: { label: 'Cita agendada', className: 'bg-emerald-100 text-emerald-800' },
};

function displayName(conv) {
  if (conv?.wa_contact_name) return conv.wa_contact_name;
  const c = conv?.customer;
  if (c) return c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente';
  return conv?.wa_contact_phone || 'Contacto';
}

function assigneeName(user) {
  if (!user) return null;
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Asesor';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function StatusTicks({ status }) {
  if (status === 'read') return <CheckCheck size={14} className="text-sky-500 inline" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-gray-400 inline" />;
  if (status === 'failed') return <span className="text-red-500 text-[10px]">!</span>;
  return <Check size={14} className="text-gray-400 inline" />;
}

const API_HOST = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');

function resolveMediaUrl(url, { asAudio = false } = {}) {
  if (!url) return null;
  let out = url;
  if (out.startsWith('/')) out = `${API_HOST}${out}`;
  // Bug histórico: media apuntando al frontend Vite
  out = out.replace('http://localhost:5172/', `${API_HOST}/`).replace('http://localhost:5173/', `${API_HOST}/`);
  if (asAudio && out.includes('res.cloudinary.com') && out.includes('/video/upload/') && !out.includes('/f_mp3/')) {
    out = out.replace('/video/upload/', '/video/upload/f_mp3/');
  }
  return out;
}

function isPdf(message) {
  const mime = message.raw_payload?.mimeType || message.raw_payload?.mime_type || '';
  const name = (message.raw_payload?.filename || message.body || '').toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf') || (message.media_url || '').toLowerCase().includes('.pdf');
}

function MessageMedia({ message }) {
  const mime = message.raw_payload?.mimeType || message.raw_payload?.mime_type || '';
  const filename = message.raw_payload?.filename || null;
  const url = resolveMediaUrl(message.media_url, { asAudio: message.type === 'audio' });
  if (!url) return null;

  if (message.type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mb-1">
        <img
          src={url}
          alt={filename || 'Imagen'}
          className="rounded-md max-h-52 max-w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </a>
    );
  }

  if (message.type === 'audio') {
    return (
      <div className="mb-1 space-y-1 min-w-[220px]">
        <audio controls preload="metadata" className="w-full max-w-[260px] h-10">
          <source src={url} type="audio/mpeg" />
          <source src={resolveMediaUrl(message.media_url)} type={mime || 'audio/webm'} />
        </audio>
        <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-700 hover:underline">
          Descargar audio
        </a>
      </div>
    );
  }

  if (message.type === 'video') {
    return (
      <video controls className="rounded-md mb-1 max-h-52 max-w-full" preload="metadata">
        <source src={url} type={mime || 'video/mp4'} />
      </video>
    );
  }

  if (message.type === 'document') {
    const name = filename || message.body || 'Archivo';
    const pdf = isPdf(message);
    return (
      <div className="mb-1 space-y-2 min-w-[220px]">
        {pdf && (
          <iframe
            title={name}
            src={`${url}#toolbar=0&navpanes=0`}
            className="w-full h-48 rounded-md border border-black/10 bg-white"
          />
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-2 py-2 rounded-md bg-black/5 hover:bg-black/10 text-xs font-medium"
        >
          <FileText size={16} className="shrink-0 text-emerald-700" />
          <span className="truncate">{name}</span>
        </a>
      </div>
    );
  }

  return null;
}

function PriorityDot({ priority }) {
  if (priority === 'urgent') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Urgente" />;
  if (priority === 'high') return <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Alta" />;
  return null;
}

export default function WhatsAppInboxPage() {
  const { user } = useAuthStore();
  const canAssignOthers = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const { on, subscribeConversation, unsubscribeConversation } = useWhatsAppSocket();

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [advisors, setAdvisors] = useState([]);
  const [waStatus, setWaStatus] = useState(null);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [markOptions, setMarkOptions] = useState([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showPlus, setShowPlus] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');
  const [followDraft, setFollowDraft] = useState('');
  const [simBody, setSimBody] = useState('¿Me confirma el valor final?');
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [pendingFile, setPendingFile] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const demoMode = !!waStatus?.demo_mode;
  const operational = !!waStatus?.operational;

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (filter === 'mine') params.scope = 'mine';
      if (filter === 'followups') params.scope = canAssignOthers ? undefined : 'mine';
      const res = await crmApi.listWaConversations(params);
      let list = res.data.data || [];
      if (filter === 'unassigned') list = list.filter((c) => !c.assigned_user_id);
      if (filter === 'followups') {
        list = list.filter((c) => c.follow_up_at && new Date(c.follow_up_at) <= new Date(Date.now() + 48 * 3600 * 1000));
      }
      if (filter === 'pinned') list = list.filter((c) => c.is_pinned);
      setConversations(list);
    } catch {
      toast.error('No se pudieron cargar las conversaciones');
    } finally {
      setLoadingList(false);
    }
  }, [q, filter, canAssignOthers]);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    setLoadingMsgs(true);
    try {
      const res = await crmApi.listWaMessages(id);
      setMessages(res.data.data || []);
      await crmApi.markWaConversationRead(id);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
    } catch {
      toast.error('No se pudieron cargar los mensajes');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    crmApi.getWhatsAppCloudStatus()
      .then((res) => setWaStatus(res.data.data))
      .catch(() => setWaStatus(null));
    crmApi.getWaWorkspacePrefs()
      .then((res) => {
        setPrefs({ ...DEFAULT_PREFS, ...(res.data.data?.prefs || {}) });
        setMarkOptions(res.data.data?.mark_options || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (canAssignOthers) {
      usersAPI.getAll({ limit: 200, is_active: true })
        .then((res) => setAdvisors((res.data?.users || []).filter((u) => !['technician'].includes(u.role))))
        .catch(() => {});
    }
  }, [canAssignOthers]);

  useEffect(() => {
    if (selected) {
      setNoteDraft(selected.internal_note || '');
      setFollowDraft(selected.follow_up_at ? selected.follow_up_at.slice(0, 16) : '');
    }
  }, [selected?.id, selected?.internal_note, selected?.follow_up_at]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      subscribeConversation(selectedId);
      return () => unsubscribeConversation(selectedId);
    }
    return undefined;
  }, [selectedId, loadMessages, subscribeConversation, unsubscribeConversation]);

  useEffect(() => {
    const offMsg = on('wa:new-message', (payload) => {
      const cid = payload?.conversation_id;
      if (!cid) return;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === cid);
        const base = payload.conversation || {};
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...base };
          const [item] = next.splice(idx, 1);
          return [item, ...next];
        }
        loadConversations();
        return prev;
      });
      if (cid === selectedId && payload.message) {
        setMessages((prev) => (prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]));
        crmApi.markWaConversationRead(cid).catch(() => {});
      }
    });
    const offAssign = on('wa:assigned', (payload) => {
      if (!payload?.conversation_id) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === payload.conversation_id ? { ...c, assigned_user_id: payload.assigned_user_id } : c))
      );
    });
    const offUpd = on('wa:conversation-updated', (payload) => {
      const c = payload?.conversation;
      if (!c?.id) return;
      setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...c } : x)));
    });
    return () => { offMsg(); offAssign(); offUpd(); };
  }, [on, selectedId, loadConversations]);

  const patchConversation = async (patch) => {
    if (!selectedId) return;
    try {
      const res = await crmApi.updateWaConversation(selectedId, patch);
      const updated = res.data.data;
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...updated } : c)));
      return updated;
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar');
      throw err;
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!selectedId || sending) return;

    if (pendingFile) {
      setSending(true);
      try {
        const fd = new FormData();
        fd.append('file', pendingFile);
        if (draft.trim()) fd.append('caption', draft.trim());
        const res = await crmApi.sendWaConversationMedia(selectedId, fd);
        const msg = res.data.data?.message;
        if (msg) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        else await loadMessages(selectedId);
        setDraft('');
        setPendingFile(null);
        loadConversations();
      } catch (err) {
        toast.error(err.response?.data?.message || 'No se pudo enviar el archivo');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!draft.trim()) return;
    if (selected?.window && !selected.window.open && !demoMode) {
      toast.error('Ventana 24h cerrada. En producción usa una plantilla Meta.');
    }
    setSending(true);
    try {
      const res = await crmApi.sendWaConversationText(selectedId, { body: draft.trim() });
      const msg = res.data.data?.message;
      if (msg) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      else await loadMessages(selectedId);
      setDraft('');
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  };

  const sendBlobAsAudio = async (blob) => {
    if (!selectedId || !blob) return;
    setSending(true);
    try {
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'audio');
      const res = await crmApi.sendWaConversationMedia(selectedId, fd);
      const msg = res.data.data?.message;
      if (msg) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      else await loadMessages(selectedId);
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo enviar el audio');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!operational || !selectedId || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size > 0) await sendBlobAsAudio(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      toast.error('No se pudo acceder al micrófono. Permite el acceso en el navegador.');
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecording(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    mediaRecorderRef.current = null;
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecording(false);
    setRecordSecs(0);
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = () => {
        try {
          recorder.stream?.getTracks?.().forEach((t) => t.stop());
        } catch { /* ignore */ }
      };
      if (recorder.state !== 'inactive') recorder.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    try {
      mediaRecorderRef.current?.stream?.getTracks?.().forEach((t) => t.stop());
    } catch { /* ignore */ }
  }, []);

  const handleAssign = async (assignedUserId) => {
    if (!selectedId) return;
    try {
      const res = await crmApi.assignWaConversation(selectedId, { assigned_user_id: assignedUserId });
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...res.data.data } : c)));
      toast.success(assignedUserId ? 'Conversación asignada' : 'En cola');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo asignar');
    }
  };

  const handleSuggest = async () => {
    if (!selectedId || aiBusy) return;
    setAiBusy(true);
    try {
      const res = await crmApi.suggestWaReply(selectedId);
      if (res.data.data?.suggestion) setDraft(res.data.data.suggestion);
    } catch (err) {
      toast.error(err.response?.data?.message || 'IA no disponible');
    } finally {
      setAiBusy(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedId || aiBusy) return;
    setAiBusy(true);
    try {
      const res = await crmApi.summarizeWaConversation(selectedId);
      if (res.data.data?.summary) toast(res.data.data.summary, { duration: 8000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'IA no disponible');
    } finally {
      setAiBusy(false);
    }
  };

  const toggleMark = async (key) => {
    const current = selected?.marks || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    await patchConversation({ marks: next });
  };

  const savePrefs = async (next) => {
    setPrefs(next);
    try {
      await crmApi.updateWaWorkspacePrefs(next);
      toast.success('Panel personalizado');
    } catch {
      toast.error('No se guardaron preferencias');
    }
  };

  const enableDemo = async () => {
    try {
      const res = await crmApi.setWhatsAppDemoMode(true);
      setWaStatus(res.data.data);
      toast.success('Modo demo activado');
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo activar demo');
    }
  };

  const simulateInbound = async () => {
    if (!selectedId || !simBody.trim()) return;
    try {
      await crmApi.simulateWaInbound({ conversation_id: selectedId, body: simBody.trim() });
      toast.success('Mensaje del cliente simulado');
      setSimBody('¿Me confirma el valor final?');
      loadMessages(selectedId);
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo simular');
    }
  };

  const filters = [
    { key: 'all', label: canAssignOthers ? 'Todas' : 'Mías + cola' },
    { key: 'mine', label: 'Mías' },
    ...(canAssignOthers ? [{ key: 'unassigned', label: 'Sin asignar' }] : []),
    { key: 'followups', label: 'Seguimientos' },
    { key: 'pinned', label: 'Fijadas' },
  ];

  return (
    <Layout>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="text-emerald-600" size={26} />
              WhatsApp Pitbox
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {canAssignOthers
                ? 'Vista admin: seguimiento de todos los asesores'
                : 'Tu bandeja — gestiona como WhatsApp, con plus de CRM'}
              {demoMode && <span className="ml-2 text-amber-700 font-medium">· Modo demo (sin Meta)</span>}
              {waStatus?.connected && <span className="ml-2 text-emerald-600">· Cloud API conectada</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPrefs((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              <SlidersHorizontal size={14} />
              Mis funciones
            </button>
            <CrmSubNav />
          </div>
        </div>

        {demoMode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Demo comercial.</strong> Los mensajes se guardan en Pitbox sin salir a Meta.
            Ideal para mostrar el comportamiento a clientes. Cuando Meta esté listo, se desactiva el demo y se conecta Cloud API.
            {canAssignOthers && (
              <span className="block mt-1 text-xs text-amber-800">
                Tip: entra también como vendedor para ver que solo ve sus chats + cola.
              </span>
            )}
          </div>
        )}

        {!operational && canAssignOthers && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
            <p className="text-gray-600">Activa el modo demo para mostrar el WhatsApp de Pitbox sin Meta.</p>
            <button
              type="button"
              onClick={enableDemo}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
            >
              Activar modo demo
            </button>
          </div>
        )}

        {showPrefs && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Personaliza tu panel plus</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Activa o quita funciones visuales. El admin siempre ve asignación y seguimiento de asesores.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.keys(PREF_LABELS).map((key) => (
                <label key={key} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!prefs[key]}
                    onChange={(e) => savePrefs({ ...prefs, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {PREF_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col lg:flex-row h-[calc(100vh-240px)] min-h-[520px]">
          {/* Lista */}
          <aside className="w-full lg:w-[320px] border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col bg-[#f0f2f5]">
            <div className="p-3 space-y-2 border-b border-gray-100 bg-[#008069] text-white">
              <p className="text-sm font-semibold tracking-wide">Chats</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-0 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white/40 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-1 p-2 overflow-x-auto bg-white border-b border-gray-100">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 text-[11px] rounded-full font-medium whitespace-nowrap transition ${
                    filter === f.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              {loadingList && (
                <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
              )}
              {!loadingList && conversations.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10 px-4">
                  Sin conversaciones. {demoMode ? 'Corre el seed demo o simula un mensaje.' : 'Conecta Meta o activa el modo demo.'}
                </p>
              )}
              {conversations.map((conv) => {
                const active = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left px-3 py-3 border-b border-gray-50 transition ${
                      active ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-start gap-2">
                        <PriorityDot priority={conv.priority} />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate flex items-center gap-1">
                            {conv.is_pinned && <Pin size={12} className="text-emerald-600 shrink-0" />}
                            {displayName(conv)}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11} />
                            {conv.wa_contact_phone}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {!conv.assigned_user_id && (
                              <span className="text-[10px] font-medium uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Cola</span>
                            )}
                            {(conv.marks || []).slice(0, 2).map((m) => (
                              <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded ${MARK_META[m]?.className || 'bg-gray-100 text-gray-600'}`}>
                                {MARK_META[m]?.label || m}
                              </span>
                            ))}
                          </div>
                          {canAssignOthers && conv.assignee && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">Asesor: {assigneeName(conv.assignee)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px] text-gray-400">{formatTime(conv.last_message_at)}</span>
                        {conv.unread_count > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-emerald-600 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Chat */}
          <section className="flex-1 flex flex-col min-w-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSIjZTVlNWUwIiBmaWxsLW9wYWNpdHk9IjAuMzUiPjxwYXRoIGQ9Ik0zNiAxOGMwIDAtNiA2LTEyIDZTMTIgMTggMTIgMThzNi02IDEyLTYgMTIgNiAxMiA2eiIvPjwvZz48L3N2Zz4=')] bg-[#e5ddd5]">
            {!selected && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 px-6 bg-[#f0f2f5]">
                <MessageCircle size={48} className="opacity-30" />
                <p className="text-sm font-medium">WhatsApp Pitbox</p>
                <p className="text-xs text-center max-w-sm text-gray-400">
                  Selecciona un chat. El asesor trabaja aquí; el admin ve y asigna todo el equipo.
                </p>
              </div>
            )}

            {selected && (
              <>
                <header className="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{displayName(selected)}</p>
                    <p className="text-xs text-gray-500">{selected.wa_contact_phone}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {prefs.show_window_status && selected.window && (
                      <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                        selected.window.open ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selected.window.open ? 'Ventana 24h abierta' : 'Ventana cerrada'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPlus((v) => !v)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      {showPlus ? 'Ocultar plus' : 'Plus CRM'}
                    </button>
                  </div>
                </header>

                <div className="flex-1 flex min-h-0">
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                      {loadingMsgs && (
                        <div className="flex justify-center py-8 text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
                      )}
                      {!loadingMsgs && messages.map((m) => {
                        const outbound = m.direction === 'out';
                        return (
                          <div key={m.id} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                              outbound ? 'bg-[#d9fdd3] text-gray-900 rounded-br-none' : 'bg-white text-gray-900 rounded-bl-none'
                            }`}>
                              <MessageMedia message={m} />
                              {m.body && !(m.type === 'audio' && m.media_url) && (
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              )}
                              {!m.body && !m.media_url && (
                                <p className="whitespace-pre-wrap break-words">[{m.type}]</p>
                              )}
                              <div className="mt-1 flex items-center gap-1 justify-end text-[10px] text-gray-500">
                                {m.source === 'demo' && <span className="mr-1 opacity-70">demo</span>}
                                {m.source === 'app_echo' && <span className="mr-1">App</span>}
                                <span>{formatTime(m.created_at)}</span>
                                {outbound && <StatusTicks status={m.status} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-2.5 bg-[#f0f2f5] border-t border-gray-200 space-y-2">
                      {pendingFile && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs">
                          <FileText size={14} className="text-emerald-700 shrink-0" />
                          <span className="truncate flex-1">{pendingFile.name}</span>
                          <span className="text-gray-400 shrink-0">{(pendingFile.size / 1024).toFixed(0)} KB</span>
                          <button type="button" onClick={() => setPendingFile(null)} className="p-1 hover:bg-gray-100 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {recording ? (
                        <div className="flex items-center gap-3 px-2">
                          <button
                            type="button"
                            onClick={cancelRecording}
                            className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                          <div className="flex-1 flex items-center gap-2 text-sm text-red-600 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            Grabando {String(Math.floor(recordSecs / 60)).padStart(2, '0')}:{String(recordSecs % 60).padStart(2, '0')}
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            disabled={sending}
                            className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40"
                            title="Enviar audio"
                          >
                            <Square size={14} fill="currentColor" />
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleSend} className="flex items-end gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                if (f.size > 16 * 1024 * 1024) {
                                  toast.error('Máximo 16 MB');
                                } else {
                                  setPendingFile(f);
                                }
                              }
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            disabled={!operational || sending}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            title="Adjuntar archivo"
                          >
                            <Paperclip size={16} />
                          </button>
                          {(prefs.show_ai_suggest) && (
                            <button type="button" onClick={handleSuggest} disabled={aiBusy || !operational}
                              className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" title="Sugerir">
                              <Sparkles size={15} />
                            </button>
                          )}
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={1}
                            placeholder={
                              pendingFile
                                ? 'Caption opcional…'
                                : operational ? 'Escribe un mensaje' : 'Activa demo o conecta Meta'
                            }
                            disabled={!operational}
                            className="flex-1 resize-none text-sm rounded-xl border-0 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/40 outline-none disabled:bg-gray-100"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                              }
                            }}
                          />
                          {(draft.trim() || pendingFile) ? (
                            <button
                              type="submit"
                              disabled={sending || !operational}
                              className="shrink-0 h-10 w-10 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#006e5a] disabled:opacity-40"
                            >
                              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!operational || sending}
                              onClick={startRecording}
                              className="shrink-0 h-10 w-10 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#006e5a] disabled:opacity-40"
                              title="Grabar audio"
                            >
                              <Mic size={16} />
                            </button>
                          )}
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Plus CRM panel */}
                  {showPlus && (
                    <aside className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto p-3 space-y-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Gestión plus</p>
                        {!selected.assigned_user_id && (
                          <button
                            type="button"
                            onClick={() => handleAssign(user.id)}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 mb-2"
                          >
                            <UserPlus size={13} /> Tomar conversación
                          </button>
                        )}

                        {prefs.show_assign && canAssignOthers && (
                          <label className="block text-xs text-gray-600 mb-3">
                            Asesor
                            <select
                              className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                              value={selected.assigned_user_id || ''}
                              onChange={(e) => handleAssign(e.target.value || null)}
                            >
                              <option value="">Sin asignar (cola)</option>
                              {advisors.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {`${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {prefs.show_pin && (
                          <button
                            type="button"
                            onClick={() => patchConversation({ is_pinned: !selected.is_pinned })}
                            className="w-full inline-flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 mb-2"
                          >
                            {selected.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                            {selected.is_pinned ? 'Quitar fijado' : 'Fijar chat'}
                          </button>
                        )}

                        {prefs.show_priority && (
                          <label className="block text-xs text-gray-600 mb-3">
                            Prioridad
                            <select
                              className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              value={selected.priority || 'normal'}
                              onChange={(e) => patchConversation({ priority: e.target.value })}
                            >
                              <option value="normal">Normal</option>
                              <option value="high">Alta</option>
                              <option value="urgent">Urgente</option>
                            </select>
                          </label>
                        )}

                        {prefs.show_follow_up && (
                          <label className="block text-xs text-gray-600 mb-3">
                            <span className="inline-flex items-center gap-1"><Clock size={12} /> Seguimiento</span>
                            <input
                              type="datetime-local"
                              className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              value={followDraft}
                              onChange={(e) => setFollowDraft(e.target.value)}
                              onBlur={() => patchConversation({
                                follow_up_at: followDraft ? new Date(followDraft).toISOString() : null,
                              })}
                            />
                          </label>
                        )}

                        {prefs.show_marks && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-600 mb-1.5 inline-flex items-center gap-1">
                              <CircleDot size={12} /> Marcas
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(markOptions.length ? markOptions : Object.entries(MARK_META).map(([key, v]) => ({ key, label: v.label }))).map((m) => {
                                const key = m.key;
                                const active = (selected.marks || []).includes(key);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleMark(key)}
                                    className={`text-[10px] px-2 py-1 rounded-full border transition ${
                                      active
                                        ? (MARK_META[key]?.className || 'bg-emerald-100 text-emerald-800') + ' border-transparent'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {m.label || MARK_META[key]?.label || key}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {prefs.show_internal_note && (
                          <label className="block text-xs text-gray-600 mb-3">
                            <span className="inline-flex items-center gap-1"><StickyNote size={12} /> Nota interna</span>
                            <textarea
                              rows={3}
                              className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              onBlur={() => {
                                if (noteDraft !== (selected.internal_note || '')) {
                                  patchConversation({ internal_note: noteDraft });
                                }
                              }}
                              placeholder="Solo visible en Pitbox, no se envía a WhatsApp"
                            />
                          </label>
                        )}

                        {prefs.show_customer_link && selected.customer_id && (
                          <Link
                            to={`/customers/${selected.customer_id}`}
                            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline mb-3"
                          >
                            <ExternalLink size={12} /> Ver cliente en CRM
                          </Link>
                        )}

                        {prefs.show_ai_summarize && (
                          <button
                            type="button"
                            onClick={handleSummarize}
                            disabled={aiBusy}
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 mb-2 disabled:opacity-40"
                          >
                            Resumir conversación (IA)
                          </button>
                        )}

                        {demoMode && prefs.show_demo_simulate && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 space-y-2">
                            <p className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                              <AlertTriangle size={12} /> Simular cliente
                            </p>
                            <textarea
                              rows={2}
                              value={simBody}
                              onChange={(e) => setSimBody(e.target.value)}
                              className="w-full text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white"
                            />
                            <button
                              type="button"
                              onClick={simulateInbound}
                              className="w-full text-xs font-medium py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                            >
                              Enviar como cliente
                            </button>
                          </div>
                        )}
                      </div>
                    </aside>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
