/** Satırları CSV'ye çevirir ve tarayıcıda indirir (toplu tahmin sonucu için). */

type Cell = string | number | null;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(
  columns: string[],
  rows: Array<Record<string, Cell>>,
): string {
  const header = columns.map(escapeCell).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM ekle → Excel Türkçe karakterleri doğru açsın.
  const blob = new Blob(["﻿", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
