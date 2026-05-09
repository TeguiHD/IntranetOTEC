import path from "node:path";

import {
  Circle,
  Document,
  Font,
  Image,
  Link,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import React from "react";

import { sanitizeCertificadoText } from "@/lib/certificados";
import { INSTITUCION_OTEC } from "@/lib/institucion";
import { formatearRut } from "@/lib/rut";

export type CertificadoPdfData = {
  codigoUnico: string;
  tipo: "alumno_regular" | "termino_curso";
  valido: boolean;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  cursoNombre: string | null;
  finalidad: string | null;
  fechaEmision: Date | string | null;
  urlVerificacion: string;
};

const h = React.createElement;
const publicPath = (...segments: string[]) => path.join(process.cwd(), "public", ...segments);

Font.register({
  family: "Lora",
  fonts: [
    { src: publicPath("fonts", "Lora-Regular.ttf"), fontWeight: 400 },
    { src: publicPath("fonts", "Lora-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    { src: publicPath("fonts", "Lora-Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: "Montserrat",
  fonts: [
    { src: publicPath("fonts", "Montserrat-Bold.ttf"), fontWeight: 700 },
    { src: publicPath("fonts", "Montserrat-Black.ttf"), fontWeight: 900 },
  ],
});

const C = {
  dark: "#2A1657",
  purple: "#5F259F",
  purpleSoft: "#8C52FF",
  gold: "#F4B819",
  banner: "#351C61",
  inner: "#E8E0F0",
  diamond: "#D1C4E9",
  fieldBg: "#F3EDF8",
  fieldText: "#4A237A",
  text: "#1A1230",
  textMuted: "#5B5670",
  danger: "#B91C1C",
};

const TIPO_SUBTITULO: Record<CertificadoPdfData["tipo"], string> = {
  alumno_regular: "DE ALUMNO REGULAR",
  termino_curso: "DE TÉRMINO DE CURSO",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: "#FFFFFF",
    fontFamily: "Lora",
    color: C.text,
  },
  innerBorder: {
    position: "absolute",
    top: 35,
    left: 35,
    right: 35,
    bottom: 35,
    borderWidth: 0.6,
    borderColor: C.inner,
    borderStyle: "solid",
    borderRadius: 2,
  },
  diamondL: {
    position: "absolute",
    top: "50%",
    left: 31,
    width: 8,
    height: 8,
    backgroundColor: C.diamond,
    transform: "translateY(-4) rotate(45deg)",
  },
  diamondR: {
    position: "absolute",
    top: "50%",
    right: 31,
    width: 8,
    height: 8,
    backgroundColor: C.diamond,
    transform: "translateY(-4) rotate(45deg)",
  },
  cornerTL: { position: "absolute", top: 0, left: 0, width: 280, height: 280 },
  cornerBR: { position: "absolute", bottom: 0, right: 0, width: 300, height: 300 },
  dotsTR: { position: "absolute", top: 56, right: 50, width: 70, height: 96 },
  watermark: {
    position: "absolute",
    top: 240,
    left: 168,
    width: 260,
    height: 320,
    opacity: 0.04,
  },
  invalidStamp: {
    position: "absolute",
    top: 360,
    left: 96,
    width: 405,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: C.danger,
    borderStyle: "solid",
    transform: "rotate(-18deg)",
    opacity: 0.22,
  },
  invalidStampText: {
    fontFamily: "Montserrat",
    fontWeight: 900,
    fontSize: 34,
    color: C.danger,
    textAlign: "center",
    letterSpacing: 3,
  },
  contenido: {
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 72,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  logoImg: {
    width: 200,
    height: 70,
    objectFit: "contain",
  },
  institLine: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 10.5,
    color: C.purple,
    textAlign: "center",
    letterSpacing: 3,
    marginTop: 4,
  },
  titulo: {
    fontFamily: "Lora",
    fontWeight: 700,
    fontSize: 42,
    color: C.dark,
    textAlign: "center",
    letterSpacing: 6,
    marginTop: 12,
  },
  subtitulo: {
    fontFamily: "Lora",
    fontWeight: 700,
    fontSize: 20,
    color: C.dark,
    textAlign: "center",
    letterSpacing: 4,
    marginTop: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 8,
  },
  divLine: { width: 80, height: 1, backgroundColor: C.gold },
  divDiamond: { width: 7, height: 7, backgroundColor: C.gold, transform: "rotate(45deg)" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 0.6,
    borderBottomColor: "#F1F1F4",
    borderBottomStyle: "solid",
  },
  metaLbl: {
    fontFamily: "Lora",
    fontStyle: "italic",
    fontSize: 13,
    color: C.dark,
  },
  metaNum: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.8,
    borderBottomColor: C.dark,
    borderBottomStyle: "solid",
    paddingBottom: 1,
    gap: 4,
  },
  metaNumLbl: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 12,
    color: C.dark,
  },
  metaNumVal: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 12,
    color: C.dark,
    letterSpacing: 0.6,
  },
  statusPill: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#ECFDF3",
  },
  statusPillInvalid: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 8,
    color: "#166534",
    letterSpacing: 0.4,
  },
  statusTextInvalid: {
    color: C.danger,
  },
  body: {
    marginTop: 14,
    fontFamily: "Lora",
    fontSize: 11.5,
    lineHeight: 1.65,
    color: "#2A2436",
  },
  bodyP: { marginBottom: 6 },
  field: {
    backgroundColor: C.fieldBg,
    color: C.fieldText,
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 11.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    letterSpacing: 0.4,
  },
  bottomRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  qrBlock: {
    width: 140,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 14,
  },
  qrBox: {
    width: 86,
    height: 86,
    backgroundColor: "#FFFFFF",
    padding: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.purpleSoft,
    borderStyle: "solid",
  },
  qrImg: { width: "100%", height: "100%" },
  fechaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fechaIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderStyle: "solid",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fechaLabelText: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 10,
    color: C.dark,
  },
  fechaValBox: {
    backgroundColor: C.fieldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  fechaVal: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 11,
    color: C.fieldText,
    letterSpacing: 0.3,
  },
  firmaCol: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 6,
  },
  firmaImg: {
    width: 170,
    height: 70,
    objectFit: "contain",
    marginBottom: -12,
  },
  firmaLineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 220,
    marginBottom: 6,
  },
  firmaLine: { flex: 1, height: 0.8, backgroundColor: C.dark },
  firmaDot: {
    width: 6,
    height: 6,
    backgroundColor: C.dark,
    transform: "rotate(45deg)",
    marginHorizontal: 4,
  },
  firmaNombre: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 12,
    color: C.dark,
    letterSpacing: 0.5,
  },
  firmaCargo: {
    fontFamily: "Lora",
    fontSize: 10,
    color: C.dark,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  selloBox: {
    width: 130,
    alignItems: "center",
  },
  sello: {
    width: 122,
    height: 122,
    objectFit: "contain",
  },
  banner: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: C.banner,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  bannerSep: {
    color: C.gold,
    fontFamily: "Montserrat",
    fontWeight: 400,
    fontSize: 11,
  },
  webRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  webText: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 11,
    color: C.dark,
    textDecoration: "none",
    letterSpacing: 0.4,
  },
});

