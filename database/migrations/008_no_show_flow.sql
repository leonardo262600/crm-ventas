ALTER TABLE opportunities ADD COLUMN demo_status VARCHAR(20) NOT NULL DEFAULT 'programada';
ALTER TABLE opportunities ADD COLUMN no_show_step TINYINT NOT NULL DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN no_show_at DATETIME NULL;
ALTER TABLE comm_templates ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'post_demo';

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,category,created_by)
SELECT 1,'No Show 0 · Reagendar ahora (WhatsApp)','',
'Hola {{nombre}}, teníamos la demo prevista ahora. Espero que esté todo bien. ¿Has tenido algún imprevisto? Si quieres, podemos reagendarla; dime qué momento te encaja mejor.','whatsapp',0,'Enviar entre 5 y 10 minutos después de la ausencia. Tono comprensivo y sin reproches.','no_show',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='No Show 0 · Reagendar ahora (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,category,created_by)
SELECT 1,'No Show 0 · Reagendar ahora (Email)','¿Reagendamos nuestra demo?',
'Hola {{nombre}},\n\nTeníamos prevista una demo para hoy y quería comprobar que todo estuviera bien. Entiendo que pueden surgir imprevistos.\n\nSi todavía te interesa conocer cómo RealAdvisor puede ayudar a {{agencia}} en {{zona}}, podemos buscar otro momento que te venga mejor.\n\nUn saludo,\nLeonardo','email',0,'Enviar después del primer WhatsApp si el correo es el canal habitual del cliente.','no_show',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='No Show 0 · Reagendar ahora (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,category,created_by)
SELECT 1,'No Show 1 · Segundo intento (WhatsApp)','',
'Hola {{nombre}}, retomo el mensaje de ayer para reagendar la demo. Puedo adaptarme a tu agenda. ¿Te encaja mejor por la mañana o por la tarde?','whatsapp',1,'Enviar unas 24 horas después. Ofrece dos opciones sencillas para facilitar la respuesta.','no_show',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='No Show 1 · Segundo intento (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,category,created_by)
SELECT 1,'No Show 1 · Segundo intento (Email)','Dos opciones para reagendar la demo',
'Hola {{nombre}},\n\nRetomo mi mensaje para encontrar otro momento para la demo. Puedo adaptarme a vuestra agenda.\n\n¿Os encaja mejor por la mañana o por la tarde? Con esa indicación te propongo dos horarios concretos.\n\nUn saludo,\nLeonardo','email',1,'Enviar unas 24 horas después. Busca una respuesta muy fácil.','no_show',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='No Show 1 · Segundo intento (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,category,created_by)
SELECT 1,'No Show 2 · Cierre (WhatsApp)','',
'Hola {{nombre}}, cierro por ahora el seguimiento de la demo para no insistir. Si sigue siendo una prioridad mejorar la captación de {{agencia}} en {{zona}}, escríbeme y buscamos una nueva fecha.','whatsapp',2,'Enviar unas 72 horas después. Cierra el intento sin presión y deja la puerta abierta.','no_show',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='No Show 2 · Cierre (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,category,created_by)
SELECT 1,'No Show 2 · Cierre (Email)','Cierro por ahora la solicitud de demo',
'Hola {{nombre}},\n\nComo no he conseguido localizarte, cierro por ahora el seguimiento de la demo para no insistir.\n\nSi más adelante queréis revisar cómo mejorar la captación de {{agencia}} en {{zona}}, estaré encantado de buscar una nueva fecha.\n\nUn saludo,\nLeonardo','email',2,'Enviar unas 72 horas después. Cierre amable y puerta abierta.','no_show',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='No Show 2 · Cierre (Email)');
