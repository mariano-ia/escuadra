import type { Metadata } from "next";
import { LegalShell, Sec, Ul } from "@/components/legal";

export const metadata: Metadata = {
  title: "Política de Privacidad — Escuadra",
  description: "Cómo Escuadra trata los datos personales, sub-procesadores, retención y derechos del titular.",
};

const UPDATED = "27 de mayo de 2026";

export default function PrivacidadPage() {
  return (
    <LegalShell eyebrow="Legal" title="Política de Privacidad" updated={UPDATED}>
      <p className="text-grey leading-relaxed mb-10">
        Esta política explica qué datos personales trata Escuadra, con qué finalidad, con quién los compartimos
        para prestar el servicio, cuánto los conservamos y cómo ejercés tus derechos. Está redactada en el marco
        de la Ley 25.326 de Protección de los Datos Personales de la República Argentina y sus normas complementarias.
      </p>

      <Sec n="01" title="Quiénes somos y alcance">
        <p>
          «Escuadra» es un asistente de WhatsApp para estudios de arquitectura: el arquitecto reenvía mensajes
          (fotos, audios, textos, cotizaciones) a un número de WhatsApp y Escuadra los entiende, los ordena por obra
          y permite generar informes para el cliente. Esta política aplica al panel web, al número de WhatsApp y a
          los informes públicos generados por el servicio.
        </p>
      </Sec>

      <Sec n="02" title="Roles: quién es responsable de los datos">
        <p>
          El <strong className="text-ink font-medium">estudio de arquitectura</strong> (el usuario que abre la cuenta
          y reenvía el contenido) es el <strong className="text-ink font-medium">responsable</strong> de los datos
          personales que decide cargar, incluidos los de terceros (proveedores, maestros, clientes). Escuadra actúa
          como <strong className="text-ink font-medium">encargado del tratamiento</strong>: tratamos esos datos
          únicamente para prestar el servicio, siguiendo las instrucciones del estudio. El estudio declara contar con
          base legal o consentimiento para reenviar la información de terceros (ver Términos).
        </p>
      </Sec>

      <Sec n="03" title="Qué datos tratamos">
        <Ul>
          <li><strong className="text-ink font-medium">De la cuenta:</strong> nombre del arquitecto, correo electrónico, número de teléfono, nombre y logo del estudio.</li>
          <li><strong className="text-ink font-medium">Contenido reenviado:</strong> fotos de obra, notas de voz (audio), textos, documentos y cotizaciones.</li>
          <li><strong className="text-ink font-medium">Datos de terceros incluidos en ese contenido:</strong> nombres, números de teléfono y voces de proveedores, maestros y clientes, cuando el arquitecto los incluye.</li>
          <li><strong className="text-ink font-medium">Datos técnicos:</strong> registros mínimos de uso necesarios para operar y dar seguridad al servicio.</li>
        </Ul>
      </Sec>

      <Sec n="04" title="Para qué los usamos">
        <Ul>
          <li>Clasificar y ordenar automáticamente el contenido por obra.</li>
          <li>Transcribir notas de voz a texto para que sean buscables.</li>
          <li>Extraer datos útiles (montos, proveedores, fechas) de cotizaciones y mensajes.</li>
          <li>Generar informes de avance para que el estudio comparta con su cliente.</li>
          <li>Operar, asegurar y mejorar el servicio.</li>
        </Ul>
        <p>No vendemos datos personales ni los usamos para publicidad.</p>
      </Sec>

      <Sec n="05" title="Con quién los compartimos (sub-procesadores)">
        <p>Para funcionar, Escuadra se apoya en proveedores que tratan datos por nuestra cuenta, bajo contrato:</p>
        <Ul>
          <li><strong className="text-ink font-medium">Anthropic</strong> (EE. UU.) — interpretación y clasificación del contenido con IA.</li>
          <li><strong className="text-ink font-medium">OpenAI</strong> (EE. UU.) — transcripción de las notas de voz.</li>
          <li><strong className="text-ink font-medium">Twilio</strong> (EE. UU.) — mensajería de WhatsApp.</li>
          <li><strong className="text-ink font-medium">Supabase</strong> — base de datos y almacenamiento de archivos.</li>
          <li><strong className="text-ink font-medium">Vercel</strong> (EE. UU.) — alojamiento de la aplicación.</li>
          <li><strong className="text-ink font-medium">Google</strong> — copia de respaldo en Google Drive, <em>solo si el estudio la activa</em> (ver sección 07).</li>
          <li><strong className="text-ink font-medium">Dropbox</strong> — respaldo alternativo, solo si el estudio lo activa (a futuro).</li>
        </Ul>
      </Sec>

      <Sec n="06" title="Inteligencia artificial y entrenamiento">
        <p>
          El contenido se procesa con los servicios de IA mencionados a través de sus interfaces para empresas/API,
          cuyos términos establecen que <strong className="text-ink font-medium">los datos no se utilizan para entrenar
          sus modelos</strong>. Las notas de voz se transcriben y el audio original se elimina una vez transcripto, para
          reducir la exposición de datos sensibles.
        </p>
      </Sec>

      <Sec n="07" title="Datos de Google (Google Drive)">
        <p>
          Si el estudio conecta su Google Drive, Escuadra solicita únicamente el permiso
          <code className="text-ink"> drive.file</code>, que da acceso <strong className="text-ink font-medium">solo a
          los archivos que la propia aplicación crea</strong> (las fotos que sube, organizadas en una carpeta «Escuadra»
          por obra). Escuadra <strong className="text-ink font-medium">no accede al resto de tu Google Drive</strong>.
        </p>
        <p>
          El uso y la transferencia de la información recibida de las APIs de Google se ajustan a la
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-ink underline underline-offset-2" target="_blank" rel="noopener noreferrer"> Política de Datos de Usuario de los Servicios de API de Google</a>,
          incluidos sus requisitos de Uso Limitado. No vendemos los datos de Google, no los usamos para publicidad ni los
          compartimos con terceros salvo lo necesario para prestar el servicio. Podés revocar el acceso cuando quieras
          desde tu cuenta de Google o desconectando la integración en Configuración.
        </p>
      </Sec>

      <Sec n="08" title="Conservación de los datos">
        <p>
          Conservamos el contenido mientras la cuenta y la obra estén activas. Tras el cierre de una obra o de la cuenta,
          las fotos, transcripciones y registros asociados se eliminan dentro de un plazo razonable. El audio original se
          borra apenas se transcribe. Las copias que el estudio haya sincronizado a su propio Google Drive o Dropbox quedan
          bajo su control y su responsabilidad eliminarlas.
        </p>
      </Sec>

      <Sec n="09" title="Informes públicos">
        <p>
          Los informes para el cliente se comparten mediante un enlace con un código secreto e imposible de adivinar.
          Estos enlaces <strong className="text-ink font-medium">vencen</strong> automáticamente, pueden
          <strong className="text-ink font-medium"> revocarse</strong> en cualquier momento y están configurados para
          <strong className="text-ink font-medium"> no ser indexados</strong> por buscadores. Las imágenes se sirven con
          URLs firmadas de corta duración.
        </p>
      </Sec>

      <Sec n="10" title="Transferencia internacional">
        <p>
          Algunos de nuestros sub-procesadores operan en Estados Unidos, por lo que ciertos datos se transfieren y tratan
          fuera de Argentina, exclusivamente con la finalidad de prestar el servicio y bajo los compromisos contractuales
          de cada proveedor.
        </p>
      </Sec>

      <Sec n="11" title="Tus derechos">
        <p>
          Como titular de los datos podés ejercer tus derechos de <strong className="text-ink font-medium">acceso,
          rectificación, actualización y supresión</strong>. Si sos un tercero cuyos datos fueron cargados por un estudio,
          también podés solicitar que eliminemos tu información (por ejemplo, todo lo asociado a tu número de teléfono o
          nombre). Escribinos a <a href="mailto:marianonoceti@gmail.com" className="text-ink underline underline-offset-2">marianonoceti@gmail.com</a> y lo gestionamos.
        </p>
        <p>
          La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, órgano de control de la Ley 25.326, tiene la atribución de atender
          denuncias y reclamos respecto del incumplimiento de las normas sobre protección de datos personales.
        </p>
      </Sec>

      <Sec n="12" title="Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas acordes al riesgo: aislamiento de datos por estudio, almacenamiento
          privado con acceso por URLs firmadas, cifrado de los tokens de las integraciones en reposo y control de accesos.
          Ningún sistema es infalible, pero trabajamos para proteger tu información.
        </p>
      </Sec>

      <Sec n="13" title="Cambios y contacto">
        <p>
          Podemos actualizar esta política; publicaremos la nueva versión en esta misma página con su fecha. Ante cualquier
          consulta sobre privacidad, escribinos a <a href="mailto:marianonoceti@gmail.com" className="text-ink underline underline-offset-2">marianonoceti@gmail.com</a>.
        </p>
      </Sec>
    </LegalShell>
  );
}
