import type { Metadata } from "next";
import { LegalShell, Sec, Ul } from "@/components/legal";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Escuadra",
  description: "Condiciones de uso del servicio Escuadra: cuenta, responsabilidades, contenido, IA y datos.",
};

const UPDATED = "27 de mayo de 2026";

export default function TerminosPage() {
  return (
    <LegalShell eyebrow="Legal" title="Términos y Condiciones" updated={UPDATED}>
      <p className="text-grey leading-relaxed mb-10">
        Estos términos regulan el uso de Escuadra. Al crear una cuenta o usar el servicio, aceptás estas condiciones.
        Si las usás en nombre de un estudio, declarás tener facultades para obligarlo.
      </p>

      <Sec n="01" title="El servicio">
        <p>
          Escuadra es un asistente que recibe mensajes reenviados por WhatsApp (fotos, audios, textos, cotizaciones),
          los interpreta con inteligencia artificial, los ordena por obra y permite generar informes para el cliente,
          todo accesible desde un panel web.
        </p>
      </Sec>

      <Sec n="02" title="Tu cuenta">
        <p>
          Sos responsable de la veracidad de los datos de tu cuenta y de la actividad que ocurra bajo ella. Vinculás tu
          WhatsApp mediante un código de un solo uso. Mantené la confidencialidad de tus accesos.
        </p>
      </Sec>

      <Sec n="03" title="Contenido de terceros — tu responsabilidad">
        <p>
          Al reenviar contenido que incluye datos de terceros (fotos de propiedades, voces, nombres o teléfonos de
          proveedores, maestros o clientes), declarás y garantizás que <strong className="text-ink font-medium">contás
          con la base legal o el consentimiento necesarios</strong> para tratarlos y para que Escuadra los procese en tu
          nombre. Sos el responsable de esos datos; Escuadra actúa como encargado del tratamiento (ver Política de Privacidad).
          Te comprometés a mantener indemne a Escuadra frente a reclamos derivados del contenido que cargás.
        </p>
      </Sec>

      <Sec n="04" title="Uso aceptable">
        <Ul>
          <li>No usar el servicio para fines ilícitos ni para cargar contenido que no tengas derecho a tratar.</li>
          <li>No intentar vulnerar la seguridad, acceder a datos de otros estudios ni abusar del sistema.</li>
          <li>No reenviar contenido ajeno a la actividad de tus obras.</li>
        </Ul>
      </Sec>

      <Sec n="05" title="Propiedad del contenido">
        <p>
          El contenido que cargás es y sigue siendo tuyo (o de tu estudio). Nos otorgás una licencia limitada y revocable,
          únicamente para almacenarlo, procesarlo y mostrártelo con el fin de prestar el servicio. El software, la marca y
          el diseño de Escuadra son de Escuadra.
        </p>
      </Sec>

      <Sec n="06" title="Inteligencia artificial: revisá los resultados">
        <p>
          La clasificación, transcripción y extracción de datos se hacen de forma automática y
          <strong className="text-ink font-medium"> pueden contener errores</strong>. Escuadra es una herramienta de
          organización, no un asesoramiento profesional, contable ni legal. Revisá la información antes de tomar decisiones
          o de compartir un informe con tu cliente. El panel te permite corregir y reasignar lo que haga falta.
        </p>
      </Sec>

      <Sec n="07" title="Integraciones (Google Drive, otros)">
        <p>
          Las integraciones de respaldo en la nube son opcionales y las activás vos. Al conectarlas, autorizás a Escuadra
          a guardar copias de tus fotos en tu propia cuenta (por ejemplo, en una carpeta «Escuadra» de tu Google Drive).
          Esas copias quedan bajo tu control. Podés desconectar la integración cuando quieras.
        </p>
      </Sec>

      <Sec n="08" title="Disponibilidad y garantías">
        <p>
          El servicio se ofrece «tal cual» y «según disponibilidad». Hacemos un esfuerzo razonable por mantenerlo
          disponible y seguro, pero no garantizamos que esté libre de interrupciones o errores. Podemos modificar o
          discontinuar funciones, avisando cuando sea razonable.
        </p>
      </Sec>

      <Sec n="09" title="Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, Escuadra no será responsable por daños indirectos, lucro cesante ni
          pérdida de datos derivados del uso o la imposibilidad de uso del servicio. Mantené tus propias copias de la
          información que consideres crítica.
        </p>
      </Sec>

      <Sec n="10" title="Planes y pagos">
        <p>
          Si el servicio ofrece planes pagos, las condiciones de precio, facturación y renovación se informarán al
          momento de la contratación. Las funciones gratuitas pueden cambiar.
        </p>
      </Sec>

      <Sec n="11" title="Baja y eliminación de datos">
        <p>
          Podés dar de baja tu cuenta cuando quieras. Al hacerlo, eliminamos tu contenido según lo descripto en la
          Política de Privacidad. Las copias en tu propio Drive/Dropbox quedan bajo tu control.
        </p>
      </Sec>

      <Sec n="12" title="Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los
          tribunales competentes correspondientes, sin perjuicio de los derechos que la normativa de protección de datos
          reconoce a los titulares.
        </p>
      </Sec>

      <Sec n="13" title="Cambios y contacto">
        <p>
          Podemos actualizar estos términos; la versión vigente estará siempre en esta página con su fecha. Consultas:
          <a href="mailto:marianonoceti@gmail.com" className="text-ink underline underline-offset-2"> marianonoceti@gmail.com</a>.
        </p>
      </Sec>
    </LegalShell>
  );
}
