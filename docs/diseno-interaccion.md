# Escuadra — Sistema de interacción conversacional

> Diseño del modelo de estados, gramática de comandos y UX en texto del asistente de WhatsApp.
> Resuelve los casos de [casos-de-uso.md](casos-de-uso.md).

**Premisa de diseño que ataca el miedo central:** el lenguaje natural puro no es frágil porque
la gente hable raro; es frágil porque el sistema no tiene memoria ni reglas de ruteo. La
solución no es pedirle al arquitecto que hable estructurado — es que **el sistema mantenga el
estado** (obra activa, ventana de agrupación, preguntas abiertas) y que el lenguaje natural
caiga sobre esa estructura. El arquitecto sigue hablando como a un colega; el andamiaje es
invisible y vive en el backend.

> **Regla rectora: la estructura la pone el sistema, no el usuario.** Donde restrinjo NL, lo hago
> con *atajos opcionales* (comandos) y *menúes numerados* (respuestas de un toque), nunca exigiendo sintaxis.

---

## 1. Modelo de estados (por remitente)

El estado vive **por remitente** (`phone_e164` → `user_id` + `studio_id`), no por estudio. Dos
socios tienen sesiones independientes. Cada estado tiene TTL explícito y **nunca bloquea la
ingesta**: cualquier media que entra se guarda siempre, en el peor caso en Inbox.

| Estado | Significado | TTL |
|---|---|---|
| `IDLE` | Sin obra activa; cada item se clasifica por contenido + caption. | base |
| `OBRA_ACTIVA` | Hay una obra "fijada"; los reenvíos sin obra explícita van ahí. | **8 h** desde el último item que la toca (jornada laboral); se renueva con cada uso |
| `AWAITING_CLARIFICATION` | Se hizo una pregunta numerada y se espera respuesta. | **6 h** → al vencer, default a Inbox |
| `AWAITING_CONFIRMATION` | Acción cara/destructiva (cerrar obra, generar link, crear obra) pide sí/no. | **30 min** → al vencer, no se hace nada |
| `CORRECTION_WINDOW` | Acaba de guardar; la confirmación es corregible (pasivo, no bloquea). | **30 min** por entry/avance |
| `GROUPING` | Sub-estado de ingesta: hay un avance abierto juntando media. | **90 s** desde el último media (config. 60–120s) |

`OBRA_ACTIVA` es persistente y de fondo; `GROUPING` y las "esperas" se montan encima. Lo único
mutuamente excluyente son las dos esperas (clarification / confirmation), cada una con su `expires_at`.

### Cómo se resuelve la obra de un item (cascada — gana la primera que aplica)

1. **Obra explícita en el caption** (confianza ≥ 0.65) → esa obra (y pasa a activa).
2. **Proveedor/cliente unívoco** que trabaja en una sola obra activa → esa (confirma suave).
3. **Obra activa de la sesión** vigente → esa. *(Esto hace fluido el "reenviá 10 fotos seguidas".)*
4. **Una sola obra activa en el estudio** → esa.
5. **Nada de lo anterior** → confianza media: pregunta numerada; confianza baja o sin respuesta: **Inbox**.

> **Por qué la sesión gana al contenido en el paso 3 pero no en el 1:** un caption explícito siempre
> gana (el arquitecto corrige el ruteo a propósito); sin caption, la sesión es mejor señal que adivinar por visión.

**Salto de obra detectado por contenido (delicado):** si `OBRA_ACTIVA=Belgrano` y entra un caption
que menciona Palermo con confianza alta, **no se archiva en silencio**. Se guarda provisional y se confirma:

> *Guardé en **Palermo** (lo nombraste en el mensaje). ¿Seguís en Belgrano o cambiamos a Palermo? **1** Belgrano · **2** Palermo*

Cómo se setea la obra activa: (a) explícito ("trabajando en Belgrano"); (b) **implícito** tras un
caption clasificado con alta confianza (Belgrano queda activa → el próximo reenvío sin caption la hereda);
(c) tras resolver una disambiguación numerada. Se limpia con `cerrar`/`listo`, al vencer el TTL, o al confirmar un salto de obra.

