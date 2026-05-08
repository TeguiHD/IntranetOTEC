export const INSTITUCION_OTEC = {
  nombre: "OTEC IMPÚLSATE & EMPRENDE SPA",
  nombreCorto: "OTEC Impúlsate & Emprende",
  rut: "77.772.874-1",
  registroSence: "Registro SENCE N.° 3968",
  idOtec: "ID OTEC 21183",
  registroInn: "Registro INN A-11391",
  sitioWeb: "impulsatech.cl",
  sitioWebUrl: "https://impulsatech.cl/",
  intranetUrl: "https://intranet.miotecimpulsate.cl",
  director: {
    nombre: "YOEL LABRA YEVENES",
    cargo: "DIRECTOR OTEC",
  },
} as const;

export const registrosInstitucionalesString = (): string =>
  `${INSTITUCION_OTEC.registroSence} · ${INSTITUCION_OTEC.idOtec} · ${INSTITUCION_OTEC.registroInn}`;
