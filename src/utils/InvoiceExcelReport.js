/**
 * Builds the two-sheet monthly Excel report (invoice list + summary dashboard) with ExcelJS.
 *
 * Used by: components/invoice/MonthYearExcelExport.jsx
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ─── Color Palette (ARGB) ────────────────────────────────────────────────────
const COLORS = {
  ORANGE: "FFE68736",
  ORANGE_LIGHT: "FFFFF0E0",
  ORANGE_MID: "FFFDE8CC",
  DARK_NAVY: "FF1A1A2E",
  DARK_GRAY: "FF374151",
  MID_GRAY: "FF6B7280",
  LIGHT_GRAY: "FFF3F4F6",
  WHITE: "FFFFFFFF",
  GREEN: "FF15803D",
  GREEN_BG: "FFD1FAE5",
  YELLOW: "FFB45309",
  YELLOW_BG: "FFFEF3C7",
  RED: "FFDC2626",
  RED_BG: "FFFEE2E2",
  BLUE: "FF1D4ED8",
  BLUE_BG: "FFDBEAFE",
  BORDER_LIGHT: "FFE5E7EB",
  BORDER_ORANGE: "FFFBD7B4",
  ROW_ALT: "FFFDF8F5",
};

// ─── Style Helpers ────────────────────────────────────────────────────────────
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

const font = (opts) => ({ name: "Arial", ...opts });

const align = (horizontal = "left", vertical = "middle", wrap = false) => ({
  horizontal: horizontal,
  vertical: vertical,
  wrapText: wrap,
});

const border = (color = COLORS.BORDER_LIGHT, style = "thin") => ({
  top: { style, color: { argb: color } },
  bottom: { style, color: { argb: color } },
  left: { style, color: { argb: color } },
  right: { style, color: { argb: color } },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (date) => {
  if (!date) return "-";
  const currentDate = new Date(date);
  return `${String(currentDate.getDate()).padStart(2, "0")}-${MONTH_SHORT[currentDate.getMonth()]}-${currentDate.getFullYear()}`;
};

const lastDayOf = (month, year) => new Date(year, month, 0).getDate();

const getStatus = (invoice) => {
  const paid = invoice.summary?.paidAmount || 0;
  const due = invoice.summary?.amountToPay || 0;
  if (due === 0 && paid > 0) return "✔ Paid";
  if (paid > 0 && due > 0) return "⚠ Partial";
  return "⏳ Unpaid";
};

// ─── Sheet 1 Builder ─────────────────────────────────────────────────────────
const buildInvoiceSheet = (workbook, invoices, month, year) => {
  const monthName = MONTH_NAMES[month - 1];
  const monthShort = MONTH_SHORT[month - 1];
  const lastDay = lastDayOf(month, year);
  const today = fmtDate(new Date());
  const companyGstin = invoices[0]?.seller?.gstin || "-";
  const worksheet = workbook.addWorksheet(`${monthShort} ${year} Invoices`, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 6 }],
  });

  // Column definitions
  worksheet.columns = [
    { key: "sr", width: 5 },
    { key: "invNo", width: 13 },
    { key: "invDate", width: 14 },
    { key: "dueDate", width: 14 },
    { key: "custNo", width: 10 },
    { key: "customer", width: 34 },
    { key: "city", width: 16 },
    { key: "gstin", width: 18 },
    { key: "gross", width: 18 },
    { key: "disc", width: 16 },
    { key: "net", width: 16 },
    { key: "tax", width: 14 },
    { key: "payable", width: 18 },
    { key: "paid", width: 16 },
    { key: "due", width: 15 },
    { key: "status", width: 13 },
  ];

  const LAST_COL = "P";

  // ── ROW 1 : Company banner ─────────────────────────────────────────────────
  worksheet.mergeCells(`A1:${LAST_COL}1`);
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "DIGIDENT INDIA PRIVATE LIMITED";
  titleCell.fill = fill(COLORS.DARK_NAVY);
  titleCell.font = font({ bold: true, size: 18, color: { argb: COLORS.WHITE } });
  titleCell.alignment = align("center", "middle");
  worksheet.getRow(1).height = 40;

  // ── ROW 2 : Report title ───────────────────────────────────────────────────
  worksheet.mergeCells(`A2:${LAST_COL}2`);
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = `INVOICE REPORT  ·  ${monthName.toUpperCase()} ${year}`;
  subtitleCell.fill = fill(COLORS.ORANGE);
  subtitleCell.font = font({ bold: true, size: 14, color: { argb: COLORS.WHITE } });
  subtitleCell.alignment = align("center", "middle");
  worksheet.getRow(2).height = 28;

  // ── ROW 3 : Period meta bar ────────────────────────────────────────────────
  worksheet.mergeCells(`A3:H3`);
  const r3a = worksheet.getCell("A3");
  r3a.value = `  Period :  01 ${monthShort} ${year}  –  ${lastDay} ${monthShort} ${year}   |   Company GSTIN :  ${companyGstin}`;
  r3a.fill = fill(COLORS.DARK_GRAY);
  r3a.font = font({ size: 10, color: { argb: "FFD1D5DB" } });
  r3a.alignment = align("left", "middle");

  worksheet.mergeCells(`I3:L3`);
  const r3b = worksheet.getCell("I3");
  r3b.value = `Total Invoices :  ${invoices.length}`;
  r3b.fill = fill(COLORS.DARK_GRAY);
  r3b.font = font({ bold: true, size: 10, color: { argb: COLORS.ORANGE } });
  r3b.alignment = align("center", "middle");

  worksheet.mergeCells(`M3:${LAST_COL}3`);
  const r3c = worksheet.getCell("M3");
  r3c.value = `Generated :  ${today}`;
  r3c.fill = fill(COLORS.DARK_GRAY);
  r3c.font = font({ size: 10, color: { argb: "FF9CA3AF" } });
  r3c.alignment = align("right", "middle");
  worksheet.getRow(3).height = 24;

  // ── ROW 4 : Empty spacer ──────────────────────────────────────────────────
  worksheet.getRow(4).height = 6;
  worksheet.mergeCells(`A4:${LAST_COL}4`);
  worksheet.getCell("A4").fill = fill(COLORS.ORANGE);

  // ── ROW 5 : Column Headers ────────────────────────────────────────────────
  const headers = [
    "Sr.",
    "Invoice No.",
    "Invoice Date",
    "Due Date",
    "Cust. No.",
    "Bill To (Customer)",
    "City",
    "GSTIN",
    "Gross Amount (₹)",
    "Discount (₹)",
    "Net Amount (₹)",
    "GST / Tax (₹)",
    "Total Payable (₹)",
    "Amount Paid (₹)",
    "Amount Due (₹)",
    "Status",
  ];
  const hRow = worksheet.getRow(5);
  hRow.height = 30;
  headers.forEach((header, index) => {
    const cell = hRow.getCell(index + 1);
    cell.value = header;
    cell.fill = fill(COLORS.ORANGE);
    cell.font = font({ bold: true, size: 9.5, color: { argb: COLORS.WHITE } });
    cell.alignment = align("center", "middle", true);
    cell.border = {
      top: { style: "medium", color: { argb: COLORS.DARK_NAVY } },
      bottom: { style: "medium", color: { argb: COLORS.DARK_NAVY } },
      left: { style: "thin", color: { argb: "FFD97706" } },
      right: { style: "thin", color: { argb: "FFD97706" } },
    };
  });

  // ── DATA ROWS ─────────────────────────────────────────────────────────────
  let totGross = 0,
    totDisc = 0,
    totNet = 0,
    totTax = 0;
  let totPayable = 0,
    totPaid = 0,
    totDue = 0;

  invoices.forEach((invoice, idx) => {
    const rowNum = idx + 6;
    const isOdd = idx % 2 === 0;
    const rowBg = isOdd ? COLORS.WHITE : COLORS.ROW_ALT;

    const gross = invoice.items?.reduce((total, item) => total + item.qty * item.price, 0) || 0;
    const disc = invoice.items?.reduce((total, item) => total + (item.discountValue || 0), 0) || 0;
    const net = invoice.summary?.totalNet || 0;
    const tax = invoice.summary?.totalTax || 0;
    const payable = invoice.summary?.totalPayAmount || 0;
    const paid = invoice.summary?.paidAmount || 0;
    const due = invoice.summary?.amountToPay || 0;
    const city = invoice.billTo?.city || invoice.billTo?.address?.split(",").pop()?.trim() || "-";
    const gstin =
      invoice.billTo?.gstin && invoice.billTo.gstin.trim() !== ""
        ? invoice.billTo.gstin
        : "Not Provided";
    const status = getStatus(invoice);

    totGross += gross;
    totDisc += disc;
    totNet += net;
    totTax += tax;
    totPayable += payable;
    totPaid += paid;
    totDue += due;

    const dataRow = worksheet.getRow(rowNum);
    dataRow.height = 20;

    const vals = [
      idx + 1,
      invoice.invoiceNumber,
      fmtDate(invoice.invoiceDate),
      fmtDate(invoice.dueDate),
      invoice.customerNo,
      invoice.billTo?.companyName || invoice.billTo?.contactPerson || "-",
      city,
      gstin,
      +gross.toFixed(2),
      +disc.toFixed(2),
      +net.toFixed(2),
      +tax.toFixed(2),
      +payable.toFixed(2),
      +paid.toFixed(2),
      +due.toFixed(2),
      status,
    ];

    vals.forEach((value, index) => {
      const cell = dataRow.getCell(index + 1);
      cell.value = value;
      cell.fill = fill(rowBg);
      cell.border = border(COLORS.BORDER_LIGHT);

      // Number columns (gross → due) are right-aligned
      if (index >= 8 && index <= 14) {
        cell.alignment = align("right", "middle");
        cell.font = font({
          size: 9.5,
          color: { argb: index === 14 && due > 0 ? COLORS.RED : COLORS.DARK_GRAY },
        });
        cell.numFmt = "#,##0.00";
      } else if (index === 0) {
        cell.alignment = align("center", "middle");
        cell.font = font({ size: 9, color: { argb: COLORS.MID_GRAY } });
      } else if (index === 7) {
        // GSTIN column
        cell.alignment = align("center", "middle");
        cell.font = font({
          size: 9,
          italic: gstin === "Not Provided",
          color: { argb: gstin === "Not Provided" ? COLORS.MID_GRAY : COLORS.DARK_NAVY },
        });
      } else {
        cell.alignment = align("left", "middle");
        cell.font = font({ size: 9.5, color: { argb: COLORS.DARK_NAVY } });
      }

      // Status column
      if (index === 15) {
        cell.alignment = align("center", "middle");
        if (status === "✔ Paid") {
          cell.fill = fill(COLORS.GREEN_BG);
          cell.font = font({ bold: true, size: 9, color: { argb: COLORS.GREEN } });
        } else if (status === "⚠ Partial") {
          cell.fill = fill(COLORS.YELLOW_BG);
          cell.font = font({ bold: true, size: 9, color: { argb: COLORS.YELLOW } });
        } else {
          cell.fill = fill(COLORS.RED_BG);
          cell.font = font({ bold: true, size: 9, color: { argb: COLORS.RED } });
        }
      }

      // Invoice No bold
      if (index === 1) cell.font = font({ bold: true, size: 9.5, color: { argb: COLORS.ORANGE } });
      // Customer bold
      if (index === 5)
        cell.font = font({ bold: true, size: 9.5, color: { argb: COLORS.DARK_NAVY } });
    });
  });

  // ── TOTALS ROW ────────────────────────────────────────────────────────────
  const tRowNum = invoices.length + 6;
  const tRow = worksheet.getRow(tRowNum);
  tRow.height = 26;

  const totLabels = [
    "",
    "TOTALS",
    "",
    "",
    "",
    `${invoices.length} Invoices`,
    "",
    "",
    +totGross.toFixed(2),
    +totDisc.toFixed(2),
    +totNet.toFixed(2),
    +totTax.toFixed(2),
    +totPayable.toFixed(2),
    +totPaid.toFixed(2),
    +totDue.toFixed(2),
    "",
  ];

  totLabels.forEach((totLabel, index) => {
    const cell = tRow.getCell(index + 1);
    cell.value = totLabel;
    cell.fill = fill(COLORS.DARK_NAVY);
    cell.font = font({ bold: true, size: 10, color: { argb: COLORS.WHITE } });
    cell.border = border(COLORS.ORANGE, "medium");
    if (index >= 8 && index <= 14) {
      cell.alignment = align("right", "middle");
      cell.numFmt = "#,##0.00";
      if (index === 14 && totDue > 0)
        cell.font = font({ bold: true, size: 10, color: { argb: "FFFF8080" } });
    } else {
      cell.alignment = align("center", "middle");
    }
  });

  // ── Empty row after totals ────────────────────────────────────────────────
  const footerRow = worksheet.getRow(tRowNum + 1);
  worksheet.mergeCells(`A${tRowNum + 1}:${LAST_COL}${tRowNum + 1}`);
  const footerCell = footerRow.getCell(1);
  footerCell.value = "DIGIDENT INDIA PVT. LTD.  ·  Confidential Invoice Report";
  footerCell.fill = fill(COLORS.ORANGE);
  footerCell.font = font({ italic: true, size: 9, color: { argb: COLORS.WHITE } });
  footerCell.alignment = align("center", "middle");
  footerRow.height = 18;

  return { totGross, totDisc, totNet, totTax, totPayable, totPaid, totDue, companyGstin };
};

// ─── Sheet 2 Builder ─────────────────────────────────────────────────────────
const buildSummarySheet = (workbook, invoices, month, year, totals) => {
  const monthName = MONTH_NAMES[month - 1];
  const monthShort = MONTH_SHORT[month - 1];
  const worksheet = workbook.addWorksheet(`${monthShort} ${year} Summary`, {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  worksheet.columns = [
    { width: 4 },
    { width: 36 },
    { width: 4 },
    { width: 24 },
    { width: 4 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
  ];

  const { totGross, totDisc, totNet, totTax, totPayable, totPaid, totDue, companyGstin } = totals;
  const paidInvs = invoices.filter(
    (invoice) => (invoice.summary?.amountToPay || 0) === 0 && (invoice.summary?.paidAmount || 0) > 0
  );
  const partialInvs = invoices.filter(
    (invoice) => (invoice.summary?.paidAmount || 0) > 0 && (invoice.summary?.amountToPay || 0) > 0
  );
  const issuedInvs = invoices.filter((invoice) => (invoice.summary?.paidAmount || 0) === 0);
  const collectRate = totPayable > 0 ? ((totPaid / totPayable) * 100).toFixed(1) + "%" : "0.0%";

  let rowIdx = 1;

  const addRow = (height = 20) => {
    worksheet.getRow(rowIdx).height = height;
    return rowIdx++;
  };

  // ── TITLE BLOCK ───────────────────────────────────────────────────────────
  const bannerRow = addRow(50);
  worksheet.mergeCells(`A${bannerRow}:I${bannerRow}`);
  const bannerCell = worksheet.getCell(`A${bannerRow}`);
  bannerCell.value = `${monthName.toUpperCase()} ${year}`;
  bannerCell.fill = fill(COLORS.DARK_NAVY);
  bannerCell.font = font({ bold: true, size: 26, color: { argb: COLORS.ORANGE } });
  bannerCell.alignment = align("center", "middle");

  const headingRow = addRow(28);
  worksheet.mergeCells(`A${headingRow}:I${headingRow}`);
  const headingCell = worksheet.getCell(`A${headingRow}`);
  headingCell.value = "INVOICE SUMMARY DASHBOARD";
  headingCell.fill = fill(COLORS.ORANGE);
  headingCell.font = font({ bold: true, size: 14, color: { argb: COLORS.WHITE } });
  headingCell.alignment = align("center", "middle");

  const companyRow = addRow(22);
  worksheet.mergeCells(`A${companyRow}:I${companyRow}`);
  const companyCell = worksheet.getCell(`A${companyRow}`);
  companyCell.value = `DIGIDENT INDIA PRIVATE LIMITED  ·  GSTIN: ${companyGstin}  ·  Confidential`;
  companyCell.fill = fill(COLORS.DARK_GRAY);
  companyCell.font = font({ size: 9, color: { argb: "FF9CA3AF" } });
  companyCell.alignment = align("center", "middle");

  addRow(12); // spacer

  // ── KPI CARDS (2-column grid) ─────────────────────────────────────────────
  const kpiHeader = addRow(26);
  worksheet.mergeCells(`A${kpiHeader}:I${kpiHeader}`);
  const kpiHeaderCell = worksheet.getCell(`A${kpiHeader}`);
  kpiHeaderCell.value = "  KEY PERFORMANCE INDICATORS";
  kpiHeaderCell.fill = fill(COLORS.DARK_NAVY);
  kpiHeaderCell.font = font({ bold: true, size: 11, color: { argb: COLORS.ORANGE } });
  kpiHeaderCell.alignment = align("left", "middle");

  const kpiData = [
    {
      label: "Total Invoices",
      value: invoices.length,
      suffix: "",
      color: COLORS.DARK_NAVY,
      bg: COLORS.LIGHT_GRAY,
    },
    {
      label: "✔  Paid",
      value: paidInvs.length,
      suffix: "",
      color: COLORS.GREEN,
      bg: COLORS.GREEN_BG,
    },
    {
      label: "⚠  Partially Paid",
      value: partialInvs.length,
      suffix: "",
      color: COLORS.YELLOW,
      bg: COLORS.YELLOW_BG,
    },
    {
      label: "⏳ Unpaid / Issued",
      value: issuedInvs.length,
      suffix: "",
      color: COLORS.RED,
      bg: COLORS.RED_BG,
    },
    {
      label: "Gross Billing",
      value: totGross,
      suffix: "₹",
      color: COLORS.DARK_NAVY,
      bg: COLORS.WHITE,
    },
    {
      label: "Total Discounts",
      value: totDisc,
      suffix: "₹",
      color: COLORS.YELLOW,
      bg: COLORS.YELLOW_BG,
    },
    {
      label: "Net Value (ex. Tax)",
      value: totNet,
      suffix: "₹",
      color: COLORS.DARK_NAVY,
      bg: COLORS.WHITE,
    },
    {
      label: "GST / Tax Collected",
      value: totTax,
      suffix: "₹",
      color: COLORS.MID_GRAY,
      bg: COLORS.LIGHT_GRAY,
    },
    {
      label: "Total Payable",
      value: totPayable,
      suffix: "₹",
      color: COLORS.DARK_NAVY,
      bg: COLORS.ORANGE_MID,
    },
    {
      label: "Amount Collected",
      value: totPaid,
      suffix: "₹",
      color: COLORS.GREEN,
      bg: COLORS.GREEN_BG,
    },
    {
      label: "Outstanding / Due",
      value: totDue,
      suffix: "₹",
      color: COLORS.RED,
      bg: COLORS.RED_BG,
    },
    {
      label: "Collection Rate",
      value: collectRate,
      suffix: "",
      color: COLORS.BLUE,
      bg: COLORS.BLUE_BG,
    },
  ];

  kpiData.forEach((kpi) => {
    const kpiRow = addRow(24);
    // Label cell (cols A-E merged)
    worksheet.mergeCells(`A${kpiRow}:E${kpiRow}`);
    const labelCell = worksheet.getCell(`A${kpiRow}`);
    labelCell.value = "  " + kpi.label;
    labelCell.fill = fill(COLORS.LIGHT_GRAY);
    labelCell.font = font({ size: 10.5, color: { argb: COLORS.DARK_GRAY }, bold: false });
    labelCell.alignment = align("left", "middle");
    labelCell.border = { bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } } };

    // Value cell (cols F-I merged)
    worksheet.mergeCells(`F${kpiRow}:I${kpiRow}`);
    const valueCell = worksheet.getCell(`F${kpiRow}`);
    valueCell.fill = fill(kpi.bg);
    valueCell.font = font({ bold: true, size: 11, color: { argb: kpi.color } });
    valueCell.alignment = align("center", "middle");
    valueCell.border = { bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } } };

    if (kpi.suffix === "₹") {
      valueCell.value = typeof kpi.value === "number" ? +kpi.value.toFixed(2) : kpi.value;
      valueCell.numFmt = "₹ #,##0.00";
    } else {
      valueCell.value = kpi.value;
    }
  });

  addRow(16); // spacer

  // ── CUSTOMER BREAKDOWN TABLE ──────────────────────────────────────────────
  const cbHeader = addRow(26);
  worksheet.mergeCells(`A${cbHeader}:I${cbHeader}`);
  const cbh = worksheet.getCell(`A${cbHeader}`);
  cbh.value = `  CUSTOMER-WISE BREAKDOWN — ${monthName.toUpperCase()} ${year}`;
  cbh.fill = fill(COLORS.DARK_NAVY);
  cbh.font = font({ bold: true, size: 11, color: { argb: COLORS.ORANGE } });
  cbh.alignment = align("left", "middle");

  // Sub-headers
  const cbColHeaders = [
    "",
    "Customer Name",
    "",
    "City",
    "",
    "Invoices",
    "Total Payable (₹)",
    "Paid (₹)",
    "Due (₹)",
  ];
  const cbSubRow = addRow(26);
  cbColHeaders.forEach((cbColHeader, index) => {
    const cell = worksheet.getCell(cbSubRow, index + 1);
    cell.value = cbColHeader;
    cell.fill = fill(COLORS.ORANGE);
    cell.font = font({ bold: true, size: 9.5, color: { argb: COLORS.WHITE } });
    cell.alignment = index >= 5 ? align("center", "middle") : align("left", "middle");
    cell.border = border(COLORS.ORANGE_MID);
  });

  // Group by customer
  const custMap = {};
  invoices.forEach((invoice) => {
    const key = invoice.billTo?.companyName || invoice.billTo?.contactPerson || "Unknown";
    const city = invoice.billTo?.city || invoice.billTo?.address?.split(",").pop()?.trim() || "-";
    if (!custMap[key]) custMap[key] = { city, count: 0, payable: 0, paid: 0, due: 0 };
    custMap[key].count++;
    custMap[key].payable += invoice.summary?.totalPayAmount || 0;
    custMap[key].paid += invoice.summary?.paidAmount || 0;
    custMap[key].due += invoice.summary?.amountToPay || 0;
  });

  Object.entries(custMap)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .forEach(([name, value], idx) => {
      const customerRow = addRow(21);
      const isOdd = idx % 2 === 0;
      const rowBackground = isOdd ? COLORS.WHITE : COLORS.ROW_ALT;

      // Name (cols A-C)
      worksheet.mergeCells(`A${customerRow}:C${customerRow}`);
      const nameCell = worksheet.getCell(`A${customerRow}`);
      nameCell.value = "  " + name;
      nameCell.fill = fill(rowBackground);
      nameCell.font = font({ bold: true, size: 9.5, color: { argb: COLORS.DARK_NAVY } });
      nameCell.alignment = align("left", "middle");
      nameCell.border = border(COLORS.BORDER_LIGHT);

      // City (cols D-E)
      worksheet.mergeCells(`D${customerRow}:E${customerRow}`);
      const cityCell = worksheet.getCell(`D${customerRow}`);
      cityCell.value = value.city;
      cityCell.fill = fill(rowBackground);
      cityCell.font = font({ size: 9, color: { argb: COLORS.MID_GRAY } });
      cityCell.alignment = align("left", "middle");
      cityCell.border = border(COLORS.BORDER_LIGHT);

      // Count
      const invoiceCountCell = worksheet.getCell(customerRow, 6);
      invoiceCountCell.value = value.count;
      invoiceCountCell.fill = fill(rowBackground);
      invoiceCountCell.font = font({ bold: true, size: 9.5, color: { argb: COLORS.ORANGE } });
      invoiceCountCell.alignment = align("center", "middle");
      invoiceCountCell.border = border(COLORS.BORDER_LIGHT);

      // Payable
      const payableCell = worksheet.getCell(customerRow, 7);
      payableCell.value = +value.payable.toFixed(2);
      payableCell.fill = fill(rowBackground);
      payableCell.font = font({ size: 9.5, color: { argb: COLORS.DARK_NAVY } });
      payableCell.alignment = align("right", "middle");
      payableCell.numFmt = "#,##0.00";
      payableCell.border = border(COLORS.BORDER_LIGHT);

      // Paid
      const paidCell = worksheet.getCell(customerRow, 8);
      paidCell.value = +value.paid.toFixed(2);
      paidCell.fill = fill(rowBackground);
      paidCell.font = font({
        size: 9.5,
        color: { argb: value.paid > 0 ? COLORS.GREEN : COLORS.MID_GRAY },
      });
      paidCell.alignment = align("right", "middle");
      paidCell.numFmt = "#,##0.00";
      paidCell.border = border(COLORS.BORDER_LIGHT);

      // Due
      const dueCell = worksheet.getCell(customerRow, 9);
      dueCell.value = +value.due.toFixed(2);
      dueCell.fill = fill(value.due > 0 ? COLORS.RED_BG : COLORS.GREEN_BG);
      dueCell.font = font({
        bold: value.due > 0,
        size: 9.5,
        color: { argb: value.due > 0 ? COLORS.RED : COLORS.GREEN },
      });
      dueCell.alignment = align("right", "middle");
      dueCell.numFmt = "#,##0.00";
      dueCell.border = border(COLORS.BORDER_LIGHT);
    });

  // ── Customer Totals ───────────────────────────────────────────────────────
  const ctRow = addRow(24);
  worksheet.mergeCells(`A${ctRow}:C${ctRow}`);
  const cta = worksheet.getCell(`A${ctRow}`);
  cta.value = "  GRAND TOTAL";
  cta.fill = fill(COLORS.DARK_NAVY);
  cta.font = font({ bold: true, size: 10.5, color: { argb: COLORS.WHITE } });
  cta.alignment = align("left", "middle");

  worksheet.mergeCells(`D${ctRow}:E${ctRow}`);
  worksheet.getCell(`D${ctRow}`).fill = fill(COLORS.DARK_NAVY);

  const ctCount = worksheet.getCell(ctRow, 6);
  ctCount.value = invoices.length;
  ctCount.fill = fill(COLORS.DARK_NAVY);
  ctCount.font = font({ bold: true, size: 10, color: { argb: COLORS.ORANGE } });
  ctCount.alignment = align("center", "middle");

  [
    [7, totPayable],
    [8, totPaid],
    [9, totDue],
  ].forEach(([col, val]) => {
    const totalCell = worksheet.getCell(ctRow, col);
    totalCell.value = +val.toFixed(2);
    totalCell.fill = fill(COLORS.DARK_NAVY);
    totalCell.font = font({
      bold: true,
      size: 10,
      color: { argb: col === 9 && totDue > 0 ? "FFFF8080" : COLORS.WHITE },
    });
    totalCell.alignment = align("right", "middle");
    totalCell.numFmt = "#,##0.00";
    totalCell.border = border(COLORS.ORANGE, "medium");
  });

  // Footer
  const ftRow = addRow(18);
  worksheet.mergeCells(`A${ftRow}:I${ftRow}`);
  const footerCell = worksheet.getCell(`A${ftRow}`);
  footerCell.value = "Generated by DigiDent CRM  ·  DIGIDENT INDIA PVT. LTD.  ·  Confidential";
  footerCell.fill = fill(COLORS.ORANGE);
  footerCell.font = font({ italic: true, size: 9, color: { argb: COLORS.WHITE } });
  footerCell.alignment = align("center", "middle");
};

// ─── Main Export Function ─────────────────────────────────────────────────────
/**
 * Creates and downloads the monthly invoice report: sheet 1 lists every invoice, sheet 2 is the
 * summary dashboard.
 *
 * @param {object[]} invoices Invoices of the month.
 * @param {number} month 1-12.
 * @param {number} year
 * @returns {Promise<void>}
 */
export const generateExcel = async (invoices, month, year) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Digident India Pvt. Ltd.";
  workbook.created = new Date();
  workbook.modified = new Date();

  const totals = buildInvoiceSheet(workbook, invoices, month, year);
  buildSummarySheet(workbook, invoices, month, year, totals);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Digident_${MONTH_NAMES[month - 1]}_${year}_InvoiceReport.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
