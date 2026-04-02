import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { sanitizeCertificadoText } from "@/lib/certificados";
import { formatearRut } from "@/lib/rut";

export type CertificadoPdfData = {
  codigoUnico: string;
  tipo: "alumno_regular" | "termino_curso";
  valido: boolean;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  asignaturaNombre: string | null;
  fechaEmision: Date | string | null;
  urlVerificacion: string;
};

const TIPO_LABELS: Record<CertificadoPdfData["tipo"], string> = {
  alumno_regular: "Certificado de Alumno Regular",
  termino_curso: "Certificado de Termino de Curso",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 11,
    lineHeight: 1.45,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 24,
  },
  headline: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
    color: "#1e3a8a",
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 14,
    color: "#334155",
  },
  body: {
    fontSize: 12,
    marginBottom: 14,
    color: "#1e293b",
  },
  strong: {
    fontWeight: 700,
  },
  detailGrid: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    gap: 4,
  },
  detailLine: {
    fontSize: 10,
    color: "#334155",
  },
  status: {
    marginTop: 12,
    fontSize: 10,
    color: "#475569",
  },
  footer: {
    marginTop: 14,
    fontSize: 9,
    color: "#64748b",
  },
});

const formatRutValue = (rut: string | null): string => {
  if (!rut) {
    return "-";
  }

  if (rut.startsWith("EXT-")) {
    return `Ext: ${rut.replace(/^EXT-/, "")}`;
  }

  return formatearRut(rut);
};

const formatDateValue = (value: Date | string | null): string => {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const safeText = (value: unknown, fallback: string, maxLength = 140): string =>
  sanitizeCertificadoText(value, maxLength) ?? fallback;

function CertificadoDocument({ data }: { data: CertificadoPdfData }) {
  const alumnoNombre = safeText(data.alumnoNombre, "Alumno", 120);
  const alumnoApellido = safeText(data.alumnoApellido, "", 120);
  const asignaturaNombre = safeText(data.asignaturaNombre, "No informada", 140);
  const codigoUnico = safeText(data.codigoUnico, "codigo-no-disponible", 64);
  const urlVerificacion = safeText(data.urlVerificacion, "No disponible", 250);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.headline}>{TIPO_LABELS[data.tipo]}</Text>
          <Text style={styles.subtitle}>OTEC - Emision automatica con firma digital de registro</Text>

          <Text style={styles.body}>
            Se certifica que <Text style={styles.strong}>{`${alumnoNombre} ${alumnoApellido}`.trim()}</Text>
            {" "}se encuentra asociado al registro academico correspondiente.
          </Text>

          <View style={styles.detailGrid}>
            <Text style={styles.detailLine}>Alumno: {`${alumnoNombre} ${alumnoApellido}`.trim()}</Text>
            <Text style={styles.detailLine}>RUT/Credencial: {formatRutValue(data.alumnoRut)}</Text>
            <Text style={styles.detailLine}>Asignatura: {asignaturaNombre}</Text>
            <Text style={styles.detailLine}>Fecha de emision: {formatDateValue(data.fechaEmision)}</Text>
            <Text style={styles.detailLine}>Codigo unico: {codigoUnico}</Text>
            <Text style={styles.detailLine}>URL de verificacion: {urlVerificacion}</Text>
          </View>

          <Text style={styles.status}>
            Estado del certificado: {data.valido ? "Valido" : "Invalidado"}
          </Text>

          <Text style={styles.footer}>
            Documento generado programaticamente con react-pdf. Conserve este archivo para respaldo.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCertificadoPdf(data: CertificadoPdfData): Promise<Buffer> {
  return renderToBuffer(<CertificadoDocument data={data} />);
}