const safeText = (value: unknown, fallback: string, maxLength = 140): string =>
  sanitizeCertificadoText(value, maxLength) ?? fallback;

const formatRutValue = (rut: string | null): string => {
  if (!rut) return "—";
  if (rut.startsWith("EXT-")) return `Ext: ${rut.replace(/^EXT-/, "")}`;

  try {
    return formatearRut(rut);
  } catch {
    return rut;
  }
};

const formatDateValue = (value: Date | string | null): string => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const CornerTopLeft = () =>
  h(
    Svg,
    { viewBox: "0 0 400 400", width: "280", height: "280" },
    h(Path, { d: "M0 0 L350 0 C180 30 80 180 0 380 Z", fill: C.dark }),
    h(Path, { d: "M0 0 L290 0 C150 20 50 150 0 300 Z", fill: "#FFFFFF" }),
    h(Path, { d: "M0 0 L260 0 C130 15 40 130 0 270 Z", fill: C.gold }),
    h(Path, { d: "M0 0 L220 0 C110 10 30 110 0 230 Z", fill: "#FFFFFF" }),
    h(Path, { d: "M0 0 L190 0 C90 5 20 90 0 190 Z", fill: C.dark }),
  );

const CornerBottomRight = () =>
  h(
    Svg,
    { viewBox: "0 0 400 400", width: "300", height: "300" },
    h(Path, { d: "M400 400 L0 400 C220 370 320 220 400 20 Z", fill: C.dark }),
    h(Path, { d: "M400 400 L60 400 C250 380 350 250 400 100 Z", fill: "#FFFFFF" }),
    h(Path, { d: "M400 400 L90 400 C270 385 370 270 400 130 Z", fill: C.gold }),
    h(Path, { d: "M400 400 L140 400 C290 390 380 290 400 170 Z", fill: "#FFFFFF" }),
    h(Path, { d: "M400 400 L170 400 C310 395 390 310 400 210 Z", fill: C.dark }),
    h(Path, { d: "M400 400 L250 400 C350 398 400 350 400 280 Z", fill: C.purpleSoft }),
  );

