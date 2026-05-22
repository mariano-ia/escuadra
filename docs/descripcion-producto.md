# ArquiTest — Descripción del producto

> Documento para uso interno del equipo. Usalo como guía para conversar con arquitectos y validar el producto.

---

## El problema que resolvemos

Los arquitectos viven en **WhatsApp** con sus proveedores, maestros mayores de obra y clientes. Por ahí pasa el 90% de la operación diaria de cada obra:

- Cotizaciones de proveedores
- Fotos de avance
- Fechas de entrega, visitas técnicas, pagos
- Aprobaciones del cliente
- Cambios sobre la marcha
- Reclamos y problemas

Todo mezclado, todo desordenado, sin búsqueda real, sin estructura. Cuando hay que recordar **qué dijo quién y cuándo**, o **armar un informe de obra para el cliente**, el arquitecto pierde horas revolviendo chats y juntando capturas de pantalla.

Las fotos de obra son el caso más doloroso: cada proyecto genera **cientos de fotos** repartidas entre 10-20 chats distintos, mezcladas con memes, audios de cumpleaños y conversaciones personales. Buscar "la foto del problema del baño que mandó el plomero hace 3 semanas" es un drama.

---

## Qué estamos construyendo

Una herramienta que **organiza automáticamente toda la información que pasa por WhatsApp**, sin que el arquitecto tenga que cambiar de app, sin que sus proveedores tengan que aprender nada nuevo, y sin riesgo para su número personal.

El arquitecto sigue trabajando en WhatsApp como toda la vida. Cuando quiere que algo quede registrado y organizado, simplemente lo **reenvía a nuestro número** (que funciona como un asistente). Nuestro sistema entiende lo que le manda, lo clasifica solo, y lo guarda en la obra correcta. Después puede entrar a un **panel web** para verlo todo organizado y compartir avances con sus clientes.

---

## Cómo se ve en la práctica

### 1. Onboarding rápido
- Se registra en una página web con su email.
- Recibe un código corto (tipo `ARQ-7K9F2`).
- Manda ese código por WhatsApp a nuestro número.
- Listo, su cuenta queda vinculada en menos de un minuto.

### 2. Uso diario sobre WhatsApp
El arquitecto sigue su día normal. Cuando llega algo importante a alguno de sus chats, lo **reenvía a nuestro número** con un comentario natural:

> *"Te mando las fotos del avance del baño, obra Belgrano"*
> *[reenvía 5 fotos del plomero]*

O un audio:

> 🎙️ *"Esto es del techo de la cocina de Palermo, mirá la mancha de humedad arriba a la izquierda, hay que llamar al impermeabilizador urgente"*

O una cotización:

> *"Cotización plomería Belgrano $480.000 con instalación"*
> *[reenvía el mensaje del proveedor]*

Nuestro sistema **entiende el lenguaje natural**, identifica la obra, identifica el tipo de información, y lo guarda en el lugar correcto. Si hay ambigüedad, pregunta al arquitecto antes de guardar mal.

### 3. Todo aparece organizado en el panel web

El arquitecto entra desde la compu o el celular y ve:

- **Sus obras activas** (con foto de portada, dirección, cliente, estado)
- Dentro de cada obra:
  - **Galería de fotos** organizada por álbumes (fachada, baños, instalación, terminaciones, etc.)
  - **Línea de tiempo** con todo lo que pasó: fotos, audios, cotizaciones, aprobaciones, pagos
  - **Vista de proveedores**: todo lo conversado con cada uno, sus cotizaciones, sus deadlines, lo que debe entregar
  - **Calendario** con vencimientos, visitas técnicas, fechas de entrega y pagos
  - **Alertas inteligentes**: "El plomero te debe respuesta hace 5 días" / "Vence cotización de pintura mañana" / "El cliente no aprobó todavía el cambio de griferías"

### 4. Búsqueda que funciona

Todo lo que entra al sistema es buscable. Texto, audios transcriptos, comentarios:

- *"azulejo cromo"* → encuentra la nota donde el cliente pidió cambiar las griferías
- *"cotización plomería"* → todas las cotizaciones de plomería de todas las obras
- *"problema humedad"* → audios y fotos donde se mencionó humedad

### 5. Informes al cliente en 30 segundos (el feature estrella)

Hoy: el arquitecto **pierde 1 a 3 horas armando un PowerPoint** con fotos del avance para mandar al cliente.

