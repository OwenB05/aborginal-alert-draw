/** Quote-safe CSV download: every cell quoted, CRLF rows, UTF-8 BOM so
 * Excel opens accented names correctly. */
export function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