const DotsPattern = () => {
  const dots = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      dots.push(
        h(Circle, {
          key: `${row}-${col}`,
          cx: 4 + col * 12,
          cy: 4 + row * 12,
          r: 1.5,
          fill: C.dark,
          fillOpacity: 0.85,
        }),
      );
    }
  }

  return h(Svg, { viewBox: "0 0 70 96", width: "70", height: "96" }, ...dots);
};

const CalendarIcon = () =>
  h(
    Svg,
    { viewBox: "0 0 24 24", width: "16", height: "16" },
    h(Rect, { x: 3, y: 5, width: 18, height: 16, rx: 2, fill: "none", stroke: C.dark, strokeWidth: 1.5 }),
    h(Path, { d: "M3 10 L21 10", stroke: C.dark, strokeWidth: 1.5 }),
    h(Path, { d: "M8 3 L8 7 M16 3 L16 7", stroke: C.dark, strokeWidth: 1.5, strokeLinecap: "round" }),
    h(Circle, { cx: 8, cy: 14, r: 1.2, fill: C.dark }),
    h(Circle, { cx: 12, cy: 14, r: 1.2, fill: C.dark }),
    h(Circle, { cx: 16, cy: 14, r: 1.2, fill: C.dark }),
    h(Circle, { cx: 8, cy: 18, r: 1.2, fill: C.dark }),
    h(Circle, { cx: 12, cy: 18, r: 1.2, fill: C.dark }),
    h(Circle, { cx: 16, cy: 18, r: 1.2, fill: C.dark }),
  );

