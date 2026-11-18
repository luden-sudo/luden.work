import { createHash } from "node:crypto";
import { emptyManagement, type ManagementData } from "./management";

export type ImportRow = {
  source_key: string;
  data: ManagementData;
  duplicate: boolean;
  selected: boolean;
};
/** Read source cells without evaluating formulas or inferring ambiguous business states. */
export async function previewWorkbook(
  buffer: ArrayBuffer,
): Promise<ImportRow[]> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  const signature = createHash("sha256")
    .update(Buffer.from(buffer))
    .digest("hex")
    .slice(0, 20);
  const text = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "object") {
      const v = value as {
        text?: string;
        richText?: { text: string }[];
        formula?: string;
        result?: unknown;
      };
      if (v.formula) return v.result === undefined ? "" : text(v.result);
      return String(
        v.text ||
        v.richText?.map((t) => t.text).join("") ||
        JSON.stringify(value)
      ).trim();
    }
    return String(value).trim();
  };
  const amount = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  for (const sheet of workbook.worksheets) {
    if (/scantap/i.test(sheet.name)) continue;
    const old = ["Marzo  Abril", "Abril  Mayo"].includes(sheet.name);
    const bonus = /^Bono\s*-/i.test(sheet.name),
      friends = /amigos/i.test(sheet.name);
    if (
      !old &&
      !bonus &&
      !friends &&
      !["Junio  Julio", "Agosto", "Septiembre  Octubre"].includes(sheet.name)
    )
      continue;
    const labelCol = old ? 1 : bonus ? 4 : 3;
    const costCol = old ? 3 : bonus ? 6 : 7,
      priceCol = old ? 4 : bonus ? 7 : 8;
    sheet.eachRow((row, index) => {
      if (index < (old ? 3 : 8)) return;
      const model = text(row.getCell(labelCol).value);
      if (!model || /^\s*=/.test(model)) return;
      const data = emptyManagement(
        bonus ? "bonos" : friends ? "amigos" : "ventas",
      );
      data.model = model;
      data.tracking='Por revisar';data.sale='Por revisar';
      data.cost = amount(row.getCell(costCol).value);
      data.price = amount(row.getCell(priceCol).value);
      if (bonus) {
        data.person = text(row.getCell(2).value);
      } else if (old) {
        data.size = text(row.getCell(2).value);
      } else {
        data.color = friends ? "" : text(row.getCell(4).value);
        data.size = text(row.getCell(5).value);
        data.email = text(row.getCell(6).value);
        data.person = friends ? text(row.getCell(4).value) : "";
      }
      const original: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        original[String(col)] = cell.value;
      });
      data.original = original;
      data.source_sheet = sheet.name;
      data.source_row = index;
      data.warnings = [
        "Histórico: importado sin pagos ni cobros. Confirma los importes y estados.",
      ];
      const status = text(row.getCell(old ? 6 : bonus ? 11 : 12).value),
        incident = bonus ? "" : text(row.getCell(13).value);
      if (status || incident)
        data.warnings.push(
          `Estado original: ${[status, incident].filter(Boolean).join(" · ")}`,
        );
      if (data.size && friends)
        data.warnings.push(
          "Color y talla originales conservados juntos; revisa su separación.",
        );
      // ScanTap has unit costs with >2 decimals; it is intentionally excluded.
      if ([data.cost, data.price].some((v) => Math.round(v * 100) !== v * 100))
        data.warnings.push("Importe original con más de dos decimales.");
      data.cost = Math.round(data.cost * 100) / 100;
      data.price = Math.round(data.price * 100) / 100;
      const key = [
        data.activity,
        model.toLowerCase(),
        data.color.toLowerCase(),
        data.size.toLowerCase(),
        data.person.toLowerCase(),
        data.email.toLowerCase(),
      ].join("|");
      const duplicate = seen.has(key);
      seen.add(key);
      rows.push({
        source_key: `xlsx:${signature}:${sheet.name}:${index}`,
        data,
        duplicate,
        selected: true,
      });
    });
  }
  if (rows.length > 2000)
    throw new Error(
      "El archivo supera las 2.000 fichas. Divide la importación.",
    );
  if (!rows.length)
    throw new Error("No se encontraron fichas en las pestañas compatibles.");
  return rows;
}
