export function normalizarRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function formatearRut(value: string): string {
  const cleaned = normalizarRut(value);

  if (cleaned.length <= 1) {
    return cleaned;
  }

  const dv = cleaned.slice(-1);
  const body = cleaned
    .slice(0, -1)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${body}-${dv}`;
}

export function validarRut(value: string): boolean {
  const cleaned = normalizarRut(value);

  if (cleaned.length < 8 || cleaned.length > 9) {
    return false;
  }

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);

  if (!/^\d+$/.test(body)) {
    return false;
  }

  let sum = 0;
  let multiplier = 2;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }

  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);

  return dv === expectedDv;
}