"use client";

import {
  Circle,
  Document,
  Image,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { INSTITUCION_OTEC } from "@/lib/institucion";
import { formatearRut } from "@/lib/rut";

export type CertificadoRegularPdfData = {
  codigoUnico: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  cursoNombre: string;
  finalidad: string;
  fechaEmision: string;
  qrDataUrl: string;
  numeroCertificado?: string | null;
};

const COLORS = {
  morado: "#6B21A8",
  moradoOscuro: "#3F1370",
  moradoMedio: "#7E2EB8",
  moradoSuave: "#E9DDF5",
  dorado: "#D9A93C",
  doradoClaro: "#F2C65A",
  texto: "#1A1230",
  textoTenue: "#5B5670",
  campoBg: "#EFE6F8",
  fondo: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: COLORS.fondo,
    fontFamily: "Times-Roman",
    color: COLORS.texto,
  },
  cornerTL: { position: "absolute", top: 0, left: 0, width: 200, height: 200 },
  cornerTR: { position: "absolute", top: 0, right: 0, width: 200, height: 200 },
  cornerBL: { position: "absolute", bottom: 0, left: 0, width: 200, height: 200 },
  cornerBR: { position: "absolute", bottom: 0, right: 0, width: 200, height: 200 },
  dotsTR: { position: "absolute", top: 50, right: 36, width: 80, height: 42 },
  dotsBL: { position: "absolute", bottom: 110, left: 36, width: 80, height: 42 },
  watermark: {
    position: "absolute",
    top: 240,
    left: 137,
    width: 320,
    height: 320,
    opacity: 0.05,
  },
  contenido: {
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 78,
  },
  header: {
    alignItems: "center",
    marginBottom: 4,
  },
  logo: {
    width: 270,
    height: 110,
    objectFit: "contain",
    marginBottom: 8,
  },
  institucionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  institucionLine: {
    width: 70,
    height: 0.7,
    backgroundColor: COLORS.morado,
  },
  institucionDiamond: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.dorado,
    transform: "rotate(45deg)",
  },
  institucionTexto: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.moradoOscuro,
    letterSpacing: 2.5,
    fontFamily: "Times-Bold",
  },
  titulo: {
    marginTop: 18,
    fontSize: 44,
    color: COLORS.moradoOscuro,
    textAlign: "center",
    letterSpacing: 7,
    fontFamily: "Times-Bold",
  },
  subtitulo: {
    fontSize: 22,
    color: COLORS.moradoOscuro,
    textAlign: "center",
    letterSpacing: 4,
    marginTop: 2,
    fontFamily: "Times-Bold",
  },
  diamanteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 8,
  },
  diamanteLine: {
    width: 80,
    height: 1,
    backgroundColor: COLORS.dorado,
  },
  diamante: {
    width: 7,
    height: 7,
    backgroundColor: COLORS.dorado,
    transform: "rotate(45deg)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  metaLbl: {
    fontSize: 12,
    color: COLORS.textoTenue,
    fontFamily: "Times-Roman",
  },
  metaValBox: {
    borderWidth: 1,
    borderColor: COLORS.morado,
    borderStyle: "solid",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.moradoOscuro,
    letterSpacing: 0.6,
    fontFamily: "Times-Bold",
  },
  cuerpo: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 1.7,
    color: COLORS.texto,
    textAlign: "justify",
  },
  campo: {
    backgroundColor: COLORS.campoBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    color: COLORS.moradoOscuro,
    fontFamily: "Times-Bold",
  },
  fechaRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fechaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: COLORS.morado,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  fechaLbl: {
    fontSize: 12,
    color: COLORS.texto,
    fontFamily: "Times-Roman",
  },
  fechaValBox: {
    backgroundColor: COLORS.campoBg,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  fechaVal: {
    fontSize: 11,
    color: COLORS.moradoOscuro,
    fontFamily: "Times-Bold",
  },
  firmaSection: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    position: "relative",
  },
  qrCol: {
    width: 110,
    alignItems: "center",
  },
  qr: {
    width: 80,
    height: 80,
  },
  qrLbl: {
    fontSize: 7.5,
    color: COLORS.textoTenue,
    marginTop: 3,
    textAlign: "center",
    fontFamily: "Times-Roman",
  },
  firmaCol: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 4,
  },
  firmaImg: {
    width: 160,
    height: 64,
    objectFit: "contain",
    marginBottom: -10,
  },
  firmaLinea: {
    width: 230,
    height: 0.8,
    backgroundColor: COLORS.texto,
    marginBottom: 6,
  },
  firmaNombre: {
    fontSize: 13,
    color: COLORS.texto,
    letterSpacing: 0.6,
    fontFamily: "Times-Bold",
  },
  firmaCargo: {
    fontSize: 10.5,
    color: COLORS.textoTenue,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  timbreCol: {
    width: 120,
    alignItems: "center",
  },
  timbre: {
    width: 110,
    height: 110,
    objectFit: "contain",
    opacity: 0.92,
  },
  pieWrap: {
    marginTop: 18,
    position: "relative",
    height: 50,
  },
  pieMorado: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    backgroundColor: COLORS.morado,
    borderRadius: 30,
    paddingVertical: 11,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  pieIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pieTexto: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    letterSpacing: 0.4,
  },
  pieMedalla: {
    position: "absolute",
    right: 16,
    top: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.dorado,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  webRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  webGlobo: {
    width: 13,
    height: 13,
  },
  webText: {
    fontSize: 12,
    color: COLORS.morado,
    fontFamily: "Times-Bold",
    textDecoration: "none",
  },
});

