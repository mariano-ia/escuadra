# Escuadra — Confianza, aprendizaje y auditoría

> Cómo Escuadra logra que la confianza sea *merecida* y mejore con el tiempo, sin volverse un
> riesgo legal. Complementa a [modelo-de-confirmacion.md](modelo-de-confirmacion.md) y se rige
> por la skill `escuadra-compliance`.

## El insight clave: el funnel solo atrapa lo que el modelo SABE que no sabe

El funnel de confirmación atrapa los **known-unknowns** (incertidumbre conocida: confianza baja
o ambigüedad). El error peligroso es el **unknown-unknown**: el `0.9` que está **equivocado** —
el modelo "cree" que acertó, así que **no dispara el funnel**. Por diseño, el funnel es ciego a
esto. Por eso hace falta una segunda red (el auditor) y una mejora continua de la calibración.

## Aclaración: no es UNA confianza, son varias

Un mensaje tiene confianza de **obra**, **tipo** (avance vs problema), **monto**, **proveedor**,
**fecha**. El funnel es **multidimensional**: cada dimensión de alto impacto (obra, monto,
aprobación, pago) tiene su propio disparador. Un 0.9 de obra correcto no salva un monto mal leído.

## La confianza debe ser ESTRUCTURAL, no auto-reportada

Los LLM están mal calibrados (se sienten seguros y fallan). La confianza no sale de preguntarle
"¿qué tan seguro estás?", sino de **señales deterministas**:
- ¿el nombre de obra matchea exacto / por alias conocido?
- ¿el proveedor trabaja en una sola obra (asociación aprendida)?
- ¿coincide con la obra activa de la sesión?
- ¿hay 2+ candidatas plausibles?
- ¿el monto se parsea limpio o viene de OCR de una imagen?

Estas señales se combinan en el score que decide funnel vs archivar. Es medible y auditable; el "feeling" del modelo no.

## Las 4 capas de "mejorar con el tiempo"

| Capa | Qué es | Riesgo | Aislamiento |
|---|---|---|---|
| **1 · Confianza estructural** | Señales deterministas → score (arriba). La base de todo. | Bajo | — |
| **2 · Memoria por estudio** | Aprende del usuario: aprende patrones y alimenta la capa 1. | Bajo | **Por tenant** |
| **3 · Agente auditor** | Segunda pasada que atrapa el confiado-pero-equivocado. | Medio (costo) | Por tenant |
| **4 · Aprendizaje de producto** | Patrones de dominio agregados/anonimizados, curados por el equipo. | **Alto si se hace mal** | De-identificado |

### Capa 2 — Memoria por estudio (aprende del usuario)

**No es fine-tuning.** Es memoria estructurada, barata y aislada por tenant, que sube la confianza estructural:
- **Asociaciones proveedor↔obra** ("Pinturas Sur ⇒ Belgrano").
- **Alias de nombres** ("la de Belgrano" = Belgrano Cabildo).
- **Historial de correcciones**: cada "no, era Palermo" es una señal; si un patrón se repite, se aprende.
- **Convenciones de álbum** del estudio.

Cuanto más usa el estudio, mejor le matchea → el 0.9 se vuelve cada vez más *merecido*.

### Capa 3 — Agente auditor (la red que el funnel no puede tejer)

Un job periódico que repasa lo ya guardado buscando lo que la ingesta no pudo ver:
- montos **outlier** (10x el promedio → posible error de OCR),
- una foto en una obra cuando la ráfaga alrededor era de otra,
- un proveedor en una obra donde nunca apareció,
- **duplicados** (mismo hash de contenido en dos entries),
- un **tipo** que no matchea el contenido al releerlo,
- ítems podridos en el Inbox.

Reglas de oro:
1. **Flaggea, no corrige solo.** El auditor también es un LLM y también se equivoca → cola de revisión en el panel + pregunta reactiva amable; **humano confirma**. Nunca auto-corrige en silencio.
2. **Priorizado por impacto y costo.** Mira fuerte cotizaciones/aprobaciones/pagos, liviano las fotos. Batch + sampling (repasar todo es caro).
3. **Con su propio umbral**, para no flaggear de más.

