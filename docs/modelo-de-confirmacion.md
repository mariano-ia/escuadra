# Escuadra — Modelo de confirmación y guía conversacional

> El núcleo del producto. Define **cuándo** Escuadra pregunta, cuándo re-confirma y dónde
> archiva. Acompaña a [casos-de-uso.md](casos-de-uso.md) y [diseno-interaccion.md](diseno-interaccion.md).

## El problema, bien planteado

No es un problema de prompting. El lenguaje natural totalmente abierto **falla** porque el
sistema no tiene orden ni memoria. La solución es **guiar al usuario con estructura** sin
volverse un bot que pregunta todo. La pregunta exacta: ¿cuándo interrumpir, y cuándo no?

## La metáfora rectora

> **Interpretar primero. Si la interpretación no alcanza, entra al funnel de confirmación.**
> Exactamente como un asistente humano del otro lado: ante muchos mensajes o muchos archivos,
> primero trata de entender y resolver solo; solo cuando no puede, pregunta. Y nunca deja de
> acusar recibo.

Esto ordena todo lo demás: el grueso se resuelve por **interpretación** (Niveles 3 y 4, con
acuse); el **funnel de confirmación** (Niveles 1 y 2) es la excepción, no la regla.

## Dos invariantes que mandan sobre todo lo demás

1. **El asistente es siempre REACTIVO. Nunca abre la conversación.** Todo mensaje del asistente
   es respuesta a un mensaje del usuario. No existe el "buen día" espontáneo a las 9am.
   > *Consecuencia técnica grande:* como solo responde dentro de la conversación, casi nunca toca
   > la **ventana de 24h** de WhatsApp ni necesita plantillas de Meta. Lo único proactivo —las
   > alertas— vive en el **panel**, no en el chat. Esto disuelve el problema de la ventana de 24h.

2. **El asistente SIEMPRE acusa recibo, como un humano.** Nada se guarda en silencio. Mínimo:
   *"Listo, Mariano, guardé tu comentario en Belgrano."* Debe sentirse como un asistente humano.
   > *Unidad de acuse = el avance, no cada foto.* Durante la ventana de agrupación se queda
   > callado y al cerrar manda **un** acuse cálido del conjunto ("guardé 5 fotos en Belgrano · Baños").
   > Confirmar foto por foto sería spam.

## La regla madre: asimetría de costo (¿preguntar o solo acusar?)

> **Preguntá solo cuando equivocarte en silencio cuesta más que preguntar.**
> Costo de equivocarse = **P(error) × Impacto × P(no se detecta)**.

P(error) ≈ 1 − `obra_confidence`. Impacto: bajo (álbum) · medio (proveedor/fecha) · alto (monto,
aprobación, pago, obra cruzada) · crítico (fuga entre estudios). Esto explica por qué la obra
activa no se pregunta (P(error) bajo) y una cotización entre dos "Belgrano" sí (alto × caro × difícil de notar).

## Los 4 niveles (el eje real es: ¿PREGUNTA o ACUSA?)

| Nivel | Acción | ¿Bloquea? | Cuándo |
|---|---|---|---|
| **1 · Confirmar duro** | Pregunta numerada y **parquea** el ítem (guardado igual). | Sí | `C_error` alto |
| **2 · Re-confirmar suave** | Pregunta cálida, **no bloqueante** y **reactiva**; si el usuario sigue mandando, eso = "sí". | No | Señal de sesión "vieja" |
| **3 · Archivar + acuse** | Guarda en la obra + acuse cálido ("Listo, guardé…"). | No | Confianza alta |
| **4 · Inbox + acuse** | Guarda en "Sin clasificar" + acuse ("Lo dejé en tu Inbox…"). | No | Sin señal o ruido |

> No hay nivel "silencioso": **siempre** hay acuse (invariante 2). El media siempre se guarda primero.

## Disparadores

### Nivel 1 — Confirmar duro (numerada, parquea)
1. **Obra ambigua + impacto alto:** 2+ obras candidatas **y** plata de por medio (cotización, pago, aprobación). (AM-02)
2. **Crear entidad:** obra/proveedor nuevo → confirmar + chequear fuzzy para no duplicar un typo. (EC-01/02)
3. **Campo de alto valor con baja confianza:** monto de una captura → confirmar el *campo*: *"Leí $480.000 ARS, ¿está bien?"*. (MF-01)

