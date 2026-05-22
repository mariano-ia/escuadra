# Escuadra — Catálogo de casos de uso (lado WhatsApp)

> Análisis funcional de los escenarios de interacción del asistente de WhatsApp. Acompaña a
> [descripcion-producto.md](descripcion-producto.md) y al deck. La resolución de cada caso
> (el "cómo") está en [diseno-interaccion.md](diseno-interaccion.md).

**El hallazgo central:** lo frágil no es Claude clasificando *un* mensaje completo — eso lo
hace bien. Lo frágil es pedirle que **infiera secuencia y estado conversacional** a partir de
mensajes sueltos que llegan en cualquier orden. La solución no es "mejor prompt" sino
**estructura alrededor del LLM**.

## Convenciones

- **Obra** = proyecto de construcción · **Álbum** = sub-carpeta de fotos por obra ·
  **"Sin clasificar" (Inbox)** = bandeja default donde nunca se pierde nada ·
  **Obra activa** = sesión de ruteo por remitente · **Ventana de agrupación** = ~90s que junta
  varios webhooks de fotos en un solo "avance".
- **Carriles de resolución:** `LLM-solo OK` · `estructura/comando liviano` · `round-trip de
  aclaración` · `default-a-Inbox + arreglar en panel` · `solo-panel`.

## Cinco invariantes de diseño (default seguro en todos los casos)

1. **Nunca perder ni bloquear.** Sin confianza → "Sin clasificar", no se descarta.
2. **El caption es la fuente de verdad** para proveedor/fecha/obra (reenviar pierde remitente y fecha originales).
3. **La confianza es un control de seguridad**, no solo UX: `obra_confidence < 0.65` → aclaración; `obra_id` validado contra el estudio del remitente.
4. **Toda decisión es reversible** desde panel y por WhatsApp.
5. **Idempotencia** por `twilio_sid` / `inbound_message_id` → reprocesar nunca duplica.

---

## Familia 1 — Happy paths

| ID | Trigger | Intención | Falta | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|---|---|
| **HP-01** Foto+caption+obra | "Fotos del avance del baño, obra Belgrano" + 5 fotos | Archivar en Belgrano, álbum Baños | fecha original | mapear "baño"→álbum; avance vs problema | — | Alta/Alto | LLM-solo OK |
| **HP-02** Batch multi-foto | 8 fotos, caption en una sola | Agrupar las 8 en un avance | caption en 1 de N | varios webhooks = varios jobs | se parte en 8 entries sueltas | Alta/Alto | estructura (ventana) |
| **HP-03** Nota de voz | 🎙️ "Techo cocina Palermo, mancha humedad, llamar impermeabilizador urgente" | Transcribir + issue/nota | monto/fecha N/A | Whisper + clasificar; jerga | audio sin transcript si Whisper falla | Alta/Alto | LLM-solo OK |
| **HP-04** Nota de texto | "El cliente de Núñez quiere griferías cromo" | Nota/pedido en Núñez | tipo (nota vs aprobación) | sutil: pedido vs aprobación | clasificado mal | Alta/Medio | LLM-solo OK |
| **HP-05** Cotización completa | "Cotización plomería Belgrano $480.000 con instalación" | Crear quote | proveedor exacto, validez | parsear "$480.000" (miles AR), ARS, ¿IVA? | monto mal (480 vs 480.000) | Alta/Alto | LLM-solo OK + validar |
| **HP-06** Aprobación del cliente | "El cliente aprobó el cambio de griferías" / "dale, va" | approval ligada al ítem | a qué ítem, quién es | "dale va" sin contexto del hilo | aprobación huérfana | Media/Alto | round-trip |
| **HP-07** Pago | "Pagué la seña al pintor, $200.000, Palermo" | payment | fecha, total/parcial | pago hecho vs a pagar | doble conteo | Media/Alto | LLM-solo OK |
| **HP-08** Visita/entrega | "Mañana viene el de aberturas a las 10, Belgrano" | calendar_event futuro | fecha exacta ("mañana") | resolver relativo + TZ | evento mal fechado | Media/Medio | LLM-solo OK |
| **HP-09** Reclamo/problema | "Se filtró agua en el subsuelo de Caballito, urgente" + foto | issue severidad alta | — | calibrar severidad | issue sin severidad → no alerta | Alta/Alto | LLM-solo OK |
| **HP-10** Entrega de material | "Llegaron los porcelanatos a Belgrano" + remito | delivery + foto | cantidad vs cotizado | conciliar con cotización | no se cruza | Media/Medio | LLM-solo OK |

