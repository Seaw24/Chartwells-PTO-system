// Escape quotes/newlines and keep spreadsheet software from interpreting cells as formulas.
export function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