### Nivel 2 — Re-confirmar suave (cálido, NO bloqueante, SIEMPRE reactivo)
Se dispara como **respuesta** al mensaje del usuario, ante una señal de que la sesión está vieja:
1. **Primer reenvío del día** (es la respuesta a *ese* reenvío, no un saludo espontáneo). → *"Buen día, Mariano 👷 ¿seguimos en Belgrano, o estás en otra hoy?"* (solo si hay 2+ obras activas; con una sola, no hace falta).
2. **Hueco largo** de inactividad y vuelve a escribir.
3. **El contenido insinúa otra obra** distinta a la activa (confianza media). → *"Esto lo guardé en Palermo (lo nombraste). ¿Seguís en Belgrano o cambiás?"* (SQ-07)

### Nivel 3 — Archivar + acuse cálido
Obra activa vigente + contenido consistente · caption explícito (confianza ≥ 0.65) · única obra del estudio. → *"Listo, Mariano, guardé las 5 fotos en Belgrano · álbum Baños."*

### Nivel 4 — Inbox + acuse
Sin señal de obra y sin sesión · ruido probable (meme/saludo) · tras aclaración no resuelta. → *"Lo dejé en tu Inbox, está todo guardado; lo ordenás cuando quieras desde el panel."*

## Aclaración sin respuesta (reactivo, amable, sin cuenta regresiva)

Coherente con la invariante 1 (nunca proactivo): el recordatorio **no es un ping espontáneo**,
se engancha al **próximo mensaje** del usuario.
1. Pregunta una vez.
2. El usuario vuelve a escribir y la pregunta sigue abierta → recordatorio amable, **una vez**,
   prependeado: *"Dale, lo guardo. Ah, quedó pendiente: ¿de qué obra eran las 6 fotos de antes?"*
3. Si igual no confirma → cierre cálido + Inbox: *"Ok, las dejo en tu Inbox así no se pierden.
   Estoy por acá, cuando quieras me avisás."*