## Familia 2 — Secuencia / orden (preocupación principal)

Regla rectora: **ventana de agrupación por remitente** + **obra activa de sesión**. El LLM no
adivina secuencia: la infraestructura la modela con un `entry_group` abierto por remitente.

| ID | Trigger | Falta | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|---|
| **SQ-01** Media→caption (segundos después) | obra llega después | el job de fotos ya cayó a Inbox antes del texto | fotos en Inbox, caption como nota suelta | **Alta/Alto** | estructura: ventana retiene y fusiona texto entrante |
| **SQ-02** Caption→media | "te paso fotos del baño de Palermo" y después las fotos | media llega después | el texto solo no tiene qué archivar | texto como nota; fotos no heredan | **Alta/Alto** | estructura: set obra activa + álbum esperado |
| **SQ-03** "Eso era de X" después de mandar | obra llegó tarde, lote ya en Inbox | atar "todo eso" al lote correcto | reasigna al lote equivocado | **Alta/Alto** | round-trip/comando ("¿estos 10? sí/no") |
| **SQ-04** Caption parcial | "fotos del avance" (sin obra) con obra activa | obra en caption | ¿hereda activa o confirma? | si no hay activa → Inbox (ok) | Alta/Medio | LLM-solo OK con activa; si no, round-trip |
| **SQ-05** Caption en 1 de N | solo la 3ª de 6 trae texto | atribuir caption a todo el grupo | 5 a Inbox, 1 a Belgrano | **Alta/Alto** | estructura (ventana agrupa) |
| **SQ-06** Backlog dump | 60 ítems de 4 obras en 3 min | fechas + obra por ítem | la ventana los junta MAL | un avance gigante o 60 aclaraciones | Media/Alto | estructura+round-trip: "modo backlog" en panel |
| **SQ-07** Obra activa "pegada"/stale | activa expirada | ruteo silencioso a obra vieja | semanas de Palermo en Belgrano | Media/Alto | estructura: TTL + recordatorio "seguís en Belgrano" |
| **SQ-08** Dos lotes intercalados | 3 de Belgrano + 3 de Palermo en la misma ventana | límite entre lotes | las 6 en una sola obra | Media/Medio | round-trip si detecta 2 obras candidatas |
| **SQ-09** Corrección dentro de la ventana | "no, esas eran de Núñez" 20s después | distinguir corrección de contenido nuevo | crea nota "no esas eran..." | Media/Medio | round-trip/comando (gramática de corrección) |

## Familia 3 — Ambigüedad

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **AM-01** Obra no nombrada | foto sin caption, sin obra activa | no hay señal | Inbox (correcto) | Alta/Alto | default-a-Inbox |
| **AM-02** Dos obras similares | Belgrano Cabildo vs Belgrano Juramento | confianza baja, ambas plausibles | datos en obra equivocada | **Alta/Alto** | round-trip numerado |
| **AM-03** Proveedor desconocido | "cotización del nuevo gasista $300.000" | reenviar pierde quién lo mandó | quote sin proveedor o duplicado | Media/Medio | round-trip liviano o provisional |
| **AM-04** Fecha relativa | "esto pasó hace 3 semanas" | resolver sin fecha original | fecha=hoy → desordena timeline | **Alta/Alto** | LLM-solo OK (desde fecha de reenvío, marcar estimada) |
| **AM-05** Tipo ambiguo (avance vs problema) | foto de pared con mancha, sin texto | visión sola no distingue | issue grave archivado como foto linda → sin alerta | **Alta/Alto** | default `photo`; issue solo con pista textual |
| **AM-06** Monto ambiguo | "480 lucas" / "480k" / "U$D 480" | jerga, moneda implícita | 480 vs 480.000; moneda errada | Media/Alto | LLM-solo OK + confirmar |
| **AM-07** Rubro ambiguo | "vino el de las cosas del baño" | lenguaje vago, sinónimos | rubro mal etiquetado | Baja/Bajo | LLM-solo OK (sinónimos) |
| **AM-08** Multi-obra en un texto | "Belgrano va bien pero en Palermo hay quilombo" | una nota toca dos obras | se pierde una mitad | Media/Medio | round-trip o dividir (ver MT-01) |

## Familia 4 — Intenciones que NO son "archivar" (queries y comandos)

