import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import DealModal from '../../components/crm/DealModal';
import NewDealModal from '../../components/crm/NewDealModal';
import crmApi from '../../api/crm';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import { useWhatsAppSocket } from '../../hooks/useWhatsAppSocket';
import {
  MessageCircle, Search, Send, UserPlus, CheckCheck, Check, Loader2,
  Sparkles, Pin, PinOff, Clock, StickyNote, Settings2, SlidersHorizontal,
  AlertTriangle, CircleDot, ExternalLink, Paperclip, Mic, Square, FileText, X,
  ArrowLeft, ArrowUpRight, Plus, User as UserIcon,
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

const GRADIENT_BG = 'bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600';
const DEFAULT_STAGE_COLOR = '#64748b';
// Conversaciones por tanda en la bandeja ("Cargar más"); al refrescar se
// vuelven a pedir hasta WA_MAX_RELOAD para no perder lo ya cargado.
const WA_PAGE = 50;
const WA_MAX_RELOAD = 200;
const AVATAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

// Nombre "real" del contacto: si solo hay número, el chat no tiene nombre.
function hasRealName(conv) {
  return displayName(conv) !== (conv?.wa_contact_phone || 'Contacto');
}

function initialsOf(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function avatarColor(name) {
  const sum = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// Últimos 10 dígitos: iguala "573166876163" con "3166876163".
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-10);

const compactCOP = (v) => {
  const n = parseFloat(v || 0);
  if (!n) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function Avatar({ name, size = 'h-10 w-10' }) {
  if (!name) {
    return (
      <span className={`${size} flex-none rounded-full bg-gray-200 text-gray-500 flex items-center justify-center`}>
        <UserIcon size={16} />
      </span>
    );
  }
  return (
    <span className={`${size} flex-none rounded-full text-white text-xs font-bold flex items-center justify-center ${avatarColor(name)}`}>
      {initialsOf(name)}
    </span>
  );
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
  // Conexión/config de WhatsApp (activar demo, etc.) -- solo admin del tenant,
  // ver whatsappCloud.routes.js (checkRole('admin') en esos endpoints).
  const isAdmin = user?.role === 'admin';
  const { on, subscribeConversation, unsubscribeConversation } = useWhatsAppSocket();

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  // "Cargar más": cuántas conversaciones hay cargadas (al refrescar se
  // vuelven a pedir las mismas, no solo la primera página) y si quedan más.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedCountRef = useRef(WA_PAGE);
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
  // En pantallas angostas el panel plus reemplaza al chat, así que arranca cerrado.
  const [showPlus, setShowPlus] = useState(() => !window.matchMedia('(max-width: 1023px)').matches);
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

  // Celular/tablet: lista y chat son dos pantallas, como en WhatsApp.
  const isNarrow = useMediaQuery('(max-width: 1023px)');

  // Negocio abierto de cada chat — se cruza por cliente y, si el chat aún no
  // está ligado a un cliente, por teléfono.
  const [stages, setStages] = useState([]);
  const [openDeals, setOpenDeals] = useState([]);
  const [dealOpp, setDealOpp] = useState(null);
  const [newDealOpen, setNewDealOpen] = useState(false);

  const loadDeals = useCallback(async () => {
    try {
      const [stagesRes, oppsRes] = await Promise.all([crmApi.listPipelineStages(), crmApi.listOpportunities({ open_only: true })]);
      const stageList = stagesRes.data.data || [];
      const openKeys = new Set(stageList.filter(s => s.stage_type === 'open').map(s => s.key));
      setStages(stageList);
      setOpenDeals((oppsRes.data.data || []).filter(o => openKeys.has(o.stage)));
    } catch { /* sin negocios el chat sigue funcionando; solo no muestra el chip */ }
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const stageByKey = useMemo(() => Object.fromEntries(stages.map(s => [s.key, s])), [stages]);
  const dealIndex = useMemo(() => {
    const byCustomer = new Map();
    const byPhone = new Map();
    // La lista viene ordenada por prioridad: el primero de cada cliente es el más relevante.
    for (const o of openDeals) {
      if (!byCustomer.has(o.customer_id)) byCustomer.set(o.customer_id, o);
      for (const p of [o.customer?.mobile, o.customer?.phone]) {
        const key = phoneKey(p);
        if (key.length === 10 && !byPhone.has(key)) byPhone.set(key, o);
      }
    }
    return { byCustomer, byPhone };
  }, [openDeals]);
  const dealOf = useCallback(
    (conv) => (conv?.customer_id && dealIndex.byCustomer.get(conv.customer_id)) || dealIndex.byPhone.get(phoneKey(conv?.wa_contact_phone)) || null,
    [dealIndex]
  );
  const selectedDeal = dealOf(selected);
  // Nombre a mostrar: el del chat o, si solo tiene número, el del cliente del
  // negocio encontrado por teléfono. null = contacto sin nombre.
  const nameOf = useCallback((conv, deal) => {
    if (hasRealName(conv)) return displayName(conv);
    const c = deal?.customer;
    return c ? (c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || null) : null;
  }, []);
  const selectedName = selected ? nameOf(selected, selectedDeal) : null;

  const openDeal = async (opportunityId) => {
    try {
      const res = await crmApi.getOpportunity(opportunityId);
      setDealOpp(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo abrir el negocio');
    }
  };

  const listParams = useCallback(() => {
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (filter === 'mine') params.scope = 'mine';
    if (filter === 'followups') params.scope = canAssignOthers ? undefined : 'mine';
    // Sin asignar / seguimientos / fijadas se filtran en el servidor.
    if (['unassigned', 'followups', 'pinned'].includes(filter)) params.view = filter;
    return params;
  }, [q, filter, canAssignOthers]);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const limit = Math.min(Math.max(WA_PAGE, loadedCountRef.current), WA_MAX_RELOAD);
      const res = await crmApi.listWaConversations({ ...listParams(), limit, offset: 0 });
      const list = res.data.data || [];
      loadedCountRef.current = Math.max(WA_PAGE, list.length);
      setConversations(list);
      setHasMore(!!res.data.has_more);
    } catch {
      toast.error('No se pudieron cargar las conversaciones');
    } finally {
      setLoadingList(false);
    }
  }, [listParams]);

  const loadMoreConversations = async () => {
    setLoadingMore(true);
    try {
      const res = await crmApi.listWaConversations({ ...listParams(), limit: WA_PAGE, offset: conversations.length });
      const more = res.data.data || [];
      setConversations((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const next = prev.concat(more.filter((c) => !ids.has(c.id)));
        loadedCountRef.current = next.length;
        return next;
      });
      setHasMore(!!res.data.has_more);
    } catch {
      toast.error('No se pudieron cargar más conversaciones');
    } finally {
      setLoadingMore(false);
    }
  };

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

  // Búsqueda o vista nuevas: vuelve a la primera página.
  useEffect(() => { loadedCountRef.current = WA_PAGE; }, [q, filter]);
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
      usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true })
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

  const disableDemo = async () => {
    try {
      const res = await crmApi.setWhatsAppDemoMode(false);
      setWaStatus(res.data.data);
      toast.success('Modo demo desactivado');
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo desactivar demo');
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
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">WhatsApp Pitbox</h1>
                {demoMode && (
                  <span
                    title={`Demo comercial: los mensajes se guardan en Pitbox sin salir a Meta.${waStatus?.connected
                      ? ' Este tenant también tiene una conexión real, pero el demo tiene prioridad mientras esté activo.'
                      : ' Cuando Meta esté listo, se desactiva el demo y se conecta Cloud API.'}${canAssignOthers ? ' Tip: entra como vendedor para ver que solo ve sus chats + cola.' : ''}`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 ring-1 ring-amber-200 cursor-help">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Modo demo
                  </span>
                )}
                {waStatus?.connected && !demoMode && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cloud API conectada
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-sm text-gray-500">
                {canAssignOthers
                  ? 'Vista admin: seguimiento de todos los asesores'
                  : 'Tu bandeja — gestiona como WhatsApp, con plus de CRM'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPrefs((v) => !v)}
            aria-expanded={showPrefs}
            className="flex-none inline-flex items-center gap-1.5 !text-xs font-medium !px-3 !py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 whitespace-nowrap"
          >
            <SlidersHorizontal size={14} />
            Mis funciones
          </button>
        </div>

        <CrmSubNav />

        {!operational && isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
            <p className="text-gray-600">
              Conecta el número de WhatsApp del negocio para empezar a chatear, o activa el modo demo para mostrar el WhatsApp de Pitbox sin Meta.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/settings/whatsapp"
                className="px-3 py-1.5 rounded-lg bg-[#008069] text-white text-xs font-semibold hover:bg-[#006e5a]"
              >
                Conectar número
              </Link>
              <button
                type="button"
                onClick={enableDemo}
                className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-50"
              >
                Activar modo demo
              </button>
            </div>
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
            {demoMode && isAdmin && (
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3 text-xs text-amber-900">
                <span><strong>Modo demo activo.</strong> Los mensajes no salen a Meta.</span>
                <button type="button" onClick={disableDemo}
                  className="shrink-0 !px-3 !py-1 rounded-lg bg-white border border-amber-300 text-amber-800 !text-xs font-semibold hover:bg-amber-100">
                  Desactivar demo
                </button>
              </div>
            )}
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

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex h-[calc(100vh-240px)] min-h-[520px]">
          {/* Lista — <div> y no <aside>: index.css vuelve fijo todo `aside` bajo 1024px (menú lateral) */}
          <div className={`${isNarrow && selected ? 'hidden' : 'flex'} w-full lg:w-[330px] flex-none lg:border-r border-gray-100 flex-col bg-white`}>
            <div className="p-3 space-y-2 border-b border-gray-100 bg-[#008069] text-white">
              <p className="text-sm font-semibold tracking-wide">Chats</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar nombre o número"
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
                  className={`!px-2.5 !py-1 !text-[11px] rounded-full whitespace-nowrap transition ${
                    filter === f.key ? 'bg-emerald-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 font-medium hover:bg-gray-200'
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
                  Sin conversaciones.{' '}
                  {demoMode ? 'Corre el seed demo o simula un mensaje.' : operational ? '' : isAdmin ? (
                    <>
                      <Link to="/settings/whatsapp" className="text-emerald-700 font-medium hover:underline">
                        Conecta tu número
                      </Link>{' '}
                      en Configuración → WhatsApp Business o activa el modo demo.
                    </>
                  ) : 'Pide a un administrador que conecte el número en Configuración → WhatsApp Business.'}
                </p>
              )}
              {conversations.map((conv) => {
                const active = conv.id === selectedId;
                const deal = dealOf(conv);
                const dealStage = deal ? stageByKey[deal.stage] : null;
                const name = nameOf(conv, deal);
                const unread = conv.unread_count > 0;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left !px-3 !py-3 !text-sm border-b border-gray-50 border-l-[3px] transition ${
                      active ? 'bg-[#f0f2f5] border-l-emerald-600' : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate flex items-center gap-1">
                            <PriorityDot priority={conv.priority} />
                            {conv.is_pinned && <Pin size={12} className="text-emerald-600 shrink-0" />}
                            {name || displayName(conv)}
                          </p>
                          <span className={`text-[11px] shrink-0 ${unread ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        {name && (
                          <p className="text-xs text-gray-500 truncate">{conv.wa_contact_phone}</p>
                        )}
                        {canAssignOthers && conv.assignee && (
                          <p className="text-[11px] text-gray-400 truncate">Asesor: {assigneeName(conv.assignee)}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {!conv.assigned_user_id && (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">En cola</span>
                          )}
                          {deal ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-gray-200 bg-white text-gray-700">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: dealStage?.color || DEFAULT_STAGE_COLOR }} />
                              {dealStage?.label || deal.stage}
                              {compactCOP(deal.expected_value) && <span className="text-gray-400">· {compactCOP(deal.expected_value)}</span>}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] text-gray-400 border border-dashed border-gray-200">Sin negocio</span>
                          )}
                          {(conv.marks || []).slice(0, 2).map((m) => (
                            <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded-full ${MARK_META[m]?.className || 'bg-gray-100 text-gray-600'}`}>
                              {MARK_META[m]?.label || m}
                            </span>
                          ))}
                          {unread && (
                            <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-emerald-600 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {hasMore && !loadingList && (
                <button
                  type="button"
                  onClick={loadMoreConversations}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore && <Loader2 className="animate-spin" size={14} />}
                  Cargar más conversaciones
                </button>
              )}
            </div>
          </div>

          {/* Chat */}
          <section className={`${isNarrow && !selected ? 'hidden' : 'flex'} flex-1 flex-col min-w-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSIjZTVlNWUwIiBmaWxsLW9wYWNpdHk9IjAuMzUiPjxwYXRoIGQ9Ik0zNiAxOGMwIDAtNiA2LTEyIDZTMTIgMTggMTIgMThzNi02IDEyLTYgMTIgNiAxMiA2eiIvPjwvZz48L3N2Zz4=')] bg-[#e5ddd5]`}>
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
                <header className="px-3 sm:px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex flex-wrap items-center gap-2">
                  {isNarrow && (
                    <button type="button" onClick={() => setSelectedId(null)} aria-label="Volver a los chats"
                      className="flex-none h-8 w-8 !p-0 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 transition">
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <Avatar name={selectedName} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{selectedName || displayName(selected)}</p>
                    {selectedName && <p className="text-[11px] text-gray-500">{selected.wa_contact_phone}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {prefs.show_window_status && selected.window && (
                      <span className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        selected.window.open ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selected.window.open ? 'Ventana 24h abierta' : 'Ventana cerrada'}
                      </span>
                    )}
                    {selectedDeal ? (
                      <button type="button" onClick={() => openDeal(selectedDeal.id)} title="Abrir el negocio"
                        className="inline-flex items-center gap-1.5 !px-2.5 !py-1 rounded-full !text-[11px] font-medium border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-gray-900 transition whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageByKey[selectedDeal.stage]?.color || DEFAULT_STAGE_COLOR }} />
                        {stageByKey[selectedDeal.stage]?.label || selectedDeal.stage} · Ver negocio
                        <ArrowUpRight size={11} className="text-gray-400" />
                      </button>
                    ) : (
                      <button type="button" onClick={() => setNewDealOpen(true)}
                        className="inline-flex items-center gap-1 !px-2.5 !py-1 rounded-full !text-[11px] font-semibold border border-dashed border-orange-300 bg-white text-accent hover:bg-orange-50 transition whitespace-nowrap">
                        <Plus size={12} /> Crear negocio
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPlus((v) => !v)}
                      aria-pressed={showPlus}
                      className={`!text-xs font-semibold !px-3 !py-1.5 rounded-lg transition whitespace-nowrap ${
                        showPlus ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50' : `${GRADIENT_BG} text-white shadow-sm shadow-rose-500/30`
                      }`}
                    >
                      {showPlus ? 'Ocultar plus' : 'Plus CRM'}
                    </button>
                  </div>
                </header>

                <div className="flex-1 flex min-h-0">
                  <div className={`${isNarrow && showPlus ? 'hidden' : 'flex'} flex-1 flex-col min-w-0`}>
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
                            className="shrink-0 !p-0 h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            title="Adjuntar archivo"
                          >
                            <Paperclip size={16} />
                          </button>
                          {(prefs.show_ai_suggest) && (
                            <button type="button" onClick={handleSuggest} disabled={aiBusy || !operational}
                              className="shrink-0 !p-0 h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" title="Sugerir">
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
                                : operational ? 'Mensaje' : 'Conecta el número en Configuración → WhatsApp Business o activa el demo'
                            }
                            disabled={!operational}
                            className="flex-1 min-w-0 resize-none text-sm rounded-xl border-0 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/40 outline-none disabled:bg-gray-100"
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
                              className="shrink-0 !p-0 h-10 w-10 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#006e5a] disabled:opacity-40"
                            >
                              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!operational || sending}
                              onClick={startRecording}
                              className="shrink-0 !p-0 h-10 w-10 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#006e5a] disabled:opacity-40"
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
                    <div className="w-full lg:w-[280px] flex-none lg:border-l border-gray-200 bg-white overflow-y-auto p-3 space-y-4">
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
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <DealModal opportunity={dealOpp} stage={stageByKey[dealOpp?.stage]}
        onClose={() => setDealOpp(null)} onChanged={loadDeals} />

      <NewDealModal
        isOpen={newDealOpen}
        onClose={() => setNewDealOpen(false)}
        onCreated={() => { setNewDealOpen(false); toast.success('Negocio creado'); loadDeals(); }}
        initialCustomer={selected?.customer || null}
        initialPhone={selected?.customer ? '' : selected?.wa_contact_phone || ''}
        initialSource="whatsapp"
      />
    </Layout>
  );
}
