export const FOLLOWUP_PHASES = [
  { value: 0, label: 'Fase 0 · Después de la demo', timing: 'Día 0', summary: 'Enviar el resumen personalizado y confirmar el siguiente paso.' },
  { value: 1, label: 'Fase 1 · Recordatorio con valor', timing: 'Día 2', summary: 'Retomar su objetivo y aportar una razón concreta para avanzar.' },
  { value: 2, label: 'Fase 2 · Resolver objeción', timing: 'Día 5', summary: 'Responder la duda principal sin repetir toda la presentación.' },
  { value: 3, label: 'Fase 3 · Pedir decisión', timing: 'Día 7', summary: 'Solicitar una respuesta o una fecha concreta de decisión.' },
  { value: 4, label: 'Fase 4 · Último intento activo', timing: 'Día 10', summary: 'Mensaje corto y directo antes de cerrar el ciclo.' },
  { value: 5, label: 'Fase 5 · Cierre de ciclo', timing: 'Día 14', summary: 'Cerrar el seguimiento con elegancia y dejar la puerta abierta.' },
];

export const phaseByValue = value =>
  FOLLOWUP_PHASES.find(phase => phase.value === Number(value)) || FOLLOWUP_PHASES[0];

export const NO_SHOW_PHASES = [
  { value: 0, label: 'No Show 0 · Inmediato', timing: '5–10 min', summary: 'Comprobar si hubo un imprevisto y ofrecer reagendar sin reproches.' },
  { value: 1, label: 'No Show 1 · Segundo intento', timing: '24 horas', summary: 'Ofrecer opciones simples de horario para facilitar la respuesta.' },
  { value: 2, label: 'No Show 2 · Cierre', timing: '72 horas', summary: 'Cerrar el intento con elegancia y dejar la puerta abierta.' },
];

export const noShowPhaseByValue = value =>
  NO_SHOW_PHASES.find(phase => phase.value === Number(value)) || NO_SHOW_PHASES[0];