El sistema debe **clasificar intención primero**: archivar / consultar / comando / corrección / ruido.

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **CQ-01** Consulta | "¿qué cotizaciones de plomería tengo?" | confundir pregunta con nota | pregunta archivada como texto | **Alta/Alto** | comando → buscar/responder o redirigir al panel |
| **CQ-02** Generar informe | "generá el informe de Belgrano de esta semana" | selección de fotos por chat es ambigua | informe vacío/con fotos erradas | **Alta/Alto** | comando + borrador → "elegí en el panel" |
| **CQ-03** Set/switch obra activa | "trabajando en Belgrano" | distinguir comando de nota | lo archiva como nota | Alta/Alto | comando |
| **CQ-04** Listar obras | "¿qué obras tengo?" | reconocerlo como comando | archiva la pregunta | Media/Bajo | comando |
| **CQ-05** Estado de un trabajo | "¿el plomero ya entregó?" | resolver entidad + leer estado | responde mal o archiva | Media/Medio | comando + round-trip |
| **CQ-06** Ayuda | "?" / "ayuda" | "?" es ambiguo | lo archiva | Media/Bajo | comando |
| **CQ-07** Cancelar | "cancelá" / "olvidalo" | ¿cancela aclaración o última entry? | cancela lo que no era | Media/Medio | comando |
| **CQ-08** Comando como contenido | "Belgrano" a secas | una palabra = máxima ambigüedad | crea entry vacía | Media/Medio | round-trip corto |

## Familia 5 — Correcciones y ediciones

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **CO-01** Reasignar obra | "no, era Palermo" | atar a la última entry | mueve la equivocada | **Alta/Alto** | comando (sobre "última") + undo |
| **CO-02** Reasignar álbum | "esto va en fachada, no baños" | idem con álbum | foto en álbum errado | Alta/Medio | comando |
| **CO-03** Corregir monto | "el monto era 540, no 480" | ¿cuál quote? | edita la quote equivocada | Media/Alto | comando + round-trip |
| **CO-04** Undo último | "borrá lo último" | "último" + concurrencia multi-usuario | borra entry de otro miembro | Media/Alto | comando (scoped al remitente) |
| **CO-05** Borrar específico | "borrá la foto de la pared rota" | resolver a un ID | borra la que no era | Media/Alto | round-trip / panel |
| **CO-06** "Está mal clasificado" | "esto está mal" sin decir qué | no dice el valor correcto | aclaración infinita | Media/Medio | round-trip ("¿qué cambio?") o panel |
| **CO-07** Corrección tardía | "la cotización del lunes del pintor era con IVA" | identificar entry vieja | crea nota nueva | Baja/Medio | panel-only |
| **CO-08** Fusionar duplicados | "esto es la misma de ayer" | resolver 2 referentes | quedan dos quotes | Baja/Medio | panel-only |

## Familia 6 — Creación de entidades vía WhatsApp

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **EC-01** Obra inexistente | "fotos de la obra nueva de Vicente López" | no inventar obras en silencio | obra basura por typo | **Alta/Alto** | round-trip ("¿la creo?") — nunca auto-crear |
| **EC-02** Typo de obra existente | "Vicente Lopes" vs "Vicente López" | fuzzy: ¿typo u obra nueva? | duplica la obra | Alta/Alto | round-trip ("¿te referís a…?") |
| **EC-03** Proveedor nuevo | "cotización del electricista Gómez" | ¿auto-crear o confirmar? | proveedores duplicados | Media/Medio | provisional + merge en panel |
| **EC-04** Cliente nuevo | "el cliente es Pérez" | vincular sin datos | cliente sin contacto | Baja/Bajo | comando o panel |
| **EC-05** Álbum custom | "creá un álbum 'electricidad' en Belgrano" | distinguir de archivar foto | crea entry de texto | Baja/Bajo | comando |
| **EC-06** Obra creada por error | EC-01/02 aceptados mal | borrar + reubicar contenido | obra fantasma | Baja/Medio | panel-only |

## Familia 7 — Multi-target (un mensaje, varios destinos)

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **MT-01** Texto que abarca 2 obras | "Belgrano arrancó fachada y en Palermo se frenó por humedad" | el tool devuelve **un** obra_id | media del mensaje se pierde | **Media/Alto** | estructura (N entries) o round-trip |
| **MT-02** Foto en 2 álbumes | instalación que muestra el baño | modelo asume 1 foto → 1 álbum | búsqueda en el otro falla | Baja/Bajo | panel-only (tag) o aceptar 1 |
| **MT-03** Cotización de 2 obras | "el pintor cotizó Belgrano 200k y Núñez 300k" | partir y crear 2 quotes | una quote de 500k | Baja/Medio | round-trip / estructura (N quotes) |
| **MT-04** Mensaje a nivel estudio | "feriado el lunes, no hay obra" | no hay concepto "estudio" | lo mete en una obra al azar | Baja/Bajo | default-a-Inbox o nota de estudio |

