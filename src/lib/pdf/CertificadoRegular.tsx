"use client";

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
} from "@react-pdf/renderer";

import { INSTITUCION_OTEC } from "@/lib/institucion";
import { formatearRut } from "@/lib/rut";

// Fuentes embebidas — sirve same-origin desde /public/fonts en cliente
Font.register({
  family: "Lora",
  fonts: [
    { src: "/fonts/Lora-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Lora-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/Lora-Bold.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Montserrat",
  fonts: [
    { src: "/fonts/Montserrat-Bold.ttf", fontWeight: 700 },
    { src: "/fonts/Montserrat-Black.ttf", fontWeight: 900 },
  ],
});

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

const C = {
  dark: "#2A1657",
  purple: "#5F259F",
  purpleSoft: "#8C52FF",
  gold: "#F4B819",
  goldSoft: "#FDE6B0",
  banner: "#351C61",
  inner: "#E8E0F0",
  diamond: "#D1C4E9",
  fieldBg: "#F3EDF8",
  fieldText: "#4A237A",
  text: "#1A1230",
  textMuted: "#5B5670",
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
  dotsTR: { position: "absolute", top: 56, right: 50, width: 70, height: 90 },
  watermark: {
    position: "absolute",
    top: 240,
    left: 168,
    width: 260,
    height: 320,
    opacity: 0.04,
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
  qrCaption: {
    fontFamily: "Lora",
    fontStyle: "italic",
    fontSize: 7,
    color: C.textMuted,
    marginTop: 4,
    width: 100,
    textAlign: "center",
  },
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

function CornerTopLeft() {
  return (
    <Svg viewBox="0 0 400 400" width="280" height="280">
      <Path d="M0 0 L350 0 C180 30 80 180 0 380 Z" fill={C.dark} />
      <Path d="M0 0 L290 0 C150 20 50 150 0 300 Z" fill="#FFFFFF" />
      <Path d="M0 0 L260 0 C130 15 40 130 0 270 Z" fill={C.gold} />
      <Path d="M0 0 L220 0 C110 10 30 110 0 230 Z" fill="#FFFFFF" />
      <Path d="M0 0 L190 0 C90 5 20 90 0 190 Z" fill={C.dark} />
    </Svg>
  );
}

function CornerBottomRight() {
  return (
    <Svg viewBox="0 0 400 400" width="300" height="300">
      <Path d="M400 400 L0 400 C220 370 320 220 400 20 Z" fill={C.dark} />
      <Path d="M400 400 L60 400 C250 380 350 250 400 100 Z" fill="#FFFFFF" />
      <Path d="M400 400 L90 400 C270 385 370 270 400 130 Z" fill={C.gold} />
      <Path d="M400 400 L140 400 C290 390 380 290 400 170 Z" fill="#FFFFFF" />
      <Path d="M400 400 L170 400 C310 395 390 310 400 210 Z" fill={C.dark} />
      <Path d="M400 400 L250 400 C350 398 400 350 400 280 Z" fill={C.purpleSoft} />
    </Svg>
  );
}

function DotsPattern() {
  const dots: { cx: number; cy: number }[] = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 6; c += 1) {
      dots.push({ cx: 4 + c * 12, cy: 4 + r * 12 });
    }
  }
  return (
    <Svg viewBox="0 0 70 96" width="70" height="96">
      {dots.map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r={1.5} fill={C.dark} fillOpacity={0.85} />
      ))}
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="16" height="16">
      <Rect x={3} y={5} width={18} height={16} rx={2} fill="none" stroke={C.dark} strokeWidth={1.5} />
      <Path d="M3 10 L21 10" stroke={C.dark} strokeWidth={1.5} />
      <Path d="M8 3 L8 7 M16 3 L16 7" stroke={C.dark} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={8} cy={14} r={1.2} fill={C.dark} />
      <Circle cx={12} cy={14} r={1.2} fill={C.dark} />
      <Circle cx={16} cy={14} r={1.2} fill={C.dark} />
      <Circle cx={8} cy={18} r={1.2} fill={C.dark} />
      <Circle cx={12} cy={18} r={1.2} fill={C.dark} />
      <Circle cx={16} cy={18} r={1.2} fill={C.dark} />
    </Svg>
  );
}

function CardIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="14" height="14">
      <Rect x={3} y={6} width={18} height={12} rx={2} fill="none" stroke={C.gold} strokeWidth={1.5} />
      <Circle cx={8} cy={11} r={2} fill="none" stroke={C.gold} strokeWidth={1.5} />
      <Path d="M14 10 L18 10 M14 14 L18 14" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M5 16 C 6.5 14.5, 9.5 14.5, 11 16" stroke={C.gold} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function MedalIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="14" height="14">
      <Circle cx={12} cy={8} r={4} fill="none" stroke={C.gold} strokeWidth={1.5} />
      <Path d="M9.5 11.5 L7 20 L12 18 L17 20 L14.5 11.5" fill="none" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="13" height="13">
      <Circle cx={12} cy={12} r={10} fill="none" stroke={C.gold} strokeWidth={1.6} />
      <Path d="M2 12 L22 12" stroke={C.gold} strokeWidth={1.6} />
      <Path d="M12 2 C 16 6 16 18 12 22 C 8 18 8 6 12 2 Z" fill="none" stroke={C.gold} strokeWidth={1.6} />
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
        {/* Marco interior + rombos laterales */}
        <View style={styles.innerBorder} />
        <View style={styles.diamondL} />
        <View style={styles.diamondR} />

        {/* Esquinas decorativas */}
        <View style={styles.cornerTL}><CornerTopLeft /></View>
        <View style={styles.dotsTR}><DotsPattern /></View>
        <View style={styles.cornerBR}><CornerBottomRight /></View>

        {/* Watermark */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src="/certificados/logo-impulsate.png" style={styles.watermark} />

        <View style={styles.contenido}>
          {/* Logo */}
          <View style={styles.headerRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/certificados/logo-impulsate.png" style={styles.logoImg} />
          </View>

          {/* OTEC IMPÚLSATE & EMPRENDE */}
          <Text style={styles.institLine}>OTEC IMPÚLSATE &amp; EMPRENDE</Text>

          {/* Título */}
          <Text style={styles.titulo}>CERTIFICADO</Text>
          <Text style={styles.subtitulo}>DE ALUMNO REGULAR</Text>

          {/* Divider dorado */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <View style={styles.divDiamond} />
            <View style={styles.divLine} />
          </View>

          {/* Documento Institucional / N° */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLbl}>Documento Institucional</Text>
            <View style={styles.metaNum}>
              <Text style={styles.metaNumLbl}>N.°</Text>
              <Text style={styles.metaNumVal}>{numero}</Text>
            </View>
          </View>

          {/* Cuerpo */}
          <View style={styles.body}>
            <Text style={styles.bodyP}>
              Por medio del presente, OTEC Impúlsate &amp; Emprende certifica que{" "}
              <Text style={styles.field}>{nombreCompleto || "—"}</Text>, RUT{" "}
              <Text style={styles.field}>{rutFmt}</Text>, es alumno(a) regular del programa/curso{" "}
              <Text style={styles.field}>{data.cursoNombre}</Text>, impartido por{" "}
              <Text style={styles.field}>{INSTITUCION_OTEC.nombreCorto}</Text>, manteniendo matrícula vigente a la fecha de emisión.
            </Text>
            <Text style={[styles.bodyP, { marginTop: 10 }]}>
              Se extiende el presente certificado a solicitud del interesado(a) para{" "}
              <Text style={styles.field}>{data.finalidad}</Text>.
            </Text>
          </View>

          {/* Bottom row: QR+Fecha · Firma · Sello */}
          <View style={styles.bottomRow}>
            <View style={styles.qrBlock}>
              <View style={styles.qrBox}>
                {data.qrDataUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={data.qrDataUrl} style={styles.qrImg} />
                ) : null}
              </View>
              <View style={styles.fechaRow}>
                <View style={styles.fechaIcon}><CalendarIcon /></View>
                <View>
                  <Text style={styles.fechaLabelText}>Fecha de emisión</Text>
                  <View style={styles.fechaValBox}>
                    <Text style={styles.fechaVal}>{fechaFmt}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.firmaCol}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src="/certificados/firma-yoel-labra.png" style={styles.firmaImg} />
              <View style={styles.firmaLineRow}>
                <View style={styles.firmaLine} />
                <View style={styles.firmaDot} />
                <View style={styles.firmaLine} />
              </View>
              <Text style={styles.firmaNombre}>{INSTITUCION_OTEC.director.nombre}</Text>
              <Text style={styles.firmaCargo}>{INSTITUCION_OTEC.director.cargo}</Text>
            </View>

            <View style={styles.selloBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src="/certificados/timbre-otec.png" style={styles.sello} />
            </View>
          </View>

          {/* Banner pill */}
          <View style={styles.banner}>
            <CardIcon />
            <Text style={styles.bannerText}>RUT {INSTITUCION_OTEC.rut}</Text>
            <Text style={styles.bannerSep}>|</Text>
            <Text style={styles.bannerText}>{INSTITUCION_OTEC.registroSence}</Text>
            <Text style={styles.bannerSep}>|</Text>
            <Text style={styles.bannerText}>{INSTITUCION_OTEC.idOtec}</Text>
            <MedalIcon />
          </View>

          {/* Web row */}
          <View style={styles.webRow}>
            <GlobeIcon />
            <Link src={INSTITUCION_OTEC.sitioWebUrl} style={styles.webText}>
              www.{INSTITUCION_OTEC.sitioWeb}
            </Link>
          </View>
        </View>
      </Page>
    </Document>
  );
}