Con ArquiTest:
- Entra a la obra
- Selecciona las fotos del último mes (o filtra por álbum)
- Le agrega un título y una nota corta
- Click en "Generar link"
- Copia el link, lo manda al cliente por WhatsApp

El cliente abre el link en su celular y ve un **informe visual prolijo** con las fotos, los comentarios del arquitecto, fecha, logo del estudio.

El arquitecto ve cuántas veces se vio, cuándo fue la última. Todo queda registrado.

**Ahorro real:** 20-40 horas/mes por estudio en armado manual de informes.

### 6. Para estudios con varios socios o asistentes

Múltiples cuentas dentro del mismo estudio. Todos ven las mismas obras, comparten la información, y se ve quién registró qué.

### 7. Integraciones con la nube del estudio

Sincronización opcional con **Google Drive** o **Dropbox**: las fotos quedan también en la nube del arquitecto, organizadas en carpetas por obra. Si mañana deja de usar ArquiTest, no pierde nada.

---

## Por qué este producto es diferente

- **No le pide nada al proveedor.** Las herramientas competidoras requieren que los proveedores se instalen apps o cambien de canal. La nuestra es invisible para ellos.
- **No saca al arquitecto de WhatsApp.** Sigue usando su número de toda la vida. Cero riesgo de bloqueo, cero cambio de hábito.
- **No es solo "fotos ordenadas".** Indexa **toda la operación**: cotizaciones, fechas, aprobaciones, pagos, problemas. Es la **memoria comercial** de cada obra.
- **Convierte lo desordenado en presentable.** El feature de informes al cliente solo, justifica el producto.

---

## Para quién es

- **Estudios de arquitectura chicos y medianos** (1 a 15 personas).
- Que llevan entre **3 y 30 obras simultáneas**.
- Donde el arquitecto principal es el responsable directo de cada obra (no hay PM dedicado).
- Que ya viven en WhatsApp pero sienten que se les escapa información.
- Que mandan informes al cliente periódicamente (semanal o mensual).

---

## Preguntas para validar con arquitectos

Cuando lo presenten, escuchen específicamente:

### Sobre el dolor
1. *"¿Cuánto tiempo por semana perdés buscando algo en WhatsApp con proveedores?"*
2. *"¿Cómo organizás las fotos de obra hoy? ¿Te funciona?"*
3. *"¿Cuánto te lleva armar un informe de avance para el cliente?"*
4. *"¿Te pasó alguna vez que se te perdió una cotización o una aprobación importante en el chat?"*

### Sobre el hábito de "reenviar al asistente"
5. *"Si tuvieras un número al que pudieras reenviar lo importante y se organizara solo, ¿lo usarías?"*
6. *"¿Te suena natural el gesto de reenviar + agregar una nota corta?"*

### Sobre el informe al cliente
7. *"Si pudieras generar un informe visual para tu cliente en 30 segundos en vez de 2 horas, ¿qué harías con ese tiempo?"*
8. *"¿Qué tendría que tener ese informe para que vos lo mandes con orgullo?"*

### Sobre el precio
9. *"¿Cuánto pagarías por mes por esto?"* (sin sugerir precio, escuchar)
10. *"¿Y si te lo doy por obra activa en vez de por usuario?"*

### Lo que NO les digan
- No mencionen "es una POC", "todavía no está listo", "estamos viendo si conviene". Hablen del producto como **existente**. Lo que validan es la propuesta de valor, no la fecha de release.
- No prometan features que no hayamos confirmado (videos, comentarios del cliente, etc.). Si preguntan por algo que no está en este documento, anótenlo como feedback y digan *"buena idea, lo vamos a evaluar"*.

---

## Lo que NO hace (por ahora)

Para que sepan responder cuando pregunten:

- **No se mete en sus chats automáticamente.** El arquitecto decide qué reenvía y qué no.
- **No reemplaza WhatsApp.** Es un complemento. WhatsApp sigue siendo el canal principal de conversación.
- **No envía mensajes automáticos por él.** No es un bot que responde a sus proveedores.
- **No conecta con Notion, Asana ni Trello** (todavía). Es un sistema cerrado por ahora.

---

## Resumen en una frase

> **ArquiTest es el asistente de WhatsApp que organiza toda la operación de obra del arquitecto y le permite armar informes profesionales al cliente en segundos, sin que tenga que cambiar nada de cómo trabaja hoy.**