## Familia 8 — Ruido / no-contenido (filtro de costo y señal)

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **NO-01** Meme reenviado | imagen graciosa | visión gasta tokens | meme en galería; costo | **Alta/Medio** | default-a-Inbox con flag; clasificar barato antes de visión |
| **NO-02** Mensaje personal | "te debo la cena" por error | distinguir personal de obra | nota personal en una obra | Media/Bajo | default-a-Inbox / descartar |
| **NO-03** Sticker / emoji | 👍 | ¿respuesta a aclaración o ruido? | entry vacía | Alta/Bajo | LLM-solo OK (ignorar salvo aclaración abierta) |
| **NO-04** Saludo/gracias | "buen día!" | cortesía no es contenido | entry "gracias" | Alta/Bajo | LLM-solo OK (ignorar) |
| **NO-05** Audio no relacionado | audio de cumpleaños | Whisper transcribe ruido | "feliz cumple" como nota | Media/Bajo | default-a-Inbox; tope de duración |
| **NO-06** Export de chat de grupo | 200 líneas "[10:34] Juan: ..." | muro multi-autor | nota gigante o 50 entries | Baja/Medio | panel-only / round-trip |
| **NO-07** Reenvío accidental masivo | 30 cosas sin querer | igual que backlog real | obras llenas de basura | Baja/Medio | default-a-Inbox + borrado en lote |

## Familia 9 — Media / formato (edge cases)

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **MF-01** Captura de cotización | screenshot del chat con el precio | OCR/visión; números mal leídos | quote sin/con monto errado | **Alta/Alto** | LLM-solo OK (visión) + confirmar monto |
| **MF-02** PDF de cotización | reenvía PDF | extracción de PDF | PDF sin extraer campos | Media/Alto | estructura: extraer texto → Claude; si falla, doc + Inbox |
| **MF-03** Pin de ubicación | comparte location | lat/long sin obra | pin perdido | Baja/Bajo | default-a-Inbox o asociar si hay contexto |
| **MF-04** vCard (contacto) | comparte el contacto del gasista | mapear vCard → provider | dato útil perdido | Baja/Medio | **oportunidad**: vCard → provider (recupera el teléfono real) |
| **MF-05** Audio muy largo | nota de voz de 8 min | costo Whisper, timeout | transcript cortado / job muerto | Media/Medio | estructura: chunking + lease > maxDuration |
| **MF-06** Audio ruidoso/jerga | obra con ruido + lunfardo | Whisper falla | transcript erróneo | Media/Medio | LLM-solo OK (Claude tolera) + `language: es` |
| **MF-07** Imagen con texto sobreimpreso | foto con anotación "rehacer esto" | visión debe leer la anotación | ignora la nota clave | Media/Medio | LLM-solo OK (visión) |
| **MF-08** Video | reenvía video corto | el plan NO menciona video | video perdido o error | Media/Alto | **GAP DE PRODUCTO** → default-a-Inbox (guardar, no procesar) |
| **MF-09** Imagen rota/no soportada | HEIC, descarga falla | formato no decodificable | job en failed loop | Media/Medio | estructura (retry; tras N, avisar + Inbox) |
| **MF-10** Documento genérico | XLSX/DOCX del presupuesto | no siempre extraíble | doc sin indexar | Baja/Bajo | default-a-Inbox (guardar archivo) |