const formatRut = (rut: string | null): string => {
  if (!rut) return "—";
  if (rut.startsWith("EXT-")) return `Ext: ${rut.replace(/^EXT-/, "")}`;
  try {
    return formatearRut(rut);
  } catch {
    return rut;
  }
};

const formatFecha = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

function CornerOrnament({ variant }: { variant: "tl" | "tr" | "bl" | "br" }) {
  const flipX = variant === "tr" || variant === "br";
  const flipY = variant === "bl" || variant === "br";
  const tx = flipX ? 200 : 0;
  const ty = flipY ? 200 : 0;
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  const tr = `translate(${tx} ${ty}) scale(${sx} ${sy})`;

  return (
    <Svg viewBox="0 0 200 200" width="200" height="200">
      <Path d="M0,0 L220,0 C170,32 115,68 75,110 C45,142 20,178 0,220 Z" transform={tr} fill={COLORS.dorado} />
      <Path d="M0,0 L188,0 C150,28 100,60 65,105 C40,140 18,175 0,205 Z" transform={tr} fill={COLORS.morado} />
      <Path d="M0,0 L150,0 C120,24 80,55 55,90 C32,118 14,150 0,180 Z" transform={tr} fill={COLORS.moradoOscuro} />
      <Path d="M0,0 L98,0 C85,16 60,35 42,58 C25,82 10,115 0,140 Z" transform={tr} fill={COLORS.doradoClaro} />
      <Path d="M0,0 L55,0 C48,12 32,28 22,45 C12,65 5,90 0,110 Z" transform={tr} fill={COLORS.moradoMedio} />
    </Svg>
  );
}

function DotsPattern() {
  const dots: { cx: number; cy: number }[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      dots.push({ cx: 5 + col * 10, cy: 5 + row * 10 });
    }
  }
  return (
    <Svg viewBox="0 0 80 42" width="80" height="42">
      {dots.map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r={1.4} fill={COLORS.moradoMedio} fillOpacity={0.55} />
      ))}
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="18" height="18">
      <Path d="M5,4 L19,4 C20,4 21,5 21,6 L21,19 C21,20 20,21 19,21 L5,21 C4,21 3,20 3,19 L3,6 C3,5 4,4 5,4 Z" fill="none" stroke={COLORS.morado} strokeWidth={1.5} />
      <Path d="M3,9 L21,9" stroke={COLORS.morado} strokeWidth={1.5} />
      <Path d="M8,2 L8,6 M16,2 L16,6" stroke={COLORS.morado} strokeWidth={1.5} />
    </Svg>
  );
}

function CardIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="14" height="14">
      <Path d="M3,5 L21,5 C22,5 22.5,5.5 22.5,6.5 L22.5,17.5 C22.5,18.5 22,19 21,19 L3,19 C2,19 1.5,18.5 1.5,17.5 L1.5,6.5 C1.5,5.5 2,5 3,5 Z" fill={COLORS.morado} stroke={COLORS.morado} strokeWidth={1} />
      <Circle cx="7" cy="11" r="2.2" fill="#FFFFFF" />
      <Path d="M11,11 L19,11 M11,14 L17,14" stroke="#FFFFFF" strokeWidth={1.2} />
    </Svg>
  );
}

function MedalIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="20" height="20">
      <Path d="M7,2 L17,2 L15,9 L9,9 Z" fill="#FFFFFF" />
      <Circle cx="12" cy="15" r="6" fill="#FFFFFF" stroke={COLORS.dorado} strokeWidth={1.2} />
      <Path d="M12,12 L12.8,14 L15,14.2 L13.3,15.6 L13.8,17.7 L12,16.6 L10.2,17.7 L10.7,15.6 L9,14.2 L11.2,14 Z" fill={COLORS.dorado} />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="13" height="13">
      <Circle cx="12" cy="12" r="10" fill="none" stroke={COLORS.morado} strokeWidth={1.4} />
      <Path d="M2,12 L22,12 M12,2 C16,6 16,18 12,22 C8,18 8,6 12,2 Z" fill="none" stroke={COLORS.morado} strokeWidth={1.4} />
    </Svg>
  );
}

