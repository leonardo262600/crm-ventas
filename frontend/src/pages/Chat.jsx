import React, { useEffect, useRef, useState } from 'react';
import { Bell, Circle, MessageSquare, Send, Volume2, VolumeX } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { enablePushNotifications } from '../utils/pushNotifications';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080/api').replace(/\/api\/?$/, '');
const timeLabel = value => value ? new Date(value).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) : '';

export default function Chat() {
  const { user } = useAuth();
  const [peers, setPeers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('crm_chat_sound') !== 'off');
  const [pushPermission, setPushPermission] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const selectedRef = useRef(null);

  const loadPeers = async () => {
    try {
      const { data } = await api.get('/chat/peers');
      setPeers(data);
      setSelected(current => current || data[0] || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron cargar las conversaciones');
    }
  };

  useEffect(() => {
    loadPeers();
    const timer = setInterval(loadPeers, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('crm_token') },
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room_history', setMessages);
    socket.on('new_message', message => {
      if (message.room !== selectedRef.current?.room) return;
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
      api.post('/chat/read', { room: message.room }).catch(() => {});
    });
    socket.on('user_typing', ({ user_name, isTyping }) => setTyping(isTyping ? user_name : ''));
    socket.on('chat_notification', loadPeers);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
    if (!selected || !socketRef.current) return;
    setMessages([]);
    setPeers(current => current.map(peer => peer.id === selected.id ? { ...peer, unread:0 } : peer));
    socketRef.current.emit('join_room', { room:selected.room });
    api.post('/chat/read', { room:selected.room }).catch(() => {});
  }, [selected]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), [messages, typing]);

  const handleText = event => {
    const value = event.target.value;
    setText(value);
    if (!selected || !socketRef.current) return;
    socketRef.current.emit('typing', { room:selected.room, isTyping:true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing', { room:selected.room, isTyping:false }), 1200);
  };

  const send = event => {
    event.preventDefault();
    if (!text.trim() || !selected || !socketRef.current) return;
    socketRef.current.emit('send_message', { room:selected.room, message:text.trim() });
    socketRef.current.emit('typing', { room:selected.room, isTyping:false });
    setText('');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('crm_chat_sound', next ? 'on' : 'off');
    toast.success(next ? 'Sonido activado' : 'Sonido desactivado');
  };

  const enablePush = async () => {
    try {
      const permission = await enablePushNotifications();
      setPushPermission(permission);
      toast.success('Notificaciones del chat activadas');
    } catch (error) { toast.error(error.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Chat interno</h1><p>Comunicación privada entre el asesor y sus setters</p></div>
        <div className="chat-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={toggleSound}>{soundEnabled?<Volume2 size={15}/>:<VolumeX size={15}/>}Sonido {soundEnabled?'activo':'inactivo'}</button>
          {pushPermission !== 'granted' && pushPermission !== 'unsupported' && <button className="btn btn-primary btn-sm" onClick={enablePush}><Bell size={15}/>Activar avisos</button>}
          <div className="chat-connection"><Circle size={9} fill={connected?'#10b981':'#ef4444'} color={connected?'#10b981':'#ef4444'}/>{connected?'En tiempo real':'Reconectando…'}</div>
        </div>
      </div>

      <div className="card chat-shell">
        <aside className="chat-people">
          <p className="chat-section-title">Conversaciones</p>
          {!peers.length && <p className="text-muted text-sm" style={{padding:12}}>No hay otros usuarios disponibles.</p>}
          {peers.map(peer => (
            <button key={peer.id} className={`chat-person ${selected?.id===peer.id?'active':''}`} onClick={()=>setSelected(peer)}>
              <span className="chat-avatar">{peer.role==='setter'?'🇦🇷':peer.name?.charAt(0).toUpperCase()}</span>
              <span className="chat-person-copy"><strong>{peer.name}</strong><small>{peer.role==='setter'?'Setter':'Asesor'}</small></span>
              {peer.unread>0 && <span className="chat-unread">{peer.unread>99?'99+':peer.unread}</span>}
            </button>
          ))}
        </aside>

        <section className="chat-conversation">
          {!selected ? (
            <div className="empty-state"><MessageSquare size={42}/><h3>Selecciona una conversación</h3></div>
          ) : <>
            <header className="chat-header"><strong>{selected.name}</strong><span>{selected.role==='setter'?'Setter':'Asesor'}</span></header>
            <div className="chat-messages">
              {!messages.length && <div className="chat-empty"><MessageSquare size={38}/><p>Empieza la conversación con {selected.name}</p></div>}
              {messages.map(message => {
                const mine = Number(message.user_id) === Number(user?.id);
                return <div key={message.id} className={`chat-message-row ${mine?'mine':''}`}>
                  <div className="chat-bubble">
                    <p>{message.message}</p>
                    <time>{timeLabel(message.created_at)}</time>
                  </div>
                </div>;
              })}
              {typing && <p className="chat-typing">{typing} está escribiendo…</p>}
              <div ref={bottomRef}/>
            </div>
            <form className="chat-compose" onSubmit={send}>
              <textarea value={text} onChange={handleText} rows={2} maxLength={2000} placeholder={`Escribe a ${selected.name}…`}/>
              <button className="btn btn-primary" type="submit" disabled={!text.trim() || !connected}><Send size={16}/>Enviar</button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}
