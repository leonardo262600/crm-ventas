ALTER TABLE opportunities ADD COLUMN followup_phase TINYINT NOT NULL DEFAULT 0;
ALTER TABLE comm_templates ADD COLUMN channel VARCHAR(20) NOT NULL DEFAULT 'email';
ALTER TABLE comm_templates ADD COLUMN phase TINYINT NOT NULL DEFAULT 0;
ALTER TABLE comm_templates ADD COLUMN summary VARCHAR(300) NULL;

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 0 · Resumen después de la demo (Email)','Resumen de nuestra reunión y próximos pasos',
'Hola {{nombre}},\n\nGracias por tu tiempo hoy. Como vimos, el objetivo es ayudar a {{agencia}} a captar más propiedades en {{zona}} y mejorar su posicionamiento en RealAdvisor.\n\nLa propuesta que revisamos es {{propuesta}}, con una inversión de {{inversion}}.\n\nEl siguiente paso acordado es {{fecha_proximo_paso}}. Si antes te surge cualquier duda, escríbeme y la resolvemos.\n\nUn saludo,\nLeonardo','email',0,'Enviar el mismo día. Personaliza objetivo, zona, propuesta, inversión y siguiente paso.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 0 · Resumen después de la demo (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 0 · Resumen después de la demo (WhatsApp)','',
'Hola {{nombre}}, gracias por tu tiempo hoy. Te acabo de enviar el resumen de lo que vimos para ayudar a {{agencia}} a captar más propiedades en {{zona}}. Tal como acordamos, retomamos el {{fecha_proximo_paso}}.','whatsapp',0,'Mensaje breve el mismo día, después de enviar el correo resumen.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 0 · Resumen después de la demo (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 1 · Recordatorio con valor (Email)','Una idea para captar más propiedades en {{zona}}',
'Hola {{nombre}},\n\nRetomo nuestra conversación porque comentaste que {{problema}}. El posicionamiento en RealAdvisor puede ayudaros a ganar visibilidad justo cuando los propietarios de {{zona}} están comparando agencias.\n\n¿Has podido revisar la propuesta? Si quieres, vemos juntos cualquier punto en una llamada breve.\n\nUn saludo,\nLeonardo','email',1,'Usar a los 2 días. Retoma una necesidad real de la demo; no envíes un simple “¿lo has visto?”.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 1 · Recordatorio con valor (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 1 · Recordatorio con valor (WhatsApp)','',
'Hola {{nombre}}, ¿qué tal? Me acordé de lo que comentaste sobre {{problema}}. ¿Has podido revisar la propuesta para mejorar vuestra captación en {{zona}}? Si hay alguna duda, la vemos en 5 minutos.','whatsapp',1,'Usar a los 2 días. Añade contexto y una pregunta fácil de responder.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 1 · Recordatorio con valor (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 2 · Resolver objeción (Email)','Sobre tu duda de {{objecion}}',
'Hola {{nombre}},\n\nQuería responder de forma concreta a la duda que comentaste sobre {{objecion}}. {{respuesta_objecion}}\n\nLa idea no es añadir otro portal, sino posicionar a {{agencia}} ante propietarios con intención de vender en {{zona}}.\n\n¿Te parece que lo revisemos el {{fecha_proximo_paso}}?\n\nUn saludo,\nLeonardo','email',2,'Usar alrededor del día 5. Responde una única objeción con una explicación concreta.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 2 · Resolver objeción (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 2 · Resolver objeción (WhatsApp)','',
'Hola {{nombre}}, sobre la duda de {{objecion}}: {{respuesta_objecion}}. ¿Te encaja que lo comentemos el {{fecha_proximo_paso}} y decidamos el siguiente paso?','whatsapp',2,'Usar alrededor del día 5. Resuelve la objeción y propone una fecha.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 2 · Resolver objeción (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 3 · Pedir decisión (Email)','¿Avanzamos con el posicionamiento de {{agencia}}?',
'Hola {{nombre}},\n\nPara organizar la disponibilidad de {{zona}}, quería confirmar si queréis avanzar con la propuesta o si hay algún punto que todavía os impide tomar la decisión.\n\nMe sirve cualquiera de las dos respuestas. Si necesitáis más tiempo, dime qué fecha es realista y lo retomamos entonces.\n\nUn saludo,\nLeonardo','email',3,'Usar alrededor del día 7. Busca una decisión, una objeción real o una fecha comprometida.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 3 · Pedir decisión (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 3 · Pedir decisión (WhatsApp)','',
'Hola {{nombre}}, para organizar el seguimiento: ¿queréis avanzar con la propuesta, hay algún punto que os frena o necesitáis retomarlo en otra fecha? Me adapto a lo que sea más realista para vosotros.','whatsapp',3,'Usar alrededor del día 7. Ofrece tres respuestas claras para facilitar la decisión.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 3 · Pedir decisión (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 4 · Último intento activo (Email)','¿Cierro el seguimiento por ahora?',
'Hola {{nombre}},\n\nHe intentado localizarte para saber si la propuesta sigue siendo una prioridad. Para no insistir de más, si ahora no es el momento puedo cerrar el seguimiento y retomarlo cuando encaje mejor.\n\nSi todavía lo estáis valorando, respóndeme con una fecha y lo dejamos agendado.\n\nUn saludo,\nLeonardo','email',4,'Usar alrededor del día 10 si no hay respuesta. Sé directo, respetuoso y pide fecha.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 4 · Último intento activo (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 4 · Último intento activo (WhatsApp)','',
'Hola {{nombre}}, no quiero insistir de más. ¿La propuesta sigue siendo una prioridad o prefieres que cierre el seguimiento por ahora? Si necesitáis tiempo, dime una fecha y lo agendo.','whatsapp',4,'Usar alrededor del día 10 si no responde. Corto, educado y fácil de contestar.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 4 · Último intento activo (WhatsApp)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 5 · Cierre de ciclo (Email)','Cierro el seguimiento por ahora',
'Hola {{nombre}},\n\nComo no he conseguido localizarte, cierro el seguimiento por ahora para no molestarte. Si más adelante queréis mejorar vuestra visibilidad y captación de propietarios en {{zona}}, estaré encantado de retomarlo desde donde lo dejamos.\n\nGracias de nuevo por tu tiempo.\n\nUn saludo,\nLeonardo','email',5,'Usar alrededor del día 14. Cierra el ciclo sin presión y deja la puerta abierta.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 5 · Cierre de ciclo (Email)');

INSERT INTO comm_templates (tenant_id,name,subject,body,channel,phase,summary,created_by)
SELECT 1,'Fase 5 · Cierre de ciclo (WhatsApp)','',
'Hola {{nombre}}, cierro el seguimiento por ahora para no molestarte. Si más adelante queréis retomar la captación en {{zona}}, escríbeme y continuamos desde donde lo dejamos. Gracias por tu tiempo.','whatsapp',5,'Usar alrededor del día 14. Cierre amable, sin perseguir al cliente.',1
WHERE NOT EXISTS (SELECT 1 FROM comm_templates WHERE tenant_id=1 AND name='Fase 5 · Cierre de ciclo (WhatsApp)');