> **No conviene anunciar "se cierra en X horas".** Una cuenta regresiva presiona y suena a
> máquina; además contradice el tono de asistente humano. El cierre suave ("las dejo en tu Inbox,
> está todo guardado") comunica el resultado sin deadline.

## ¿Hace falta pensar en "lote"? (lo analicé)

Hay que separar **dos cosas que se venían mezclando:**

- **Ventana de agrupación (sí, es necesaria y es técnica):** WhatsApp entrega cada foto como un
  mensaje aparte. Juntar las que llegan en ~90s en un solo avance es obligatorio, sin importar el
  volumen. Esto no es "lote", es plomería.
- **"Backlog dump" (mandar 50 cosas juntas):** acá **NO recomiendo un umbral numérico** ("≥20
  archivos"). El número no es la señal correcta: 30 fotos claramente de Belgrano se archivan sin
  drama (un acuse: *"guardé 30 fotos en Belgrano"*). El problema real no es *cuántas*, es **si la
  ráfaga es ambigua o mezcla varias obras**.

> **Recomendación (aplica la metáfora rectora):** ante una tanda grande, **interpretar cada ítem**
> y resolver los que se entienden (archivar + acuse); solo los que **no** se entienden entran al
> funnel. Si gran parte de la tanda es ambigua o mezcla obras, en vez de N preguntas → **una sola**:
> *"Mariano, me mandaste un montón de cosas de varias obras. ¿Las ordenamos juntas en el panel?"*
> → residuo a Inbox + asignación masiva. **No** hace falta un umbral numérico de "lote".

## La capa de comandos (opcional, enseñada, recomendada)

> Un comando es el usuario decidiendo por adelantado. Como declaró su intención, `C_error` baja a
> casi cero → el sistema **no confirma**, solo acusa. Comando (usuario→sistema) y re-confirmación
> (sistema→usuario) son las dos caras del orden.

**Set canónico de comandos** (a enseñar en el **tutorial de primer uso** y en las **FAQs**):

| Intención | Comando | También en NL |
|---|---|---|
| Fijar obra activa | `obra Belgrano` | "trabajando en Belgrano", "pasame a Palermo" |
| Crear obra | `nueva obra Casa Roca` | "abrí una obra nueva, Casa Roca" |
| Generar informe | `informe Belgrano` | "armame el link del cliente" |
| Listar obras | `obras` | "qué obras tengo" |
| Deshacer último | `deshacer` / `no` | "borrá lo último", "eso estuvo mal" |
| Cerrar contexto | `listo` / `cancelar` | "ya está", "salí de Belgrano" |
| Corregir | (NL libre) | "no, era Palermo", "el álbum es fachada" |
| Ayuda | `ayuda` / `?` | "cómo funciona esto" |

**Reglas:** opcionales (sin comando → confirmaciones); tolerantes (acentos opcionales, embebidos
en una frase, sinónimos rioplatenses); el parser los detecta antes del LLM. **Mensaje de producto:**
"con comandos andás más rápido" — se explica en onboarding, no se obliga.

## Mapa de cobertura honesto

**Resuelve bien** (orden + ambigüedad — el corazón del miedo): SQ-01/02/05 (orden media↔caption) ·
SQ-07 (obra activa vieja) · AM-01/02 (obra ausente/ambigua) · EC-01/02 (entidad/typo) · ráfaga ambigua.

**A medias:** MF-01/AM-06 (monto → se confirma el campo, no la obra) · TS-01 (respuesta tardía →
mitigado por la invariante "siempre reactivo": el asistente responde dentro de la conversación, así
que casi no hay problema de ventana).

**NO resuelve (otra vía):** AM-05 (avance vs problema → default `photo` + re-tag fácil; "issue"
solo con pista) · NO-01 (ruido/costo → pre-pass barato + Inbox) · TS-02 (¿respuesta o contenido
nuevo? → el LLM lo juzga) · ON-05/06, MU-01 (seguridad/identidad → estructural).

> El usuario debe percibir un asistente que **casi nunca pregunta, siempre acusa con calidez, y
> cuando pregunta es porque valía la pena.**

## Riesgos del modelo y mejoras (red-team del propio modelo)

1. **La confianza no puede ser el auto-reporte del LLM.** Todo el modelo cuelga de
   `obra_confidence`, y los LLM están mal calibrados (se creen seguros y se equivocan). →
   **Derivar la confianza de señales estructurales** (¿match exacto del nombre? ¿proveedor
   unívoco? ¿coincide con la obra activa? ¿hay 2+ candidatas?), no de preguntarle al modelo "¿qué
   tan seguro estás?". Esto es lo más importante para que el funnel se dispare cuándo debe.
2. **La ráfaga peligrosa NO es la ambigua — es la plausible pero con sesión vieja.** 40 fotos que
   "parecen" todas de Belgrano se archivan confiadas… pero el usuario estaba poniéndose al día con
   3 obras. La ambigua entra bien al funnel; la plausible-pero-stale se archiva mal en silencio. →
   una ráfaga **grande sobre una sesión vieja** dispara re-confirm aunque "parezca" interpretable.
3. **El funnel tiene forma de obra; los errores de campo se escapan.** Una cotización en la obra
   correcta pero con el **monto** mal leído (OCR) pasa con acuse positivo. → disparadores de
   confirmación **a nivel campo** (monto, fecha de vencimiento), no solo a nivel obra.
4. **El acuse cálido puede enmascarar el error confiado-pero-equivocado.** "Listo, guardé en
   Belgrano" le dice al usuario "salió bien" aunque sea Palermo. → el acuse debe ser un
   **checkpoint escaneable** (obra + álbum + dato clave) y el **panel/informe es la red de
   reconciliación**: el armador de informe **resalta ítems de baja confianza** antes de mandarlos al cliente.
5. **El riesgo profundo: cuanto mejor el acuse, más confía el usuario y deja de verificar** → los
   errores silenciosos se acumulan y aparecen en el peor momento (el informe al cliente). →
   **confianza adaptativa**: más estricto (más funnel) al principio; el sistema "se gana" el
   silencio a medida que aprende los patrones del estudio (asociaciones proveedor↔obra).
6. **"Sentirse humano" exige acuse RÁPIDO.** Un acuse a los 2 minutos no se siente humano. →
   refuerza la decisión de **cola push-based** (no polling cada 2 min): la responsividad pasa a
   ser requisito de UX, no solo de robustez.
7. **Primera impresión del usuario nuevo = mucho funnel.** Sin hábito de "obra activa" todavía, la
   semana 1 puede ser pura pregunta/Inbox, justo cuando la retención es frágil. → el **tutorial de
   primer uso enseña la obra activa** y el **Inbox debe ser deleitoso de vaciar** (sugerencias, asignación masiva).

## Parámetros abiertos (a calibrar con datos reales)

1. **Hueco de inactividad** que habilita el re-confirm reactivo (propuesto 3-4 h).
2. **Qué cuenta como "ráfaga ambigua"** (propuesto: 2+ obras candidatas o confianza media en la tanda) — reemplaza al umbral numérico de lote.
3. **TTL de la obra activa** (propuesto 8 h = jornada).
4. **Umbrales de confianza:** Nivel 1 vs 3 (propuesto 0.65); salto de obra (propuesto 0.85).
5. **Re-confirm del primer mensaje del día:** solo con 2+ obras activas (propuesto) o siempre.
