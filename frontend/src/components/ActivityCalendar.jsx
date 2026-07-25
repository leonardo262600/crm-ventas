import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfWeek as startW, endOfWeek as endW, parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_COLOR = {
  tarea: '#3B82F6', reunion: '#8B5CF6', llamada: '#10B981',
  email: '#F59E0B', recordatorio: '#EF4444',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ActivityCalendar({ activities, onDayClick, onEventClick }) {
  const [view, setView]       = useState('month'); // 'month' | 'week' | 'day'
  const [current, setCurrent] = useState(new Date());

  /* ── Navegación ── */
  const prev = () => {
    if (view === 'month') setCurrent(subMonths(current, 1));
    else if (view === 'week') setCurrent(subWeeks(current, 1));
    else setCurrent(subDays(current, 1));
  };
  const next = () => {
    if (view === 'month') setCurrent(addMonths(current, 1));
    else if (view === 'week') setCurrent(addWeeks(current, 1));
    else setCurrent(addDays(current, 1));
  };

  /* ── Días a mostrar ── */
  const days = useMemo(() => {
    if (view === 'month') {
      const calStart = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
      const calEnd   = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calStart, end: calEnd });
    }
    if (view === 'week') {
      return eachDayOfInterval({
        start: startW(current, { weekStartsOn: 1 }),
        end:   endW(current,   { weekStartsOn: 1 }),
      });
    }
    return [current]; // día
  }, [current, view]);

  const getActsForDay = (day) =>
    activities
      .filter(a => a.scheduled_at && isSameDay(new Date(a.scheduled_at), day))
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const title =
    view === 'month' ? format(current, 'MMMM yyyy', { locale: es }) :
    view === 'week'  ? `Semana del ${format(days[0], 'd MMM', { locale: es })} al ${format(days[6], 'd MMM yyyy', { locale: es })}` :
                       format(current, "EEEE, d 'de' MMMM yyyy", { locale: es });

  /* ── Chip de actividad compartido ── */
  const ActChip = ({ a, compact = false }) => (
    <div
      onClick={e => { e.stopPropagation(); onEventClick && onEventClick(a); }}
      title={a.title}
      style={{
        fontSize: compact ? 10 : 11, fontWeight: 500,
        background: `${TYPE_COLOR[a.type] || '#3B82F6'}18`,
        color: TYPE_COLOR[a.type] || '#3B82F6',
        borderLeft: `3px solid ${TYPE_COLOR[a.type] || '#3B82F6'}`,
        borderRadius: '0 6px 6px 0',
        padding: compact ? '2px 5px' : '4px 8px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        cursor: 'pointer', marginBottom: 2,
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {!compact && a.scheduled_at && (
        <span style={{ opacity: 0.7, flexShrink: 0 }}>
          {format(new Date(a.scheduled_at), 'HH:mm')}
        </span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</span>
    </div>
  );

  /* ─────────────────────── MONTH VIEW ─────────────────────── */
  if (view === 'month') {
    return (
      <div>
        <Toolbar title={title} prev={prev} next={next} view={view} setView={setView} current={current} setCurrent={setCurrent} />
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', padding: '6px 0', textTransform: 'uppercase', letterSpacing: .5 }}>{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {days.map(day => {
            const acts     = getActsForDay(day);
            const inMonth  = isSameMonth(day, current);
            const todayDay = isToday(day);
            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick && onDayClick(day)}
                onMouseEnter={e => { if (!todayDay) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!todayDay) e.currentTarget.style.background = '#fff'; }}
                style={{
                  minHeight: 90, background: todayDay ? '#f0fdf4' : '#fff',
                  border: `1px solid ${todayDay ? '#0f766e' : '#e2e8f0'}`,
                  borderRadius: 8, padding: '6px 4px', cursor: 'pointer',
                  opacity: inMonth ? 1 : 0.4, transition: 'background .1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: todayDay ? 700 : 500,
                    color: todayDay ? '#fff' : inMonth ? '#1e293b' : '#94a3b8',
                    background: todayDay ? '#0f766e' : 'transparent',
                    borderRadius: '50%', width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{format(day, 'd')}</span>
                  {acts.length > 0 && (
                    <span style={{ fontSize: 10, background: '#0f766e', color: '#fff', borderRadius: 10, padding: '1px 5px', fontWeight: 600 }}>{acts.length}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                  {acts.slice(0, 3).map(a => <ActChip key={a.id} a={a} compact />)}
                  {acts.length > 3 && <span style={{ fontSize: 9, color: '#94a3b8', paddingLeft: 4 }}>+{acts.length - 3} más</span>}
                </div>
              </div>
            );
          })}
        </div>
        <Legend />
      </div>
    );
  }

  /* ─────────────────────── WEEK VIEW ─────────────────────── */
  if (view === 'week') {
    return (
      <div>
        <Toolbar title={title} prev={prev} next={next} view={view} setView={setView} current={current} setCurrent={setCurrent} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {days.map(day => {
            const acts     = getActsForDay(day);
            const todayDay = isToday(day);
            return (
              <div key={day.toISOString()}
                style={{
                  border: `1.5px solid ${todayDay ? '#0f766e' : '#e2e8f0'}`,
                  borderRadius: 10, overflow: 'hidden',
                  background: todayDay ? '#f0fdf4' : '#fff',
                  minHeight: 200,
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: '8px 10px', borderBottom: '1px solid #e2e8f0',
                    background: todayDay ? '#0f766e' : '#f8fafc',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                  onClick={() => { setCurrent(day); setView('day'); }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: todayDay ? '#fff' : '#94a3b8', textTransform: 'uppercase' }}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: todayDay ? '#fff' : '#1e293b', lineHeight: 1.2 }}>
                    {format(day, 'd')}
                  </div>
                </div>
                {/* Events */}
                <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {acts.length === 0
                    ? <span style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 12 }}>—</span>
                    : acts.map(a => <ActChip key={a.id} a={a} />)
                  }
                </div>
              </div>
            );
          })}
        </div>
        <Legend />
      </div>
    );
  }

  /* ─────────────────────── DAY VIEW ─────────────────────── */
  const dayActs = getActsForDay(current);
  // Mostrar horas de 07:00 a 20:00
  const HOURS   = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div>
      <Toolbar title={title} prev={prev} next={next} view={view} setView={setView} current={current} setCurrent={setCurrent} />
      <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        {/* Time axis */}
        <div style={{ width: 56, background: '#f8fafc', borderRight: '1px solid #e2e8f0', flexShrink: 0 }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '2px 8px 0 0' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {/* Event area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Hour lines */}
          {HOURS.map(h => (
            <div key={h} style={{ height: 60, borderBottom: '1px solid #f1f5f9' }} />
          ))}

          {/* Activities positioned by time */}
          {dayActs.map(a => {
            const dt   = new Date(a.scheduled_at);
            const hour = dt.getHours();
            const min  = dt.getMinutes();
            if (hour < 7 || hour > 20) return null;
            const top  = (hour - 7) * 60 + min;
            return (
              <div
                key={a.id}
                onClick={() => onEventClick && onEventClick(a)}
                style={{
                  position: 'absolute', left: 8, right: 8, top,
                  minHeight: 36, padding: '4px 8px',
                  background: `${TYPE_COLOR[a.type] || '#3B82F6'}18`,
                  borderLeft: `4px solid ${TYPE_COLOR[a.type] || '#3B82F6'}`,
                  borderRadius: '0 8px 8px 0',
                  cursor: 'pointer', zIndex: 1,
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: TYPE_COLOR[a.type] || '#3B82F6' }}>{a.title}</div>
                <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={9} />
                  {format(dt, 'HH:mm')}
                  {a.contact_name && ` · ${a.contact_name}`}
                </div>
              </div>
            );
          })}

          {/* No events */}
          {dayActs.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>
              Sin actividades programadas este día
            </div>
          )}
        </div>
      </div>
      <Legend />
    </div>
  );
}

/* ── Sub-componentes ── */
function Toolbar({ title, prev, next, view, setView, current, setCurrent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn-icon" onClick={prev}><ChevronLeft size={18} /></button>
        <h3 style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', minWidth: 220, textAlign: 'center' }}>{title}</h3>
        <button className="btn-icon" onClick={next}><ChevronRight size={18} /></button>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(new Date())}>Hoy</button>
      </div>
      {/* View switcher */}
      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 2, gap: 2 }}>
        {[['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, transition: 'all .15s',
            background: view === v ? '#fff' : 'transparent',
            color: view === v ? '#0f766e' : '#64748b',
            boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
      {Object.entries(TYPE_COLOR).map(([type, color]) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{type}</span>
        </div>
      ))}
    </div>
  );
}