---

## 2. Gramática de comandos liviana (convive con NL)

Los comandos son **aceleradores opcionales**, no sintaxis. Todo lo que se hace por comando se
puede hacer en NL. El parser intenta primero un match de comando (barato, determinístico, regex
tolerante); si no matchea, va al LLM. Existen para tres cosas que el LLM no debería decidir solo:
**cambiar de estado**, **acciones con efecto externo** y **rescate**.

Tolerancia: case-insensitive, acentos opcionales, con/sin "/", sinónimos rioplatenses, admite el comando embebido en una frase.

| Intención | Canónico | Variantes NL que también funcionan | Acción |
|---|---|---|---|
| Fijar obra activa | `obra Belgrano` | "trabajando en Belgrano", "pasame a Belgrano", "todo lo que mande es de Palermo" | setea `OBRA_ACTIVA` |
| Crear obra | `nueva obra Casa Roca` | "abrí una obra nueva, Casa Roca" | `AWAITING_CONFIRMATION` (no crear basura) |
| Generar informe | `informe` | "armame el informe", "pasame el link para el cliente" | dispara flujo de informe |
| Listar obras | `obras` | "qué obras tengo", "en qué obra estoy" | lista numerada + marca la activa |
| Ayuda | `ayuda` / `?` | "cómo funciona esto" | mini-guía de 4 líneas |
| Cancelar / cerrar | `cancelar` / `listo` / `cerrar` | "ya está", "salí de Belgrano" | limpia activa y preguntas abiertas (no borra lo guardado) |
| Deshacer | `deshacer` / `no` | "no, eso no", "borrá lo último" | revierte el último archivo (ventana de corrección) |
| Respuesta a disambiguación | `1` / `2` / `3` | "la primera", "Belgrano", "ninguna" | resuelve la pregunta abierta |
| Corrección de campo | (NL libre) | "no, era Palermo", "el álbum es fachada", "el monto era 480 lucas" | edita la última entry sin re-archivar |

**Nunca es comando obligatorio:** describir contenido, decir la obra, agregar notas. Eso es NL
puro y es el 90% del uso. Si el arquitecto solo reenvía 5 fotos sin una palabra, funciona igual (cascada §1).

**Copy de `ayuda`:**
> *Soy Escuadra, tu asistente de obra. Reenviame lo importante (fotos, audios, cotizaciones) y lo guardo en la obra que corresponde.*
> *· Decime "**obra Belgrano**" y todo lo que mandes después va ahí.*
> *· "**informe**" para armar el link del cliente.*
> *· "**obras**" para ver tus obras.*
> *· Si me equivoco: "**no, era Palermo**" o "**deshacer**".*

---

## 3. La solución al orden / secuencia (la preocupación central)

Pieza unificadora: el **avance (`entry_group`)** — un contenedor que junta media relacionada y al
que se le puede asignar etiqueta *después*.

**3.a — "Media ahora, etiqueta después"** (el caso más común). Llega la 1ª foto sin caption → se
abre un avance (`GROUPING` 90s) y **se guarda ya** (nunca se pierde). Si en 90s no hay obra
resoluble, el avance queda pendiente, **no se pregunta con ansiedad**. Una **ventana de gracia
extra (~5 min)** acepta un texto que lo etiquete ("eso era del baño de Belgrano") y se aplica a
todas las fotos. Pasada la gracia → **una sola** pregunta de cierre:
> *Recibí **6 fotos** hace un rato pero no me dijiste de qué obra son.*
> ***1** Belgrano (tu obra activa) · **2** Palermo · **3** elegir otra · **4** dejarlas en Inbox por ahora*

El media ya está guardado; la pregunta es solo de ruteo. Si nunca contesta, a las 6h caen a Inbox. Cero pérdida.

