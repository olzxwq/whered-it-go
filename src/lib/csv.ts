// Экспорт в CSV, который русский Excel открывает без «кракозябр»:
// разделитель «;», кодировка UTF-8 с BOM, суммы с запятой.
import type { Expense } from '../data/db';

const BOM = '﻿';

/** Экранируем поле: кавычки, «;» и переносы строк; формулы Excel обезвреживаем апострофом. */
function cell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const amount = (kop: number) => `${Math.floor(kop / 100)},${String(kop % 100).padStart(2, '0')}`;
const date = (iso: string) => iso.split('-').reverse().join('.');

export function expensesToCsv(items: Expense[], name: (id: string | null) => string): string {
  const header = ['Дата', 'Сумма, ₽', 'Категория', 'Источник', 'Карта', 'Название'];
  const rows = [...items]
    .sort((a, b) => a.spentOn.localeCompare(b.spentOn) || a.createdAt - b.createdAt)
    .map((e) => [date(e.spentOn), amount(e.amountKop), name(e.categoryId), name(e.sourceId), e.cardId ? name(e.cardId) : '', e.title ?? '']);
  return BOM + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

/** Скачивание файла. На iPhone откроется просмотр, оттуда — «Поделиться» → «Сохранить в Файлы». */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