> Conexión con el informe: el armador de informe al cliente **resalta los ítems de baja confianza
> o flaggeados** antes de mandarlos — el momento de máxima visibilidad es la última red de seguridad.

### Capa 4 — Aprendizaje de producto (cross-user): qué SÍ y qué NO

**NO se puede** (campo minado legal): usar datos crudos de un estudio (que incluyen PII de
terceros — voces, teléfonos, fotos de casas) para mejorar un modelo que sirve a otros estudios.
Contradice de frente la postura de compliance ya elegida: planes **no-training / retención cero**
con Anthropic/OpenAI + el **DPA** donde Escuadra es solo *encargado* (Ley 25.326). Ver `escuadra-compliance`.

**SÍ se puede** (sin riesgo): aprender **patrones de dominio agregados, anonimizados y curados por
el equipo** — no datos crudos. Ejemplos: "'avance' suele ser una foto", "los montos en AR usan '.'
de miles", sinónimos de obra (humedad/filtración), taxonomías de álbum comunes. Eso mejora el
prompt / las reglas / los diccionarios **para todos**, con humano en el loop, sin tocar PII. Sube
la vara del piso de todos, no del techo de cada cliente.

## Score de salud por estudio (alerta interna)

Idea: el monitoreo por estudio lleva un **score de salud**; si baja de un umbral → **alerta
interna** (al equipo de Escuadra, no al cliente). Hace observable el riesgo #1 de churn (el
"desgaste silencioso del hábito"). Tres refinamientos para que funcione:

**1. No es un score, son DOS — porque se actúa distinto:**
- **Calidad de datos** (¿clasificamos bien?): tasa de corrección, tasa de baja confianza, duplicados, ítems flaggeados por el auditor. Mide cómo lo hace **el sistema**.
- **Engagement / adopción** (¿lo usan y sacan valor?): frecuencia/recencia de reenvíos, tamaño y edad del Inbox, uso de obra activa, **generación de informes** (el momento "ajá"), actividad en el panel. Mide cómo está **el cliente**.

> Un score único esconde el diagnóstico. Score bajo puede significar **"les estamos fallando"**
> (corrección/baja confianza alta → problema de producto) **o "se están yendo"** (uso bajo →
> outreach de customer success). Son acciones opuestas; hay que poder distinguirlas.

**2. El score es mayormente telemetría BARATA, no el LLM.** Las señales más predictivas de churn
(recencia de uso, Inbox que se acumula, tasa de corrección) son métricas deterministas, casi
gratis de computar. Los hallazgos del **auditor** (LLM) son **un input más**, no el motor del
score. Esto lo hace barato y continuo.

**3. Interna, accionable y auditada.** La alerta dice **qué pasó y qué hacer** ("reenvíos −70%
esta semana, 40 ítems en Inbox hace 10 días") no solo "score bajo". El acceso del equipo a datos
del tenant queda en `audit_log` (ver `escuadra-compliance`). Umbral **conservador** para no
generar alert-fatigue interno; se calibra con datos.

**Doble uso (sinergia con la Capa 4):** per-estudio alimenta customer success; **agregado y
de-identificado**, si muchos estudios degradan en el mismo patrón ("todos los audios de 'humedad'
fallan"), es señal para mejorar el producto.

**Cuándo:** **instrumentar los eventos desde el día 1** (reenvíos, correcciones, aclaraciones,
estado del Inbox, informes — barato de capturar, caro de reconstruir después); construir el
score + alertas en **Fase 2**.

## Síntesis

- El **funnel** atrapa la incertidumbre conocida (en ingesta).
- El **auditor** atrapa la certeza equivocada (después, flaggeando para revisión humana).
- La **memoria por estudio** hace que cada vez haga falta menos funnel (confianza merecida, por tenant).
- El **aprendizaje de producto** sube el piso de todos, pero solo con patrones de dominio de-identificados — nunca con datos crudos de clientes.