## Familia 10 — Timing / sesión / aclaraciones

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **TS-01** Respuesta tras 24h | aclaración el lunes, responde el miércoles | ventana Twilio cerró | confirmación nunca llega | **Media/Alto** | aplicar respuesta igual + plantilla de re-enganche; Inbox si expiró |
| **TS-02** Aclaración respondida con contenido nuevo | "¿qué Belgrano?" → reenvía foto de Palermo | ¿es respuesta o nuevo? | foto de Palermo en Belgrano | **Alta/Alto** | Claude decide; si no parece respuesta → nuevo |
| **TS-03** Dos aclaraciones abiertas | "el primero es Belgrano" | matching respuesta→pregunta | resuelve la equivocada | **Media/Alto** | numerar; o serializar (una por vez) |
| **TS-04** Responde "1" a numerada | "1) Cabildo 2) Juramento" → "1" | guardar el orden de opciones | "1" como nota | Alta/Medio | estructura (guardar opciones ordenadas) |
| **TS-05** Aclaración vencida respondida tarde | "era Palermo" a pregunta ya en Inbox | tratar como corrección | crea nota | Media/Medio | comando (downgrade aclaración→corrección) |
| **TS-06** Respuesta ambigua | "el de siempre" | no agrega señal | aclaración infinita | Media/Medio | default-a-Inbox tras 1-2 intentos |
| **TS-07** Más fotos con aclaración abierta | otro lote distinto | no mezclar lotes | 2º lote tragado por la aclaración | Media/Medio | estructura (lote nuevo = grupo nuevo) |
| **TS-08** Confirmación duplicada | after() y cron procesan el mismo job | idempotencia de salida | "Guardado" x2 → desconfía | Baja/Bajo | estructura (idempotencia por inbound_message_id) |

## Familia 11 — Onboarding / identidad

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **ON-01** Código de vinculación | manda `ARQ-7K9F2` | path dedicado antes del LLM | código como contenido | Alta(1 vez)/Alto | comando (regex) |
| **ON-02** Desconocido manda contenido | número no vinculado reenvía fotos | rechazar antes de bajar media | gasta IA por un random | Media/Alto | gate de identidad + "registrate primero" |
| **ON-03** Código expirado/usado | manda código tras 15 min | TTL / single-use | "no funciona" sin explicación | Media/Medio | comando (mensaje claro + re-generar) |
| **ON-04** Segundo miembro reenvía | socio vinculado reenvía | atribución | atribuido al owner | Media/Medio | estructura (ruteo por whatsapp_links) |
| **ON-05** Un teléfono en dos estudios | freelance en A y B | ¿a qué estudio va? | **fuga cross-tenant** | Baja/Alto | round-trip ("¿Estudio A o B?") + activa por estudio |
| **ON-06** Número reasignado por carrier | el número ahora es de un desconocido | link viejo activo | **fuga de PII a tercero** | Baja/Alto | revalidación / desvincular por inactividad |
| **ON-07** Teléfono compartido por 2 personas | dos socios, un WhatsApp | un link = un user | atribución incorrecta | Baja/Bajo | panel-only (aceptar limitación) |
| **ON-08** Vinculación duplicada | manda código ya vinculado | idempotencia | re-vincula / duplica | Baja/Bajo | comando (no-op + "ya estás vinculado") |

## Familia 12 — Multi-usuario / estudio

| ID | Trigger | Dónde rompe | Failure mode | Frec/Imp | Carril |
|---|---|---|---|---|---|
| **MU-01** Dos miembros reenvían el MISMO mensaje | socio A y B reenvían la misma cotización | reenviar pierde el SID original → distintos `twilio_sid` | cotización duplicada | **Media/Alto** | dedup por hash de contenido + proveedor + monto |
| **MU-02** Atribución | ¿quién registró cada ítem? | resuelto por whatsapp_links | sin autor visible | Media/Bajo | estructura (ya modelado) |
| **MU-03** Obra activa entre miembros | A setea Belgrano; ¿afecta a B? | scope de la sesión | ítems de B en obra de A | Media/Alto | estructura (activa por user_id, no por estudio) |
| **MU-04** Edición concurrente | A corrige, B borra la misma entry | race entre correcciones | estado inconsistente | Baja/Bajo | estructura (audit + last-write-wins) |
| **MU-05** Miembro removido sigue reenviando | ex-empleado con link activo | desvincular al remover | sigue inyectando/leyendo | Baja/Alto | estructura (revocar link en remoción) |

---

## Top 15 casos más peligrosos (Frecuencia × Impacto)

Priorizando **pérdida silenciosa de datos** y **fuga cross-tenant** (donde el usuario no se entera).