const CardIcon = () =>
  h(
    Svg,
    { viewBox: "0 0 24 24", width: "14", height: "14" },
    h(Rect, { x: 3, y: 6, width: 18, height: 12, rx: 2, fill: "none", stroke: C.gold, strokeWidth: 1.5 }),
    h(Circle, { cx: 8, cy: 11, r: 2, fill: "none", stroke: C.gold, strokeWidth: 1.5 }),
    h(Path, { d: "M14 10 L18 10 M14 14 L18 14", stroke: C.gold, strokeWidth: 1.5, strokeLinecap: "round" }),
    h(Path, { d: "M5 16 C 6.5 14.5, 9.5 14.5, 11 16", stroke: C.gold, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" }),
  );

const MedalIcon = () =>
  h(
    Svg,
    { viewBox: "0 0 24 24", width: "14", height: "14" },
    h(Circle, { cx: 12, cy: 8, r: 4, fill: "none", stroke: C.gold, strokeWidth: 1.5 }),
    h(Path, {
      d: "M9.5 11.5 L7 20 L12 18 L17 20 L14.5 11.5",
      fill: "none",
      stroke: C.gold,
      strokeWidth: 1.5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    }),
  );

const GlobeIcon = () =>
  h(
    Svg,
    { viewBox: "0 0 24 24", width: "13", height: "13" },
    h(Circle, { cx: 12, cy: 12, r: 10, fill: "none", stroke: C.gold, strokeWidth: 1.6 }),
    h(Path, { d: "M2 12 L22 12", stroke: C.gold, strokeWidth: 1.6 }),
    h(Path, {
      d: "M12 2 C 16 6 16 18 12 22 C 8 18 8 6 12 2 Z",
      fill: "none",
      stroke: C.gold,
      strokeWidth: 1.6,
    }),
  );

const CertificateBody = ({
  data,
  nombreCompleto,
  cursoNombre,
  finalidad,
  fechaFmt,
}: {
  data: CertificadoPdfData;
  nombreCompleto: string;
  cursoNombre: string;
  finalidad: string;
  fechaFmt: string;
}) => {
  const rutFmt = formatRutValue(data.alumnoRut);

  if (data.tipo === "termino_curso") {
    return h(
      View,
      { style: styles.body },
      h(
        Text,
        { style: styles.bodyP },
        "Por medio del presente, OTEC Impúlsate & Emprende certifica que ",
        h(Text, { style: styles.field }, nombreCompleto || "—"),
        ", RUT ",
        h(Text, { style: styles.field }, rutFmt),
        ", registra participación asociada al programa/curso ",
        h(Text, { style: styles.field }, cursoNombre),
        ", impartido por ",
        h(Text, { style: styles.field }, INSTITUCION_OTEC.nombreCorto),
        ".",
      ),
      h(
        Text,
        { style: [styles.bodyP, { marginTop: 10 }] },
        "Este documento fue emitido con fecha ",
        h(Text, { style: styles.field }, fechaFmt),
        " y puede verificarse con su código único institucional.",
      ),
    );
  }

  return h(
    View,
    { style: styles.body },
    h(
      Text,
      { style: styles.bodyP },
      "Por medio del presente, OTEC Impúlsate & Emprende certifica que ",
      h(Text, { style: styles.field }, nombreCompleto || "—"),
      ", RUT ",
      h(Text, { style: styles.field }, rutFmt),
      ", es alumno(a) regular del programa/curso ",
      h(Text, { style: styles.field }, cursoNombre),
      ", impartido por ",
      h(Text, { style: styles.field }, INSTITUCION_OTEC.nombreCorto),
      ", manteniendo matrícula vigente a la fecha de emisión.",
    ),
    h(
      Text,
      { style: [styles.bodyP, { marginTop: 10 }] },
      "Se extiende el presente certificado a solicitud del interesado(a) para ",
      h(Text, { style: styles.field }, finalidad),
      ".",
    ),
  );
};

function CertificadoDocument({
  data,
  qrDataUrl,
}: {
  data: CertificadoPdfData;
  qrDataUrl: string;
}) {
  const alumnoNombre = safeText(data.alumnoNombre, "Alumno", 120);
  const alumnoApellido = safeText(data.alumnoApellido, "", 120);
  const nombreCompleto = `${alumnoNombre} ${alumnoApellido}`.trim().toUpperCase();
  const cursoNombre = safeText(data.cursoNombre, "No informado", 200);
  const finalidad = safeText(data.finalidad, "fines particulares", 140);
  const codigoUnico = safeText(data.codigoUnico, "codigo-no-disponible", 64);
  const fechaFmt = formatDateValue(data.fechaEmision);
  const subtitulo = TIPO_SUBTITULO[data.tipo] ?? "INSTITUCIONAL";
  const statusPillStyle = data.valido
    ? styles.statusPill
    : [styles.statusPill, styles.statusPillInvalid];
  const statusTextStyle = data.valido
    ? styles.statusText
    : [styles.statusText, styles.statusTextInvalid];

  return h(
    Document,
    {
      title: `Certificado ${codigoUnico}`,
      author: INSTITUCION_OTEC.nombre,
      creator: "Mi Otec",
      producer: "Mi Otec",
    },
    h(
      Page,
      { size: "A4", style: styles.page },
      h(View, { style: styles.innerBorder }),
      h(View, { style: styles.diamondL }),
      h(View, { style: styles.diamondR }),
      h(View, { style: styles.cornerTL }, h(CornerTopLeft)),
      h(View, { style: styles.dotsTR }, h(DotsPattern)),
      h(View, { style: styles.cornerBR }, h(CornerBottomRight)),
      h(Image, { src: publicPath("certificados", "logo-impulsate.png"), style: styles.watermark }),
      !data.valido
        ? h(View, { style: styles.invalidStamp }, h(Text, { style: styles.invalidStampText }, "INVALIDADO"))
        : null,
      h(
        View,
        { style: styles.contenido },
        h(View, { style: styles.headerRow }, h(Image, { src: publicPath("certificados", "logo-impulsate.png"), style: styles.logoImg })),
        h(Text, { style: styles.institLine }, "OTEC IMPÚLSATE & EMPRENDE"),
        h(Text, { style: styles.titulo }, "CERTIFICADO"),
        h(Text, { style: styles.subtitulo }, subtitulo),
        h(
          View,
          { style: styles.divider },
          h(View, { style: styles.divLine }),
          h(View, { style: styles.divDiamond }),
          h(View, { style: styles.divLine }),
        ),
        h(
          View,
          { style: styles.metaRow },
          h(Text, { style: styles.metaLbl }, "Documento Institucional"),
          h(
            View,
            { style: styles.metaNum },
            h(Text, { style: styles.metaNumLbl }, "N.°"),
            h(Text, { style: styles.metaNumVal }, codigoUnico),
            h(
              View,
              { style: statusPillStyle },
              h(Text, { style: statusTextStyle }, data.valido ? "VÁLIDO" : "INVALIDADO"),
            ),
          ),
        ),
        h(CertificateBody, { data, nombreCompleto, cursoNombre, finalidad, fechaFmt }),
        h(
          View,
          { style: styles.bottomRow },
          h(
            View,
            { style: styles.qrBlock },
            h(View, { style: styles.qrBox }, h(Image, { src: qrDataUrl, style: styles.qrImg })),
            h(
              View,
              { style: styles.fechaRow },
              h(View, { style: styles.fechaIcon }, h(CalendarIcon)),
              h(
                View,
                null,
                h(Text, { style: styles.fechaLabelText }, "Fecha de emisión"),
                h(View, { style: styles.fechaValBox }, h(Text, { style: styles.fechaVal }, fechaFmt)),
              ),
            ),
          ),
          h(
            View,
            { style: styles.firmaCol },
            h(Image, { src: publicPath("certificados", "firma-yoel-labra.png"), style: styles.firmaImg }),
            h(
              View,
              { style: styles.firmaLineRow },
              h(View, { style: styles.firmaLine }),
              h(View, { style: styles.firmaDot }),
              h(View, { style: styles.firmaLine }),
            ),
            h(Text, { style: styles.firmaNombre }, INSTITUCION_OTEC.director.nombre),
            h(Text, { style: styles.firmaCargo }, INSTITUCION_OTEC.director.cargo),
          ),
          h(View, { style: styles.selloBox }, h(Image, { src: publicPath("certificados", "timbre-otec.png"), style: styles.sello })),
        ),
        h(
          View,
          { style: styles.banner },
          h(CardIcon),
          h(Text, { style: styles.bannerText }, `RUT ${INSTITUCION_OTEC.rut}`),
          h(Text, { style: styles.bannerSep }, "|"),
          h(Text, { style: styles.bannerText }, INSTITUCION_OTEC.registroSence),
          h(Text, { style: styles.bannerSep }, "|"),
          h(Text, { style: styles.bannerText }, INSTITUCION_OTEC.idOtec),
          h(MedalIcon),
        ),
        h(
          View,
          { style: styles.webRow },
          h(GlobeIcon),
          h(Link, { src: INSTITUCION_OTEC.sitioWebUrl, style: styles.webText }, `www.${INSTITUCION_OTEC.sitioWeb}`),
        ),
      ),
    ),
  );
}

export async function renderCertificadoPdf(data: CertificadoPdfData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(data.urlVerificacion, {
    margin: 1,
    width: 320,
    color: { dark: "#1F1B2E", light: "#FFFFFF" },
  });

  const document = h(CertificadoDocument, { data, qrDataUrl }) as Parameters<
    typeof renderToBuffer
  >[0];

  return renderToBuffer(document);
}
