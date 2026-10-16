// Деньги храним в копейках целым числом: так не бывает ошибок округления.

const MAX_KOP = 100_000_000_00; // 100 млн ₽ — защита от случайно лишних нулей

/** «1 250,50» → 125050. Возвращает null, если ввод некорректный или сумма ≤ 0. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[\s  ₽]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [rub, kop = ''] = s.split('.');
  const total = Number(rub) * 100 + Number((kop + '00').slice(0, 2));
  if (!Number.isSafeInteger(total) || total <= 0 || total > MAX_KOP) return null;
  return total;
}

/** 125050 → «1 250,50 ₽», 125000 → «1 250 ₽». Пробелы неразрывные, чтобы сумма не переносилась. */
export function formatRub(kop: number): string {
  const sign = kop < 0 ? '−' : '';
  const abs = Math.abs(kop);
  const rub = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const rest = abs % 100;
  const body = rest ? `${rub},${String(rest).padStart(2, '0')}` : rub;
  return `${sign}${body} ₽`;
}

/** 125050 → «1250,50» — для подстановки в поле ввода при редактировании. */
export function kopToInput(kop: number): string {
  const rub = Math.floor(kop / 100);
  const rest = kop % 100;
  return rest ? `${rub},${String(rest).padStart(2, '0')}` : String(rub);
}
