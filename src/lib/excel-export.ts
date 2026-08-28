import ExcelJS from "exceljs";
import type { ExportPayload } from "./types.ts";
import {
  buildDoctorTotals,
  buildExportSummary,
  buildJournalRows,
  buildWorkTotals,
  formatJournalDate,
  type ExcelCopy,
} from "./backup-format.ts";

const INK = "111111";
const MUTED = "6B6B6B";
const LINE = "E5E5E7";
const ZEBRA = "F7F7F8";
const PAPER = "FFFFFF";
const MONEY = '#,##0.00';

function moneyHeader(label: string, currency: ExcelCopy["currency"]): string {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₽";
  return `${label}, ${symbol}`;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${INK}` } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 22;
}

function styleBody(sheet: ExcelJS.Worksheet, from: number, to: number, moneyCols: number[]) {
  for (let i = from; i <= to; i += 1) {
    const row = sheet.getRow(i);
    row.font = { name: "Calibri", size: 11, color: { argb: `FF${INK}` } };
    row.alignment = { vertical: "middle" };
    if (i % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ZEBRA}` } };
    }
    for (const col of moneyCols) {
      row.getCell(col).numFmt = MONEY;
    }
  }
}

function addTotalRow(
  sheet: ExcelJS.Worksheet,
  values: Array<string | number>,
  moneyCols: number[],
) {
  const row = sheet.addRow(values);
  row.font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${INK}` } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEF0" } };
  for (const col of moneyCols) row.getCell(col).numFmt = MONEY;
  return row;
}

function autoFilter(sheet: ExcelJS.Worksheet, cols: number, lastDataRow: number) {
  if (lastDataRow < 1) return;
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, lastDataRow), column: cols },
  };
  sheet.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
}

export async function buildWorkbookBase64(
  data: ExportPayload["data"],
  copy: ExcelCopy,
  month?: string,
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Atelier";
  workbook.lastModifiedBy = "Atelier";
  workbook.created = new Date();
  workbook.modified = new Date();

  const journal = buildJournalRows(data);
  const doctors = buildDoctorTotals(data);
  const works = buildWorkTotals(data);
  const summary = buildExportSummary(data, month, copy.language);

  const journalSheet = workbook.addWorksheet(copy.journal, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    properties: { tabColor: { argb: `FF${INK}` } },
  });
  journalSheet.columns = [
    { header: copy.date, width: 14 },
    { header: copy.number, width: 12 },
    { header: copy.doctor, width: 22 },
    { header: copy.patient, width: 22 },
    { header: copy.color, width: 10 },
    { header: copy.workType, width: 28 },
    { header: copy.qty, width: 12 },
    { header: moneyHeader(copy.price, copy.currency), width: 14 },
    { header: moneyHeader(copy.amount, copy.currency), width: 14 },
    { header: copy.notes, width: 28 },
  ];
  styleHeader(journalSheet.getRow(1));
  for (const row of journal) {
    journalSheet.addRow([
      formatJournalDate(row.dateIso, copy.dateFormat),
      row.orderNumber,
      row.doctor,
      row.patient,
      row.color,
      row.workType,
      row.quantity,
      row.unitPriceMajor,
      row.amountMajor,
      row.notes,
    ]);
  }
  if (journal.length > 0) {
    styleBody(journalSheet, 2, journal.length + 1, [8, 9]);
    autoFilter(journalSheet, 10, journal.length + 1);
    for (let r = 2; r <= journal.length + 1; r += 1) {
      journalSheet.getRow(r).getCell(7).alignment = { horizontal: "right", vertical: "middle" };
      journalSheet.getRow(r).getCell(2).font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: `FF${INK}` },
      };
    }
  } else {
    journalSheet.addRow([copy.empty]);
    journalSheet.mergeCells(2, 1, 2, 10);
    journalSheet.getRow(2).font = { name: "Calibri", size: 11, italic: true, color: { argb: `FF${MUTED}` } };
  }

  const doctorSheet = workbook.addWorksheet(copy.doctors, {
    properties: { tabColor: { argb: "FF3D5A73" } },
  });
  doctorSheet.columns = [
    { header: copy.doctor, width: 28 },
    { header: copy.orders, width: 12 },
    { header: copy.units, width: 12 },
    { header: moneyHeader(copy.earned, copy.currency), width: 16 },
  ];
  styleHeader(doctorSheet.getRow(1));
  for (const row of doctors) {
    doctorSheet.addRow([row.name, row.orders, row.units, row.amountMajor]);
  }
  if (doctors.length > 0) {
    styleBody(doctorSheet, 2, doctors.length + 1, [4]);
    autoFilter(doctorSheet, 4, doctors.length + 1);
    addTotalRow(
      doctorSheet,
      [
        copy.summary,
        doctors.reduce((s, r) => s + r.orders, 0),
        doctors.reduce((s, r) => s + r.units, 0),
        doctors.reduce((s, r) => s + r.amountMajor, 0),
      ],
      [4],
    );
  }

  const workSheet = workbook.addWorksheet(copy.works, {
    properties: { tabColor: { argb: "FF2F6B4F" } },
  });
  workSheet.columns = [
    { header: copy.workType, width: 32 },
    { header: copy.orders, width: 12 },
    { header: copy.units, width: 12 },
    { header: moneyHeader(copy.earned, copy.currency), width: 16 },
  ];
  styleHeader(workSheet.getRow(1));
  for (const row of works) {
    workSheet.addRow([row.name, row.orders, row.units, row.amountMajor]);
  }
  if (works.length > 0) {
    styleBody(workSheet, 2, works.length + 1, [4]);
    autoFilter(workSheet, 4, works.length + 1);
    addTotalRow(
      workSheet,
      [
        copy.summary,
        works.reduce((s, r) => s + r.orders, 0),
        works.reduce((s, r) => s + r.units, 0),
        works.reduce((s, r) => s + r.amountMajor, 0),
      ],
      [4],
    );
  }

  const summarySheet = workbook.addWorksheet(copy.summary, {
    properties: { tabColor: { argb: "FF8A6A2B" } },
    views: [{ showGridLines: false }],
  });
  summarySheet.columns = [
    { header: "", width: 28 },
    { header: "", width: 22 },
  ];
  summarySheet.mergeCells(1, 1, 1, 2);
  summarySheet.getCell(1, 1).value = "Atelier";
  summarySheet.getCell(1, 1).font = { name: "Calibri", size: 18, bold: true, color: { argb: `FF${INK}` } };
  summarySheet.getCell(2, 1).value = copy.journal;
  summarySheet.getCell(2, 1).font = { name: "Calibri", size: 12, color: { argb: `FF${MUTED}` } };
  summarySheet.getCell(3, 1).value = copy.period;
  summarySheet.getCell(3, 2).value = summary.periodLabel;
  summarySheet.getCell(3, 2).font = { name: "Calibri", size: 12, bold: true, color: { argb: `FF${INK}` } };

  const kpis: Array<[string, string | number, boolean]> = [
    [copy.orders, summary.orders, false],
    [copy.units, summary.units, false],
    [moneyHeader(copy.earned, copy.currency), summary.amountMajor, true],
    [moneyHeader(copy.average, copy.currency), summary.averageCheckMajor, true],
    [copy.doctorsCount, summary.doctors, false],
    [copy.workTypesCount, summary.workTypes, false],
  ];
  kpis.forEach((item, index) => {
    const r = 5 + index;
    summarySheet.getCell(r, 1).value = item[0];
    summarySheet.getCell(r, 1).font = { name: "Calibri", size: 11, color: { argb: `FF${MUTED}` } };
    summarySheet.getCell(r, 2).value = item[1];
    summarySheet.getCell(r, 2).font = { name: "Calibri", size: 12, bold: true, color: { argb: `FF${INK}` } };
    summarySheet.getCell(r, 2).alignment = { horizontal: "right" };
    if (item[2]) summarySheet.getCell(r, 2).numFmt = MONEY;
    summarySheet.getCell(r, 1).border = { bottom: { style: "hair", color: { argb: `FF${LINE}` } } };
    summarySheet.getCell(r, 2).border = { bottom: { style: "hair", color: { argb: `FF${LINE}` } } };
  });
  summarySheet.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${PAPER}` },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}
