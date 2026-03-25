// ----------------------------------------------------------------
// PREGUNTAS FIJAS – Evaluación Docente y OTEC (escala 1-7)
// ----------------------------------------------------------------
export const PREGUNTAS_DOCENTE = [
  "El docente demuestra dominio de los contenidos impartidos.",
  "Explica los temas de manera clara y comprensible.",
  "Fomenta la participación y el interés en la clase.",
  "Mantiene una actitud respetuosa y profesional.",
  "Responde adecuadamente a dudas y consultas.",
  "Utiliza metodologías adecuadas para facilitar el aprendizaje.",
] as const;

export const PREGUNTAS_OTEC = [
  "La organización del curso fue adecuada.",
  "Los contenidos del curso cumplen con mis expectativas.",
  "Los recursos y materiales entregados fueron útiles.",
  "La comunicación e información entregada fue clara y oportuna.",
  "La infraestructura o plataforma utilizada fue adecuada.",
  "Estoy satisfecho/a con la calidad general del servicio entregado por la OTEC.",
] as const;

// ----------------------------------------------------------------
// PREGUNTAS FIJAS – Test de Estilos de Aprendizaje (escala 1-5)
// ----------------------------------------------------------------
export const PREGUNTAS_VISUAL = [
  "Me resulta más fácil aprender cuando veo imágenes, gráficos o videos.",
  "Prefiero que me expliquen con esquemas o presentaciones.",
  "Recuerdo mejor lo que leo que lo que escucho.",
  "Me ayudan los colores, mapas conceptuales o dibujos para estudiar.",
  "Me gusta tomar apuntes ordenados y visuales.",
] as const;

export const PREGUNTAS_AUDITIVO = [
  "Aprendo mejor cuando escucho explicaciones en voz alta.",
  "Prefiero que me expliquen los temas verbalmente antes que leerlos.",
  "Recuerdo mejor lo que escucho que lo que leo.",
  "Me ayuda repetir en voz alta la información para memorizarla.",
  "Disfruto participar en debates o discusiones grupales para aprender.",
] as const;

export const PREGUNTAS_KINESTESICO = [
  "Aprendo mejor cuando puedo experimentar o practicar directamente.",
  "Prefiero actividades prácticas o dinámicas en lugar de solo escuchar.",
  "Me resulta difícil estar quieto/a mucho tiempo cuando estoy aprendiendo.",
  "Recuerdo mejor lo que hice que lo que leí o escuché.",
  "Necesito moverme o manipular objetos para entender mejor un concepto.",
] as const;
