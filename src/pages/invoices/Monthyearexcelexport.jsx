/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { FileSpreadsheet, Loader2, X, Calendar } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// ─── Color Palette (ARGB) ────────────────────────────────────────────────────
const C = {
  ORANGE       : "FFE68736",
  ORANGE_LIGHT : "FFFFF0E0",
  ORANGE_MID   : "FFFDE8CC",
  DARK_NAVY    : "FF1A1A2E",
  DARK_GRAY    : "FF374151",
  MID_GRAY     : "FF6B7280",
  LIGHT_GRAY   : "FFF3F4F6",
  WHITE        : "FFFFFFFF",
  GREEN        : "FF15803D",
  GREEN_BG     : "FFD1FAE5",
  YELLOW       : "FFB45309",
  YELLOW_BG    : "FFFEF3C7",
  RED          : "FFDC2626",
  RED_BG       : "FFFEE2E2",
  BLUE         : "FF1D4ED8",
  BLUE_BG      : "FFDBEAFE",
  BORDER_LIGHT : "FFE5E7EB",
  BORDER_ORANGE: "FFFBD7B4",
  ROW_ALT      : "FFFDF8F5",
};

// ─── Style Helpers ────────────────────────────────────────────────────────────
const fill  = (argb) => ({ type:"pattern", pattern:"solid", fgColor:{ argb } });
const font  = (opts) => ({ name:"Arial", ...opts });
const align = (h="left", v="middle", wrap=false) => ({ horizontal:h, vertical:v, wrapText:wrap });
const border = (color=C.BORDER_LIGHT, style="thin") => ({
  top   :{ style, color:{ argb:color } },
  bottom:{ style, color:{ argb:color } },
  left  :{ style, color:{ argb:color } },
  right :{ style, color:{ argb:color } },
});
const borderBottom = (color, style="medium") => ({
  bottom:{ style, color:{ argb:color } },
});

const applyToRow = (ws, rowNum, styleFn) => {
  ws.getRow(rowNum).eachCell({ includeEmpty:true }, (cell) => styleFn(cell));
};

