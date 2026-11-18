/**
 * Builds and downloads a customer statement PDF (all invoices, paid, due) in the Digident design.
 *
 * Layout:
 * • orange bars + black ribbon header, logo top-right, faint watermark
 * • customer block with orange accent bar, statement date on the right
 * • 3 summary cards (Total Invoices / Total Billed / Balance Due)
 * • invoice table, Grand Total bar, Authorised Signatory, footer bands
 * A long list continues on the next page; every page repeats the header and footer, and the table
 * never overlaps the footer.
 *
 * Used by: pages/CustomerDetailPage.jsx, pages/InvoiceListPage.jsx
 */

import headerLogo from "../assets/DigidentLogo.png";
import watermarkLogo from "../assets/DigidentLogoWatermark.png";

const ORA = [230, 135, 54];
const BLK = [0, 0, 0];
const WHT = [255, 255, 255];
const GRY = [245, 245, 245];
const RED = [210, 50, 50];
const GRN = [34, 160, 80];
const AMB = [180, 130, 20];

const DEFAULT_ADDR =
  "Digident India Pvt Ltd, 314, Professor Colony, Near Matlani Garden, Behind Agrawal Sweets, Sapna Sangita Road,Indore, (M.P.) 452001.";

const inr = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fixed = (amount) => Number(amount || 0).toFixed(2);

// Paid / balance per invoice: when amountToPay is missing, use total − paid
const figuresOf = (invoice) => {
  const total = Number(invoice.summary?.totalPayAmount) || 0;
  const paid = Number(invoice.summary?.paidAmount) || 0;
  // Returned goods value: items[].returnedQty × price (or from returns[])
  let returned = (invoice.items || []).reduce(
    (total, item) => total + (Number(item.returnedQty) || 0) * (Number(item.price) || 0),
    0
  );
  if (!returned && Array.isArray(invoice.returns)) {
    returned = invoice.returns.reduce(
      (total, currentReturn) =>
        total +
        (currentReturn.items || []).reduce(
          (total, item) => total + (Number(item.quantity) || 0) * (Number(item.price) || 0),
          0
        ),
      0
    );
  }
  const due =
    invoice.summary?.amountToPay != null
      ? Number(invoice.summary.amountToPay) || 0
      : Math.max(0, total - paid - returned);
  return { total, paid, due, returned };
};

const invNo = (invoiceNumber) =>
  invoiceNumber ? `#${String(invoiceNumber).replace(/^#+/, "")}` : "—";

/**
 * @param {object} group  { customerName, contactPerson, contactNumber, allInvoices, totalAmount }
 */
