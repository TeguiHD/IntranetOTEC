import { isNull, type SQLWrapper } from "drizzle-orm";

export const activo = <T extends { eliminadoAt: SQLWrapper }>(tabla: T) =>
  isNull(tabla.eliminadoAt);