const numFmt = (n) => {
  if (n === null || n === undefined || n === "") return "";
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}-${MONTH_SHORT[dt.getMonth()]}-${dt.getFullYear()}`;
};
const lastDayOf = (m, y) => new Date(y, m, 0).getDate();

const getStatus = (inv) => {
  const paid = inv.summary?.paidAmount  || 0;
  const due  = inv.summary?.amountToPay || 0;
  if (due === 0 && paid > 0) return "✔ Paid";
  if (paid > 0 && due > 0)  return "⚠ Partial";
  return "⏳ Unpaid";
};

// ─── Sheet 1 Builder ─────────────────────────────────────────────────────────
const buildInvoiceSheet = (wb, invoices, month, year) => {
  const monthName  = MONTH_NAMES[month - 1];
  const monthShort = MONTH_SHORT[month - 1];
  const lastDay    = lastDayOf(month, year);
  const today      = fmtDate(new Date());
  const companyGstin = invoices[0]?.seller?.gstin || "-";
  const ws         = wb.addWorksheet(`${monthShort} ${year} Invoices`, {
    pageSetup: { paperSize:9, orientation:"landscape", fitToPage:true, fitToWidth:1 },
    views: [{ state:"frozen", ySplit:6 }],
  });

  // Column definitions
  ws.columns = [
    { key:"sr",       width:5  },
    { key:"invNo",    width:13 },
    { key:"invDate",  width:14 },
    { key:"dueDate",  width:14 },
    { key:"custNo",   width:10 },
    { key:"customer", width:34 },
    { key:"city",     width:16 },
    { key:"gstin",    width:18 },
    { key:"gross",    width:18 },
    { key:"disc",     width:16 },
    { key:"net",      width:16 },
    { key:"tax",      width:14 },
    { key:"payable",  width:18 },
    { key:"paid",     width:16 },
    { key:"due",      width:15 },
    { key:"status",   width:13 },
  ];

  const LAST_COL = "P";

  // ── ROW 1 : Company banner ─────────────────────────────────────────────────
  ws.mergeCells(`A1:${LAST_COL}1`);
  const r1 = ws.getCell("A1");
  r1.value     = "DIGIDENT INDIA PRIVATE LIMITED";
  r1.fill      = fill(C.DARK_NAVY);
  r1.font      = font({ bold:true, size:18, color:{ argb:C.WHITE } });
  r1.alignment = align("center","middle");
  ws.getRow(1).height = 40;

  // ── ROW 2 : Report title ───────────────────────────────────────────────────
  ws.mergeCells(`A2:${LAST_COL}2`);
  const r2 = ws.getCell("A2");
  r2.value     = `INVOICE REPORT  ·  ${monthName.toUpperCase()} ${year}`;
  r2.fill      = fill(C.ORANGE);
  r2.font      = font({ bold:true, size:14, color:{ argb:C.WHITE } });
  r2.alignment = align("center","middle");
  ws.getRow(2).height = 28;

  // ── ROW 3 : Period meta bar ────────────────────────────────────────────────
  ws.mergeCells(`A3:H3`);
  const r3a = ws.getCell("A3");
  r3a.value     = `  Period :  01 ${monthShort} ${year}  –  ${lastDay} ${monthShort} ${year}   |   Company GSTIN :  ${companyGstin}`;
  r3a.fill      = fill(C.DARK_GRAY);
  r3a.font      = font({ size:10, color:{ argb:"FFD1D5DB" } });
  r3a.alignment = align("left","middle");

  ws.mergeCells(`I3:L3`);
  const r3b = ws.getCell("I3");
  r3b.value     = `Total Invoices :  ${invoices.length}`;
  r3b.fill      = fill(C.DARK_GRAY);
  r3b.font      = font({ bold:true, size:10, color:{ argb:C.ORANGE } });
  r3b.alignment = align("center","middle");

  ws.mergeCells(`M3:${LAST_COL}3`);
  const r3c = ws.getCell("M3");
  r3c.value     = `Generated :  ${today}`;
  r3c.fill      = fill(C.DARK_GRAY);
  r3c.font      = font({ size:10, color:{ argb:"FF9CA3AF" } });
  r3c.alignment = align("right","middle");
  ws.getRow(3).height = 24;

  // ── ROW 4 : Empty spacer ──────────────────────────────────────────────────
  ws.getRow(4).height = 6;
  ws.mergeCells(`A4:${LAST_COL}4`);
  ws.getCell("A4").fill = fill(C.ORANGE);

  // ── ROW 5 : Column Headers ────────────────────────────────────────────────
  const headers = [
    "Sr.", "Invoice No.", "Invoice Date", "Due Date",
    "Cust. No.", "Bill To (Customer)", "City", "GSTIN",
    "Gross Amount (₹)", "Discount (₹)", "Net Amount (₹)",
    "GST / Tax (₹)", "Total Payable (₹)", "Amount Paid (₹)",
    "Amount Due (₹)", "Status",
  ];
  const hRow = ws.getRow(5);
  hRow.height = 30;
  headers.forEach((h, i) => {
    const cell   = hRow.getCell(i + 1);
    cell.value   = h;
    cell.fill    = fill(C.ORANGE);
    cell.font    = font({ bold:true, size:9.5, color:{ argb:C.WHITE } });
    cell.alignment = align("center","middle",true);
    cell.border  = {
      top   :{ style:"medium", color:{ argb:C.DARK_NAVY } },
      bottom:{ style:"medium", color:{ argb:C.DARK_NAVY } },
      left  :{ style:"thin",   color:{ argb:"FFD97706"  } },
      right :{ style:"thin",   color:{ argb:"FFD97706"  } },
    };
  });

  // ── DATA ROWS ─────────────────────────────────────────────────────────────
  let totGross=0, totDisc=0, totNet=0, totTax=0;
  let totPayable=0, totPaid=0, totDue=0;

  invoices.forEach((inv, idx) => {
    const rowNum  = idx + 6;
    const isOdd   = idx % 2 === 0;
    const rowBg   = isOdd ? C.WHITE : C.ROW_ALT;

    const gross   = inv.items?.reduce((s,it)=>s+(it.qty*it.price),0)   || 0;
    const disc    = inv.items?.reduce((s,it)=>s+(it.discountValue||0),0)|| 0;
    const net     = inv.summary?.totalNet        || 0;
    const tax     = inv.summary?.totalTax        || 0;
    const payable = inv.summary?.totalPayAmount  || 0;
    const paid    = inv.summary?.paidAmount      || 0;
    const due     = inv.summary?.amountToPay     || 0;
    const city    = inv.billTo?.city || inv.billTo?.address?.split(",").pop()?.trim() || "-";
    const gstin   = inv.billTo?.gstin && inv.billTo.gstin.trim() !== "" ? inv.billTo.gstin : "Not Provided";
    const status  = getStatus(inv);

    totGross+=gross; totDisc+=disc; totNet+=net; totTax+=tax;
    totPayable+=payable; totPaid+=paid; totDue+=due;

    const dataRow = ws.getRow(rowNum);
    dataRow.height = 20;

    const vals = [
      idx+1, inv.invoiceNumber, fmtDate(inv.invoiceDate), fmtDate(inv.dueDate),
      inv.customerNo,
      inv.billTo?.companyName || inv.billTo?.contactPerson || "-",
      city, gstin,
      +gross.toFixed(2), +disc.toFixed(2), +net.toFixed(2),
      +tax.toFixed(2), +payable.toFixed(2), +paid.toFixed(2), +due.toFixed(2),
      status,
    ];

    vals.forEach((v, ci) => {
      const cell = dataRow.getCell(ci + 1);
      cell.value = v;
      cell.fill  = fill(rowBg);
      cell.border = border(C.BORDER_LIGHT);

      // Number columns right-align (gross → due, now shifted by 1 for the new GSTIN col)
      if (ci >= 8 && ci <= 14) {
        cell.alignment = align("right","middle");
        cell.font = font({ size:9.5, color:{ argb: ci===14 && due>0 ? C.RED : C.DARK_GRAY } });
        cell.numFmt = '#,##0.00';
      } else if (ci === 0) {
        cell.alignment = align("center","middle");
        cell.font = font({ size:9, color:{ argb:C.MID_GRAY } });
      } else if (ci === 7) {
        // GSTIN column
        cell.alignment = align("center","middle");
        cell.font = font({
          size:9,
          italic: gstin === "Not Provided",
          color:{ argb: gstin === "Not Provided" ? C.MID_GRAY : C.DARK_NAVY },
        });
      } else {
        cell.alignment = align("left","middle");
        cell.font = font({ size:9.5, color:{ argb:C.DARK_NAVY } });
      }

      // Status column
      if (ci === 15) {
        cell.alignment = align("center","middle");
        if (status === "✔ Paid") {
          cell.fill = fill(C.GREEN_BG);
          cell.font = font({ bold:true, size:9, color:{ argb:C.GREEN } });
        } else if (status === "⚠ Partial") {
          cell.fill = fill(C.YELLOW_BG);
          cell.font = font({ bold:true, size:9, color:{ argb:C.YELLOW } });
        } else {
          cell.fill = fill(C.RED_BG);
          cell.font = font({ bold:true, size:9, color:{ argb:C.RED } });
        }
      }

      // Invoice No bold
      if (ci === 1) cell.font = font({ bold:true, size:9.5, color:{ argb:C.ORANGE } });
      // Customer bold
      if (ci === 5) cell.font = font({ bold:true, size:9.5, color:{ argb:C.DARK_NAVY } });
    });
  });

  // ── TOTALS ROW ────────────────────────────────────────────────────────────
  const tRowNum = invoices.length + 6;
  const tRow    = ws.getRow(tRowNum);
  tRow.height   = 26;

  const totLabels = [
    "", "TOTALS", "", "",
    "", `${invoices.length} Invoices`, "", "",
    +totGross.toFixed(2), +totDisc.toFixed(2), +totNet.toFixed(2),
    +totTax.toFixed(2), +totPayable.toFixed(2), +totPaid.toFixed(2),
    +totDue.toFixed(2), "",
  ];

  totLabels.forEach((v, ci) => {
    const cell    = tRow.getCell(ci + 1);
    cell.value    = v;
    cell.fill     = fill(C.DARK_NAVY);
    cell.font     = font({ bold:true, size:10, color:{ argb:C.WHITE } });
    cell.border   = border(C.ORANGE, "medium");
    if (ci >= 8 && ci <= 14) {
      cell.alignment = align("right","middle");
      cell.numFmt    = '#,##0.00';
      if (ci === 14 && totDue > 0)
        cell.font = font({ bold:true, size:10, color:{ argb:"FFFF8080" } });
    } else {
      cell.alignment = align("center","middle");
    }
  });

  // ── Empty row after totals ────────────────────────────────────────────────
  const footerRow = ws.getRow(tRowNum + 1);
  ws.mergeCells(`A${tRowNum+1}:${LAST_COL}${tRowNum+1}`);
  const fc = footerRow.getCell(1);
  fc.value     = "DIGIDENT INDIA PVT. LTD.  ·  Confidential Invoice Report";
  fc.fill      = fill(C.ORANGE);
  fc.font      = font({ italic:true, size:9, color:{ argb:C.WHITE } });
  fc.alignment = align("center","middle");
  footerRow.height = 18;

  return { totGross, totDisc, totNet, totTax, totPayable, totPaid, totDue, companyGstin };
};

// ─── Sheet 2 Builder ─────────────────────────────────────────────────────────
const buildSummarySheet = (wb, invoices, month, year, totals) => {
  const monthName  = MONTH_NAMES[month - 1];
  const monthShort = MONTH_SHORT[month - 1];
  const ws = wb.addWorksheet(`${monthShort} ${year} Summary`, {
    pageSetup:{ paperSize:9, orientation:"portrait" },
  });

  ws.columns = [
    { width:4  },
    { width:36 },
    { width:4  },
    { width:24 },
    { width:4  },
    { width:18 },
    { width:18 },
    { width:16 },
    { width:16 },
  ];

  const { totGross, totDisc, totNet, totTax, totPayable, totPaid, totDue, companyGstin } = totals;
  const paidInvs    = invoices.filter(i=>(i.summary?.amountToPay||0)===0 && (i.summary?.paidAmount||0)>0);
  const partialInvs = invoices.filter(i=>(i.summary?.paidAmount||0)>0   && (i.summary?.amountToPay||0)>0);
  const issuedInvs  = invoices.filter(i=>(i.summary?.paidAmount||0)===0);
  const collectRate = totPayable>0 ? (totPaid/totPayable*100).toFixed(1)+"%" : "0.0%";

  let rowIdx = 1;

  const addRow = (height=20) => {
    ws.getRow(rowIdx).height = height;
    return rowIdx++;
  };

  // ── TITLE BLOCK ───────────────────────────────────────────────────────────
  const r1 = addRow(50);
  ws.mergeCells(`A${r1}:I${r1}`);
  const t1 = ws.getCell(`A${r1}`);
  t1.value     = `${monthName.toUpperCase()} ${year}`;
  t1.fill      = fill(C.DARK_NAVY);
  t1.font      = font({ bold:true, size:26, color:{ argb:C.ORANGE } });
  t1.alignment = align("center","middle");

  const r2 = addRow(28);
  ws.mergeCells(`A${r2}:I${r2}`);
  const t2 = ws.getCell(`A${r2}`);
  t2.value     = "INVOICE SUMMARY DASHBOARD";
  t2.fill      = fill(C.ORANGE);
  t2.font      = font({ bold:true, size:14, color:{ argb:C.WHITE } });
  t2.alignment = align("center","middle");

  const r3 = addRow(22);
  ws.mergeCells(`A${r3}:I${r3}`);
  const t3 = ws.getCell(`A${r3}`);
  t3.value     = `DIGIDENT INDIA PRIVATE LIMITED  ·  GSTIN: ${companyGstin}  ·  Confidential`;
  t3.fill      = fill(C.DARK_GRAY);
  t3.font      = font({ size:9, color:{ argb:"FF9CA3AF" } });
  t3.alignment = align("center","middle");

  addRow(12); // spacer

  // ── KPI CARDS (2-column grid) ─────────────────────────────────────────────
  const kpiHeader = addRow(26);
  ws.mergeCells(`A${kpiHeader}:I${kpiHeader}`);
  const kh = ws.getCell(`A${kpiHeader}`);
  kh.value     = "  KEY PERFORMANCE INDICATORS";
  kh.fill      = fill(C.DARK_NAVY);
  kh.font      = font({ bold:true, size:11, color:{ argb:C.ORANGE } });
  kh.alignment = align("left","middle");

  const kpiData = [
    { label:"Total Invoices",           value:invoices.length,            suffix:"",  color:C.DARK_NAVY,  bg:C.LIGHT_GRAY  },
    { label:"✔  Paid",                  value:paidInvs.length,            suffix:"",  color:C.GREEN,      bg:C.GREEN_BG    },
    { label:"⚠  Partially Paid",        value:partialInvs.length,         suffix:"",  color:C.YELLOW,     bg:C.YELLOW_BG   },
    { label:"⏳ Unpaid / Issued",        value:issuedInvs.length,          suffix:"",  color:C.RED,        bg:C.RED_BG      },
    { label:"Gross Billing",            value:totGross,                   suffix:"₹", color:C.DARK_NAVY,  bg:C.WHITE       },
    { label:"Total Discounts",          value:totDisc,                    suffix:"₹", color:C.YELLOW,     bg:C.YELLOW_BG   },
    { label:"Net Value (ex. Tax)",      value:totNet,                     suffix:"₹", color:C.DARK_NAVY,  bg:C.WHITE       },
    { label:"GST / Tax Collected",      value:totTax,                     suffix:"₹", color:C.MID_GRAY,   bg:C.LIGHT_GRAY  },
    { label:"Total Payable",            value:totPayable,                 suffix:"₹", color:C.DARK_NAVY,  bg:C.ORANGE_MID  },
    { label:"Amount Collected",         value:totPaid,                    suffix:"₹", color:C.GREEN,      bg:C.GREEN_BG    },
    { label:"Outstanding / Due",        value:totDue,                     suffix:"₹", color:C.RED,        bg:C.RED_BG      },
    { label:"Collection Rate",          value:collectRate,                suffix:"",  color:C.BLUE,       bg:C.BLUE_BG     },
  ];

  kpiData.forEach((kpi) => {
    const rn = addRow(24);
    // Label cell (cols A-E merged)
    ws.mergeCells(`A${rn}:E${rn}`);
    const lc   = ws.getCell(`A${rn}`);
    lc.value   = "  " + kpi.label;
    lc.fill    = fill(C.LIGHT_GRAY);
    lc.font    = font({ size:10.5, color:{ argb:C.DARK_GRAY }, bold:false });
    lc.alignment = align("left","middle");
    lc.border  = { bottom:{ style:"thin", color:{ argb:C.BORDER_LIGHT } } };

    // Value cell (cols F-I merged)
    ws.mergeCells(`F${rn}:I${rn}`);
    const vc  = ws.getCell(`F${rn}`);
    vc.fill   = fill(kpi.bg);
    vc.font   = font({ bold:true, size:11, color:{ argb:kpi.color } });
    vc.alignment = align("center","middle");
    vc.border = { bottom:{ style:"thin", color:{ argb:C.BORDER_LIGHT } } };

    if (kpi.suffix === "₹") {
      vc.value  = typeof kpi.value==="number" ? +kpi.value.toFixed(2) : kpi.value;
      vc.numFmt = '₹ #,##0.00';
    } else {
      vc.value = kpi.value;
    }
  });

  addRow(16); // spacer

  // ── CUSTOMER BREAKDOWN TABLE ──────────────────────────────────────────────
  const cbHeader = addRow(26);
  ws.mergeCells(`A${cbHeader}:I${cbHeader}`);
  const cbh   = ws.getCell(`A${cbHeader}`);
  cbh.value   = `  CUSTOMER-WISE BREAKDOWN — ${monthName.toUpperCase()} ${year}`;
  cbh.fill    = fill(C.DARK_NAVY);
  cbh.font    = font({ bold:true, size:11, color:{ argb:C.ORANGE } });
  cbh.alignment = align("left","middle");

  // Sub-headers
  const cbColHeaders = ["", "Customer Name", "", "City", "", "Invoices", "Total Payable (₹)", "Paid (₹)", "Due (₹)"];
  const cbSubRow = addRow(26);
  cbColHeaders.forEach((h, ci) => {
    const cell = ws.getCell(cbSubRow, ci + 1);
    cell.value     = h;
    cell.fill      = fill(C.ORANGE);
    cell.font      = font({ bold:true, size:9.5, color:{ argb:C.WHITE } });
    cell.alignment = ci >= 5 ? align("center","middle") : align("left","middle");
    cell.border    = border(C.ORANGE_MID);
  });

  // Group by customer
  const custMap = {};
  invoices.forEach((inv) => {
    const key  = inv.billTo?.companyName || inv.billTo?.contactPerson || "Unknown";
    const city = inv.billTo?.city || inv.billTo?.address?.split(",").pop()?.trim() || "-";
    if (!custMap[key]) custMap[key] = { city, count:0, payable:0, paid:0, due:0 };
    custMap[key].count++;
    custMap[key].payable += inv.summary?.totalPayAmount || 0;
    custMap[key].paid    += inv.summary?.paidAmount     || 0;
    custMap[key].due     += inv.summary?.amountToPay    || 0;
  });

  Object.entries(custMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([name, d], idx) => {
      const rn    = addRow(21);
      const isOdd = idx % 2 === 0;
      const bg    = isOdd ? C.WHITE : C.ROW_ALT;

      // Name (cols A-C)
      ws.mergeCells(`A${rn}:C${rn}`);
      const nc   = ws.getCell(`A${rn}`);
      nc.value   = "  " + name;
      nc.fill    = fill(bg);
      nc.font    = font({ bold:true, size:9.5, color:{ argb:C.DARK_NAVY } });
      nc.alignment = align("left","middle");
      nc.border  = border(C.BORDER_LIGHT);

      // City (cols D-E)
      ws.mergeCells(`D${rn}:E${rn}`);
      const cc   = ws.getCell(`D${rn}`);
      cc.value   = d.city;
      cc.fill    = fill(bg);
      cc.font    = font({ size:9, color:{ argb:C.MID_GRAY } });
      cc.alignment = align("left","middle");
      cc.border  = border(C.BORDER_LIGHT);

      // Count
      const ic   = ws.getCell(rn, 6);
      ic.value   = d.count;
      ic.fill    = fill(bg);
      ic.font    = font({ bold:true, size:9.5, color:{ argb:C.ORANGE } });
      ic.alignment = align("center","middle");
      ic.border  = border(C.BORDER_LIGHT);

      // Payable
      const pc   = ws.getCell(rn, 7);
      pc.value   = +d.payable.toFixed(2);
      pc.fill    = fill(bg);
      pc.font    = font({ size:9.5, color:{ argb:C.DARK_NAVY } });
      pc.alignment = align("right","middle");
      pc.numFmt  = '#,##0.00';
      pc.border  = border(C.BORDER_LIGHT);

      // Paid
      const pa   = ws.getCell(rn, 8);
      pa.value   = +d.paid.toFixed(2);
      pa.fill    = fill(bg);
      pa.font    = font({ size:9.5, color:{ argb:d.paid>0 ? C.GREEN : C.MID_GRAY } });
      pa.alignment = align("right","middle");
      pa.numFmt  = '#,##0.00';
      pa.border  = border(C.BORDER_LIGHT);

      // Due
      const dc   = ws.getCell(rn, 9);
      dc.value   = +d.due.toFixed(2);
      dc.fill    = fill(d.due > 0 ? C.RED_BG : C.GREEN_BG);
      dc.font    = font({ bold: d.due>0, size:9.5, color:{ argb:d.due>0 ? C.RED : C.GREEN } });
      dc.alignment = align("right","middle");
      dc.numFmt  = '#,##0.00';
      dc.border  = border(C.BORDER_LIGHT);
    });

  // ── Customer Totals ───────────────────────────────────────────────────────
  const ctRow = addRow(24);
  ws.mergeCells(`A${ctRow}:C${ctRow}`);
  const cta = ws.getCell(`A${ctRow}`);
  cta.value     = "  GRAND TOTAL";
  cta.fill      = fill(C.DARK_NAVY);
  cta.font      = font({ bold:true, size:10.5, color:{ argb:C.WHITE } });
  cta.alignment = align("left","middle");

  ws.mergeCells(`D${ctRow}:E${ctRow}`);
  ws.getCell(`D${ctRow}`).fill = fill(C.DARK_NAVY);

  const ctCount = ws.getCell(ctRow, 6);
  ctCount.value     = invoices.length;
  ctCount.fill      = fill(C.DARK_NAVY);
  ctCount.font      = font({ bold:true, size:10, color:{ argb:C.ORANGE } });
  ctCount.alignment = align("center","middle");

  [[7,totPayable],[8,totPaid],[9,totDue]].forEach(([col, val]) => {
    const c   = ws.getCell(ctRow, col);
    c.value   = +val.toFixed(2);
    c.fill    = fill(C.DARK_NAVY);
    c.font    = font({ bold:true, size:10, color:{ argb: col===9 && totDue>0 ? "FFFF8080" : C.WHITE } });
    c.alignment = align("right","middle");
    c.numFmt  = '#,##0.00';
    c.border  = border(C.ORANGE,"medium");
  });

  // Footer
  const ftRow = addRow(18);
  ws.mergeCells(`A${ftRow}:I${ftRow}`);
  const ft = ws.getCell(`A${ftRow}`);
  ft.value     = "Generated by DigiDent CRM  ·  DIGIDENT INDIA PVT. LTD.  ·  Confidential";
  ft.fill      = fill(C.ORANGE);
  ft.font      = font({ italic:true, size:9, color:{ argb:C.WHITE } });
  ft.alignment = align("center","middle");
};

// ─── Main Export Function ─────────────────────────────────────────────────────
const generateExcel = async (invoices, month, year) => {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator  = "Digident India Pvt. Ltd.";
  wb.created  = new Date();
  wb.modified = new Date();

  const totals = buildInvoiceSheet(wb, invoices, month, year);
  buildSummarySheet(wb, invoices, month, year, totals);

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = `Digident_${MONTH_NAMES[month-1]}_${year}_InvoiceReport.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Component ────────────────────────────────────────────────────────────────
const MonthYearExcelExport = ({ fetchInvoices }) => {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  const yearOptions = Array.from({ length:5 }, (_,i) => now.getFullYear() - i);

  const handleExport = async () => {
    setLoading(true);
    try {
      const invoices = await fetchInvoices(month, year);
      if (!invoices || invoices.length === 0) {
        alert(`No invoices found for ${MONTH_NAMES[month-1]} ${year}.`);
        return;
      }
      await generateExcel(invoices, month, year);
      setOpen(false);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Export failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl
                   hover:bg-emerald-700 transition-all font-semibold shadow-lg active:scale-95"
      >
        <FileSpreadsheet size={20} />
        Export Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#E68736] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <FileSpreadsheet className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg leading-tight">Export Invoice Report</h2>
                  <p className="text-white/70 text-xs">Professional Excel · 2 Sheets</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700
                               focus:ring-2 focus:ring-orange-400 outline-none bg-gray-50 text-sm"
                  >
                    {MONTH_NAMES.map((m,i) => (
                      <option key={m} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700
                               focus:ring-2 focus:ring-orange-400 outline-none bg-gray-50 text-sm"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview card */}
              <div className="bg-gradient-to-r from-[#1A1A2E] to-[#374151] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs">Exporting report for</p>
                  <p className="text-white font-bold text-base mt-0.5">
                    {MONTH_NAMES[month-1]} {year}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs">Format</p>
                  <p className="text-[#E68736] font-semibold text-sm mt-0.5">.xlsx · 2 Sheets</p>
                </div>
              </div>

              {/* What's included */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 space-y-1.5">
                {[
                  ["Sheet 1", "Invoice List with status color-coding"],
                  ["Sheet 2", "KPI Dashboard + Customer Breakdown"],
                ].map(([sheet, desc]) => (
                  <div key={sheet} className="flex items-center gap-2.5 text-sm">
                    <span className="w-16 text-xs font-bold text-orange-500 bg-orange-50 rounded-md px-1.5 py-0.5">
                      {sheet}
                    </span>
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white
                           py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Generating Professional Report…
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={17} />
                    Download Excel Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MonthYearExcelExport;