export async function generateStatementPdf(group) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297

  const invoices = group.allInvoices || group.invoices || [];
  const seller = invoices[0]?.seller || {};

  /* ── Watermark ── */
  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    try {
      doc.addImage(watermarkLogo, "PNG", 20, 60, 170, 140, undefined, "FAST");
    } catch {}
    doc.restoreGraphicsState();
  };

  /* ── Header ── */
  const drawHeader = () => {
    drawWatermark();
    doc.setFillColor(...ORA);
    doc.rect(0, 4, 45, 4, "F");
    doc.rect(0, 10, 34, 4, "F");
    doc.setFillColor(...BLK);
    doc.rect(108, 0, pageWidth - 108, 14, "F");
    doc.triangle(108, 0, 108, 14, 93, 0, "F");
    doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0);
    doc.text("STATEMENT", 14, 32);
    try {
      doc.addImage(headerLogo, "PNG", 148, 16, 47, 18, "lg");
    } catch {
      doc.setFontSize(15).setTextColor(...ORA);
      doc.text("Digident", 162, 28);
    }
  };

  /* ── Footer ── */
  const drawFooter = () => {
    doc.setFillColor(...BLK);
    doc.rect(0, pageHeight - 13, 100, 13, "F");
    doc.triangle(100, pageHeight - 13, 100, pageHeight, 116, pageHeight, "F");
    doc.setFillColor(...ORA);
    doc.rect(158, pageHeight - 7, pageWidth - 158, 7, "F");
    doc.triangle(158, pageHeight - 7, 158, pageHeight, 143, pageHeight, "F");

    doc
      .setFont("helvetica", "bold")
      .setFontSize(10)
      .setTextColor(...BLK);
    doc.text("DIGIDENT INDIA PRIVATE LIMITED.", 14, pageHeight - 28);

    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(seller.address || DEFAULT_ADDR, 180), 14, pageHeight - 23);

    doc
      .setFont("helvetica", "normal")
      .setFontSize(9)
      .setTextColor(...WHT);
    doc.text(
      `Email: ${seller.email || "info@digident.in"}  |  Contact: ${seller.contactNumber || "+91 9294503001"}`,
      14,
      pageHeight - 5
    );
  };

  /* ══════════ PAGE 1 ══════════ */
  drawHeader();

  // Customer block
  doc.setFillColor(...ORA);
  doc.rect(14, 42, 3, 20, "F");
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(0);
  doc.text(String(group.customerName || "Customer"), 21, 50);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80, 80, 80);
  if (group.contactPerson) doc.text(String(group.contactPerson), 21, 57);
  if (group.contactNumber) doc.text(String(group.contactNumber), 21, 63);

  // Statement date
  doc
    .setFont("helvetica", "bold")
    .setFontSize(8)
    .setTextColor(...ORA);
  doc.text("STATEMENT DATE", pageWidth - 14, 44, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
  doc.text(
    new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    pageWidth - 14,
    51,
    { align: "right" }
  );

  // Divider
  doc.setDrawColor(...ORA);
  doc.setLineWidth(0.3);
  doc.line(14, 68, pageWidth - 14, 68);

  // Totals
  const figs = invoices.map(figuresOf);
  const totalBilled = group.totalAmount ?? figs.reduce((total, figure) => total + figure.total, 0);
  const totalPaid = figs.reduce((total, figure) => total + figure.paid, 0);
  const remaining = figs.reduce((total, figure) => total + figure.due, 0);
  const totalReturned = figs.reduce((total, figure) => total + figure.returned, 0);

  // Summary cards
  const cardY = 73;
  const cardH = 24;
  const cardW = (pageWidth - 28 - 12) / 3;
  [
    { label: "TOTAL INVOICES", value: String(invoices.length), accent: ORA },
    { label: "TOTAL BILLED", value: inr(totalBilled), accent: ORA },
    { label: "BALANCE DUE", value: inr(remaining), accent: remaining > 0.01 ? RED : GRN },
  ].forEach((card, index) => {
    const centerX = 14 + index * (cardW + 6);
    doc.setFillColor(...GRY);
    doc.roundedRect(centerX, cardY, cardW, cardH, 2, 2, "F");
    doc.setFillColor(...card.accent);
    doc.roundedRect(centerX, cardY, cardW, 2, 1, 1, "F");
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(120, 120, 120);
    doc.text(card.label, centerX + cardW / 2, cardY + 9, { align: "center" });
    doc
      .setFont("helvetica", "bold")
      .setFontSize(11)
      .setTextColor(...card.accent);
    doc.text(card.value, centerX + cardW / 2, cardY + 19, { align: "center" });
  });

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 100, 100);
  doc.text(
    `Total Returned: ${inr(totalReturned)}   |   Total Paid: ${inr(totalPaid)}`,
    pageWidth - 14,
    cardY + cardH + 7,
    { align: "right" }
  );

  /* ── Invoice table ── */
  const FOOTER_SPACE = 36; // footer text + bands
  autoTable(doc, {
    startY: cardY + cardH + 14,
    head: [
      ["Inv No.", "Date", "Total (INR)", "Returned (INR)", "Paid (INR)", "Balance (INR)", "Status"],
    ],
    body: invoices.map((invoice, index) => [
      invNo(invoice.invoiceNumber),
      invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "—",
      fixed(figs[index].total),
      fixed(figs[index].returned),
      fixed(figs[index].paid),
      fixed(figs[index].due),
      String(invoice.status || "")
        .replace(/_/g, " ")
        .toUpperCase(),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: ORA,
      textColor: WHT,
      halign: "center",
      fontSize: 8.5,
      fontStyle: "bold",
      cellPadding: 4,
    },
    bodyStyles: { fontSize: 8.5, halign: "center", cellPadding: 3.5, textColor: [30, 30, 30] },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", textColor: [200, 90, 20] },
      1: { textColor: [80, 80, 80] },
      5: { fontStyle: "bold" },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") return;
      if (hookData.column.index === 3 && parseFloat(hookData.cell.raw) > 0) {
        hookData.cell.styles.textColor = AMB;
      }
      if (hookData.column.index === 5) {
        hookData.cell.styles.textColor = parseFloat(hookData.cell.raw) > 0.01 ? RED : GRN;
      }
      if (hookData.column.index === 6) {
        const statusText = String(hookData.cell.raw || "").toLowerCase();
        hookData.cell.styles.textColor =
          statusText === "paid" || statusText === "issued"
            ? GRN
            : statusText === "overdue"
              ? RED
              : AMB;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== "body") return;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.line(
        hookData.cell.x,
        hookData.cell.y + hookData.cell.height,
        hookData.cell.x + hookData.cell.width,
        hookData.cell.y + hookData.cell.height
      );
    },
    // Page 2+: header again, the table continues below it
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) drawHeader();
    },
    margin: { left: 14, right: 14, top: 42, bottom: FOOTER_SPACE },
  });

  /* ── Grand Total bar + signatory (jagah na ho to naya page) ── */
  let sumY = doc.lastAutoTable.finalY + 6;
  const needed = 10 + 24 + 26; // bar + gap + signatory block
  if (sumY + needed > pageHeight - FOOTER_SPACE) {
    doc.addPage();
    drawHeader();
    sumY = 44;
  }

  doc.setFillColor(245, 240, 235);
  doc.roundedRect(14, sumY, pageWidth - 28, 10, 1, 1, "F");
  doc
    .setFont("helvetica", "bold")
    .setFontSize(9)
    .setTextColor(...ORA);
  doc.text("Grand Total", 18, sumY + 6.5);
  const colX = (fraction) => 14 + (pageWidth - 28) * fraction;
  doc.setTextColor(0);
  doc.text(`Billed ${inr(totalBilled)}`, colX(0.3), sumY + 6.5, { align: "center" });
  doc.setTextColor(...AMB);
  doc.text(`Returned ${inr(totalReturned)}`, colX(0.52), sumY + 6.5, { align: "center" });
  doc.setTextColor(...(totalPaid > 0 ? GRN : [100, 100, 100]));
  doc.text(`Paid ${inr(totalPaid)}`, colX(0.72), sumY + 6.5, { align: "center" });
  doc.setTextColor(...(remaining > 0.01 ? RED : GRN));
  doc.text(`Due ${inr(remaining)}`, colX(0.9), sumY + 6.5, { align: "center" });

  // Authorised Signatory: bottom of the page, just above the footer
  const sigY = Math.max(pageHeight - 50, sumY + 24);
  doc.setDrawColor(...ORA);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 75, sigY, pageWidth - 14, sigY);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(100, 100, 100);
  doc.text("Authorised Signatory", pageWidth - 44.5, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
  doc.text("DIGIDENT INDIA PRIVATE LIMITED.", pageWidth - 44.5, sigY + 11, { align: "center" });

  // Footer har page par
  const pages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
    doc.setPage(pageNumber);
    drawFooter();
  }

  doc.save(`Statement_${String(group.customerName || "customer").replace(/\s+/g, "_")}.pdf`);
}
