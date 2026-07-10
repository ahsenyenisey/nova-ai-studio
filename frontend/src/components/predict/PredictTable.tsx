"use client";

interface Props {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  predictionColumn: string;
  limit?: number;
}

function fmt(value: string | number | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number")
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  return value;
}

/** Toplu tahmin sonuç tablosu (ilk `limit` satır gösterilir). */
export function PredictTable({
  columns,
  rows,
  predictionColumn,
  limit = 100,
}: Props) {
  const shown = rows.slice(0, limit);
  return (
    <div className="overflow-x-auto rounded-xl border border-border-glow">
      <table className="w-full text-left text-sm">
        <thead className="bg-bg-nebula/80 text-xs uppercase tracking-wider text-text-muted">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className={
                  "whitespace-nowrap px-3 py-2 font-medium " +
                  (c === predictionColumn ? "text-primary" : "")
                }
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={i} className="border-t border-border-glow/40">
              {columns.map((c) => (
                <td
                  key={c}
                  className={
                    "whitespace-nowrap px-3 py-2 font-metric " +
                    (c === predictionColumn
                      ? "font-medium text-primary"
                      : "text-text-muted")
                  }
                >
                  {fmt(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