**3.b — "Etiqueta ahora, media después".** El texto-anuncio ("te mando las fotos del baño de
Belgrano") crea un **avance con etiqueta pre-cargada** (`obra=Belgrano, album_hint=baños`) y setea
`OBRA_ACTIVA`. No confirma todavía; responde una vez: *"Dale, mandá las fotos del baño de Belgrano
cuando quieras."* Las fotos que lleguen en la ventana (extendida a ~10 min cuando hay anuncio) entran **directo al avance pre-etiquetado**.

**3.c — Caption en 1 de N fotos.** La ventana junta las N; el caption de **cualquiera** etiqueta el
avance entero (obra/álbum). La nota específica ("mirá la humedad") queda en *esa* foto; la etiqueta se hereda a todas.

**3.d — La ventana y qué ve el usuario.** Base 90s, cada media la reinicia. **Silencio** mientras
está abierta (no confirma foto por foto — sería spam y rompería la "calma de estudio" del deck).
Al cerrar, **una confirmación por avance**:
> ✓ *Guardé **6 fotos** en **Belgrano · álbum Baños**. ¿No era ahí? Respondé **no** y lo cambiamos.*

Con mezcla (fotos + audio + cotización) la confirmación resume:
> ✓ *Guardé en **Belgrano**: 4 fotos (álbum Baños), 1 audio y 1 cotización de plomería ($480.000). Tocá **no** si algo quedó mal.*

> **Decisión justificada:** acá *sí* impongo estructura sobre el flujo, porque "un webhook por foto"
> es un hecho técnico y confirmarlas sueltas destruiría la confianza ("¿guardó las 6 o solo 1?"). El
> usuario no nota la estructura; nota que "le confirmó las 6 juntas, qué prolijo".

---

## 4. Disambiguación en texto

WhatsApp solo garantiza texto libre → preguntas **siempre numeradas** y **con escape**.

1. **Máximo 4 opciones + escape.** Más candidatas → las 3 más probables + "**4** otra (escribime cuál)".
2. **Una sola pregunta abierta por remitente.** Si llega contenido nuevo no relacionado, no se encola una segunda: se guarda (Inbox o cascada) y se resuelve la primera.
3. **Toda opción de escape no destructiva**: la última siempre permite "dejalo en Inbox".

Formato canónico:
> *No tengo claro de qué obra son estas fotos. ¿Las guardo en…?*
> ***1** Belgrano · **2** Palermo · **3** otra (escribime el nombre)*
> *Si no, las dejo en Inbox y las ordenás después.*

**Binding de la respuesta** (cada `pending_clarification` guarda `partial_extraction` +
`candidate_obras` + opciones ordenadas + `expires_at`): número que matchea → directo (sin LLM);
nombre de obra → match difuso; NL ambiguo ("la primera") → LLM con contexto; **contenido nuevo
claro** → el LLM decide que NO es respuesta, se procesa como item nuevo y la pregunta sigue abierta.

**Timeout 6h** → el media (ya guardado) va a Inbox; aviso suave **solo si el arquitecto vuelve a escribir** (sin pings fantasma).

---

## 5. Confirmación + corrección

Confirmación **accionable** (no decorativa), con dos verbos de rescate de una palabra:
> ✓ *Guardé **6 fotos** en **Belgrano · álbum Baños**. ¿Mal? → **no** (lo cambiamos) o **deshacer**.*

- **`no`** → corrección guiada (qué estaba mal: obra / álbum / todo).
- **`deshacer`** → revierte (soft-delete) el avance, sin preguntas.

**Gramática de corrección** (NL libre → *update* de la última entry, no re-archivado):

| Escribe | Acción |
|---|---|
| "no, era Palermo" | mueve el avance a Palermo; re-confirma; setea `OBRA_ACTIVA=Palermo` |
| "el álbum es fachada, no baños" | cambia solo el álbum |
| "eso es del techo" | LLM mapea "techo"→álbum terminaciones/techos |
| "el monto era 480, no 48" | update de `amount` |
| "esa última foto borrala" | soft-delete de esa foto |
| "deshacer" | soft-delete del avance |

**Ventana de undo** = 30 min por avance (correcciones aplican a *ese* avance sin especificar cuál).
Pasados 30 min → corrección con contexto ("la cotización de plomería de Belgrano") o en el panel.
`deshacer` = soft-delete + audit, recuperable desde papelera (30 días). Nunca destrucción irreversible por chat.

**Confirmaciones que devuelven valor** (combate el desgaste del hábito): el viernes, tras varios avances:
> ✓ *Guardé 4 fotos en **Belgrano**. Van **23 fotos** esta semana. ¿Te armo el **link de avance** para el cliente? Respondé **sí**.*

---

## 6. Default-to-Inbox / "Sin clasificar"

**Principio:** preguntar tiene costo. Se pregunta **una vez**; sin respuesta limpia → Inbox y se
sigue. Nunca bloquea, nunca pierde, nunca pregunta dos veces lo mismo.

- Confianza < 0.4 sin activa ni candidatas → directo a Inbox.
- 0.4–0.65 con candidatas → una pregunta; sin respuesta en 6h → Inbox.
- Contenido `no_obra` (meme, audio personal) → Inbox con tag "probablemente no es de obra".

En el chat nunca se siente como error:
> ✓ *Lo dejé en tu **Inbox** (no tengo claro de qué obra es). Lo asignás en 1 toque desde el panel cuando puedas.*

**El Inbox en el panel** (vista de primer nivel, estética de "bandeja de estudio"): cards hairline
con índice numerado + thumbnail + transcripción + **obra sugerida con confianza**; **asignar en 1
clic**; **asignación masiva** (crítico para avances grandes); **drag & drop** a la obra/álbum;
**aprendizaje suave** (proveedor↔obra confirmado repetidamente sube la confianza futura — tabla de
asociaciones, no ML pesado); **badge con contador** + alerta del panel si se acumula ("14 items sin clasificar hace una semana").

---

## 7. Onboarding (vinculación por código)

- **Web:** registro con email → código grande + botón "Abrir WhatsApp con el mensaje listo" (deep link `wa.me/<num>?text=ARQ-7K9F2`) + código copiable.
- **Arquitecto manda:** `ARQ-7K9F2`
- **Sistema vincula (un mensaje cálido que orienta):**
  > ✓ *¡Listo, [Nombre]! Tu cuenta del estudio **[Estudio]** quedó vinculada. Reenviame lo importante de tus obras y lo guardo en su lugar. ¿En qué obra estás trabajando hoy? Escribime el nombre, o "**nueva obra [nombre]**".*
- **Código inválido/vencido** (TTL 15 min, single-use): *"Ese código no me figura o ya venció. Generá uno nuevo desde la app."*
- **Ya vinculado:** *"Tu número ya está vinculado al estudio [Estudio]. Si querés cambiar, escribime 'ayuda'."*
- **Desconocido sin código** (rechazo **antes** de bajar media): *"Este es el asistente de Escuadra y funciona solo con cuentas vinculadas. Si tenés cuenta, mandame tu código (ARQ-XXXXX)."*

---

## 8. División del trabajo — WhatsApp vs Panel

**WhatsApp = capturar y rutear** (rápido, en obra, manos sucias). **Panel = ver, decidir, compartir** (sentado, pantalla grande).

| Tarea | WhatsApp | Panel |
|---|---|---|
| Reenviar/capturar contenido | ✅ único | ❌ |
| Fijar obra activa | ✅ | ✅ |
| Crear obra | ✅ (rápida, con confirmación) | ✅ (completa: dirección, cliente, portada) |
| Clasificar/rutear | ✅ (auto + pregunta numerada) | ✅ (Inbox, drag, masivo) |
| Corregir un archivo reciente | ✅ ("no, era Palermo", "deshacer") | ✅ (editar/mover/fusionar/borrar, con audit) |
| Resolver Inbox | ⚠️ una pregunta puntual | ✅ lugar principal |
| Galería / timeline / proveedores / calendario | ❌ | ✅ único |
| Búsqueda | ⚠️ futuro | ✅ búsqueda universal |
| Alertas inteligentes | ❌ (no al chat) | ✅ único |
| Generar informe | ✅ disparar + recibir link (atajo del viernes) | ✅ curaduría fina (fotos, título, nota, logo) |
| Métricas del informe | ⚠️ resumen ("lo vio 3 veces") | ✅ detalle |
| Equipo / integraciones / nube | ❌ | ✅ |

**Búsqueda** y **alertas** son deliberadamente solo-panel para no convertir el chat en un bot ruidoso (el deck vende "no es un bot que te llena de mensajes").

---

## 9. Principios de diseño

1. **La estructura la sostiene el sistema, no el usuario.**
2. **Nunca perder un mensaje.** El media se persiste *antes* de clasificar o preguntar. El peor desenlace es "quedó en Inbox", jamás "se perdió".
3. **Preguntar es caro: una vez y default sensato.** Cero loops, cero bloqueos.
4. **La sesión es la mejor pista.** "Obra activa" convierte 10 reenvíos en cero fricción.
5. **Confirmar = devolver valor**, no solo acusar recibo.
6. **Toda acción es reversible en un toque, en el canal donde ocurrió.** La IA *va* a equivocarse; el diseño asume el error y lo hace barato de arreglar.
7. **Calma de estudio, no chatbot.** Silencio durante la agrupación, una confirmación prolija al cerrar, cero pings proactivos fuera de contexto.
8. **Degradación elegante del LLM.** Baja confianza → pregunta acotada. Sin respuesta → Inbox. Falla de Whisper/visión/API → media crudo "pendiente de procesar" + reintento por cola + visible en el panel. El sistema funciona aun cuando la IA no.

---

## 10. Transcripts de punta a punta

(`A→` = arquitecto · `E→` = Escuadra · `[...]` = adjunto)

**A — Avance multi-foto con obra activa**
> A→ trabajando en Belgrano hoy
> E→ ✓ Dale, **Belgrano** queda como tu obra activa. Mandá lo que quieras y lo guardo ahí.
> A→ [foto][foto][foto][foto][foto] mirá el avance del baño, la humedad arriba a la izquierda
> *(5 fotos en 40s; la ventana las junta; el caption de la 5ª etiqueta el avance — silencio mientras agrupa)*
> E→ ✓ Guardé **5 fotos** en **Belgrano · álbum Baños**. Anoté tu nota sobre la humedad en la última. ¿Mal? → **no**.

**B — Obra ambigua resuelta por número**
> A→ [3 fotos][cotización texto: "Pintura látex int/ext, mano de obra incluida, $620.000"]
> E→ ✓ Guardé 3 fotos y una **cotización de pintura ($620.000)**, pero no tengo claro de qué obra son.
> **1** Palermo · **2** Núñez · **3** otra. Si no, las dejo en Inbox.
> A→ 1
> E→ ✓ Listo, todo va a **Palermo** (cotización al proveedor **Pinturas Sur**). Ahora trabajás en Palermo.

**C — Corrección**
> A→ [4 fotos] fachada  *(activa = Belgrano; "fachada" da álbum)*
> E→ ✓ Guardé **4 fotos** en **Belgrano · álbum Fachada**. ¿Mal? → **no**.
> A→ no, eran de Palermo
> E→ ✓ Las moví a **Palermo · álbum Fachada**. Ahora trabajás en Palermo. *(¿no era eso? → "deshacer")*

**D — Pedido de informe**
> A→ informe de Belgrano de esta semana
> E→ Te armo el informe de **Belgrano** con las fotos de esta semana (**23 fotos**, Baños y Fachada). ¿Lo genero así o elegís las fotos en el panel? **1** generalo así · **2** lo armo en el panel
> A→ 1
> E→ ✓ Listo. Link para tu cliente: **escuadra.app/r/9fK2c…** Caduca en 30 días. Te aviso acá cuando lo abran.
> *(días después, dentro de la ventana de 24h)* E→ 👀 Tu cliente abrió el informe de **Belgrano** — 3 veces, la última hoy.

---

## Resumen — dónde se restringe NL y por qué

La estructura aparece en **exactamente tres lugares** —cambios de estado, acciones con efecto
externo, y resolución de ambigüedad— y siempre como **menú de un toque o verbo opcional**, nunca
como sintaxis obligatoria. El resto es lenguaje natural sobre un sistema que recuerda.

> No le pedimos al LLM que sostenga el estado: lo sostiene el modelo de sesión. Al LLM le queda
> solo lo que sabe hacer bien (entender una frase y clasificar un contenido), siempre con red de seguridad debajo.