| # | ID | Caso | Por qué es peligroso | Mitigación primaria |
|---|---|---|---|---|
| 1 | SQ-01/SQ-05 | Caption tardío / en 1 de N | *El* miedo del owner; rompe el happy path multi-foto | ventana de agrupación + fusión de texto |
| 2 | TS-02 | Aclaración resuelta con contenido nuevo | archiva una obra dentro de otra, nadie lo nota | Claude clasifica "respuesta vs nuevo" |
| 3 | AM-02 | Dos obras similares | ruteo silencioso a obra equivocada | round-trip numerado si confianza<0.65 |
| 4 | AM-05 | Foto: ¿avance o problema? | reclamo grave archivado como foto linda → sin alerta | default photo; issue solo con pista textual |
| 5 | CQ-01/CQ-02 | Query/comando archivado como nota | el producto se siente roto | capa de intención antes de archivar |
| 6 | MF-01 | Captura de cotización (OCR) | monto mal leído contamina presupuestos/reportes | visión + confirmar monto |
| 7 | SQ-03 | "Eso era de X" después de mandar | reasignación retroactiva al lote equivocado | comando "último lote" + confirmación |
| 8 | EC-01/EC-02 | Obra inexistente / typo | obras basura o duplicadas fragmentan todo | nunca auto-crear; round-trip + fuzzy |
| 9 | ON-05 | Un teléfono en dos estudios | **fuga cross-tenant** (el peor bug) | estudio explícito; activa por estudio |
| 10 | SQ-07 | Obra activa "pegada" | semanas en otra obra hasta el informe | TTL + recordatorio |
| 11 | SQ-06 | Backlog dump | la ventana los junta mal o genera decenas de aclaraciones | detectar volumen → modo backlog en panel |
| 12 | MU-01 | Dos miembros reenvían lo mismo | dedup por `twilio_sid` no alcanza | dedup por hash de contenido |
| 13 | CO-01 | "No, era Palermo" mueve la equivocada | corrección frecuente; empeora si toma "última" mal | scoping estricto + undo |
| 14 | ON-06 | Número reasignado por carrier | fuga de PII → riesgo legal | revalidación / desvinculación |
| 15 | TS-01 | Respuesta de aclaración fuera de 24h | confirmación nunca llega → abandono | aplicar igual + plantilla de re-enganche |

**Vigilados (fuera del top por menor frecuencia, alto impacto):** MF-08 (video, gap), TS-03 (dos aclaraciones), NO-01 (memes — costo acumulado).

---

## Decisiones de producto (cerradas)

**Resueltas con el owner:**
1. **Consultas por WhatsApp → NO.** El chat solo captura + comandos de acción (obra activa,
   `informe`). Búsqueda y consultas viven en el panel (coherente con "no es un bot que responde"). (CQ-01, CQ-05)
2. **Video → guardar sin procesar.** Se ve en galería/timeline y entra a informes; no se clasifica
   con IA por ahora (costo de IA cero). Se puede sumar procesamiento más adelante. (MF-08)
3. **Mensaje multi-obra → partir en N.** El tool `file_whatsapp_message` devuelve un **array de
   filings** (N entries / N obras), no un único `obra_id`. (MT-01, MT-03)

**Resueltas por recomendación (defaults razonables; cambiables):**
4. **Foto en 2 álbumes → no al inicio.** Una foto = un álbum primario; multi-álbum/tags se agrega en el panel más adelante. (MT-02)
5. **Eventos a nivel estudio → sí, liviano.** Una nota/evento con scope estudio ("feriado el lunes") en vez de meterlo en una obra al azar. (MT-04)
6. **PDF de cotización → extraer texto** (caso común, alto valor); XLSX/DOCX se guardan como adjunto sin parsear al inicio. (MF-02, MF-10)
7. **vCard → proveedor provisional.** Se parsea el contacto a un proveedor (recupera el teléfono real que el reenvío pierde — oportunidad, no solo edge case). (MF-04)
8. **Dedup → por hash de contenido.** Además de `twilio_sid`: hash de media (SHA) + proveedor + monto dentro de una ventana temporal, para el mismo mensaje reenviado por dos socios. (MU-01)
9. **Teléfono en 2 estudios → selector de estudio.** `phone_e164` único **por estudio**; si un teléfono mapea a 2, se pregunta una vez ("¿Estudio A o B?") y se recuerda; obra activa por estudio. (ON-05)
10. **Ciclo de vida del `whatsapp_link`:** revocar al remover al miembro; re-confirmación / desvinculación por inactividad prolongada (protege PII ante números reasignados). (ON-06, MU-05)
11. **Costo → clasificación barata antes de visión/Whisper.** Mensajes solo-texto pasan por una pasada barata (heurística / modelo chico) para detectar ruido/intención; las imágenes se baten en **una sola** llamada de visión; el ruido va a Inbox con flag, **no se descarta** (nada se pierde). (NO-01, NO-05)