export function CertificadoRegularDocument({ data }: { data: CertificadoRegularPdfData }) {
  const nombreCompleto = `${data.alumnoNombre} ${data.alumnoApellido}`.trim().toUpperCase();
  const rutFmt = formatRut(data.alumnoRut);
  const fechaFmt = formatFecha(data.fechaEmision);
  const numero = data.numeroCertificado ?? data.codigoUnico;

  return (
    <Document
      title={`Certificado Alumno Regular ${nombreCompleto}`}
      author={INSTITUCION_OTEC.nombre}
      creator="Mi Otec"
      producer="Mi Otec"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.cornerTL}><CornerOrnament variant="tl" /></View>
        <View style={styles.cornerTR}><CornerOrnament variant="tr" /></View>
        <View style={styles.cornerBL}><CornerOrnament variant="bl" /></View>
        <View style={styles.cornerBR}><CornerOrnament variant="br" /></View>

        <View style={styles.dotsTR}><DotsPattern /></View>
        <View style={styles.dotsBL}><DotsPattern /></View>

        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src="/certificados/logo-impulsate.png" style={styles.watermark} />

        <View style={styles.contenido}>
          <View style={styles.header}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/certificados/logo-impulsate.png" style={styles.logo} />
            <View style={styles.institucionRow}>
              <View style={styles.institucionLine} />
              <View style={styles.institucionDiamond} />
              <Text style={styles.institucionTexto}>OTEC IMPÚLSATE & EMPRENDE</Text>
              <View style={styles.institucionDiamond} />
              <View style={styles.institucionLine} />
            </View>
          </View>

          <Text style={styles.titulo}>CERTIFICADO</Text>
          <Text style={styles.subtitulo}>DE ALUMNO REGULAR</Text>

          <View style={styles.diamanteRow}>
            <View style={styles.diamanteLine} />
            <View style={styles.diamante} />
            <View style={styles.diamanteLine} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLbl}>Documento Institucional</Text>
            <View style={styles.metaValBox}>
              <Text style={styles.metaVal}>N.°  {numero}</Text>
            </View>
          </View>

          <View style={styles.cuerpo}>
            <Text>
              Por medio del presente, OTEC Impúlsate & Emprende certifica que{" "}
              <Text style={styles.campo}> {nombreCompleto || "—"} </Text>, RUT{" "}
              <Text style={styles.campo}> {rutFmt} </Text>, es alumno(a) regular del programa/curso{" "}
              <Text style={styles.campo}> {data.cursoNombre} </Text>, impartido por{" "}
              <Text style={styles.campo}> {INSTITUCION_OTEC.nombreCorto} </Text>, manteniendo matrícula vigente a la fecha de emisión.
            </Text>
            <Text style={{ marginTop: 12 }}>
              Se extiende el presente certificado a solicitud del interesado(a) para{" "}
              <Text style={styles.campo}> {data.finalidad} </Text>.
            </Text>
          </View>

          <View style={styles.fechaRow}>
            <View style={styles.fechaIconWrap}>
              <CalendarIcon />
            </View>
            <Text style={styles.fechaLbl}>Fecha de emisión:</Text>
            <View style={styles.fechaValBox}>
              <Text style={styles.fechaVal}>{fechaFmt}</Text>
            </View>
          </View>

          <View style={styles.firmaSection}>
            <View style={styles.qrCol}>
              {data.qrDataUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={data.qrDataUrl} style={styles.qr} />
              ) : null}
              <Text style={styles.qrLbl}>Verifica este certificado escaneando el QR</Text>
            </View>
            <View style={styles.firmaCol}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src="/certificados/firma-yoel-labra.png" style={styles.firmaImg} />
              <View style={styles.firmaLinea} />
              <Text style={styles.firmaNombre}>{INSTITUCION_OTEC.director.nombre}</Text>
              <Text style={styles.firmaCargo}>{INSTITUCION_OTEC.director.cargo}</Text>
            </View>
            <View style={styles.timbreCol}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src="/certificados/timbre-otec.png" style={styles.timbre} />
            </View>
          </View>

          <View style={styles.pieWrap}>
            <View style={styles.pieMorado}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.pieIconWrap}><CardIcon /></View>
                <Text style={styles.pieTexto}>RUT {INSTITUCION_OTEC.rut}</Text>
              </View>
              <Text style={styles.pieTexto}>{INSTITUCION_OTEC.registroSence}</Text>
              <Text style={styles.pieTexto}>{INSTITUCION_OTEC.idOtec}</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.pieMedalla}>
              <MedalIcon />
            </View>
          </View>

          <View style={styles.webRow}>
            <View style={styles.webGlobo}><GlobeIcon /></View>
            <Link src={INSTITUCION_OTEC.sitioWebUrl} style={styles.webText}>
              www.{INSTITUCION_OTEC.sitioWeb}
            </Link>
          </View>
        </View>
      </Page>
    </Document>
  );
}
