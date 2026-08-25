import logoMain from "../assets/digident-png 2.png";
import logo from "../assets/digident-png .png";

const logoWatermark = logoMain;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const money = (n) => `INR ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SELLER = {
  companyName: "DIGIDENT INDIA PRIVATE LIMITED",
  address:
    "314, Professor Colony, Near Matlani Garden, Behind Agrawal Sweets, Sapna Sangita Road, Indore, (M.P.) 452001.",
  gstin: "23AAKCD9669F1ZA",
  email: "info@digident.in",
  contactNumber: "+91 9294503001",
};

/**
 * @param {object} creditNote - refundId, amount, refundedAt, refundedBy,
 *   sourceOrderId, sourceOrderDate/orderDate, sourceOrderGstPercentage,
 *   customerName, customerPhone, customerEmail, returnedItems,
 *   appliedToOrderId, appliedOrderDate, appliedOrderGrandTotal
 */
export async function generateCreditNotePdf(creditNote) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ORANGE = [230, 135, 54];
  const BLACK = [0, 0, 0];
  const WHITE = [255, 255, 255];
  const GREY = [90, 90, 90];
  const LIGHT = [245, 240, 235];
  const PW = doc.internal.pageSize.width;
  const PH = doc.internal.pageSize.height;

  const isApplied = Boolean(creditNote.appliedToOrderId);
  const sourceOrderDate = creditNote.sourceOrderDate || creditNote.orderDate;
  const items = creditNote.returnedItems || [];
  const gstPercent = Number(creditNote.sourceOrderGstPercentage) || 0;

  // Items are GST-inclusive (same convention as everywhere else in this
  // app) — extract the tax portion out for the breakdown rows.
  const grossTotal = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0) || Number(creditNote.amount) || 0;
  const taxableValue = gstPercent > 0 ? grossTotal / (1 + gstPercent / 100) : grossTotal;
  const gstAmount = grossTotal - taxableValue;

  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    try {
      doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
    } catch (e) {
      // cosmetic only
    }
    doc.restoreGraphicsState();
  };

  const drawHeader = () => {
    drawWatermark();
    doc.setFillColor(...ORANGE);
    doc.rect(0, 4, 45, 4, "F");
    doc.rect(0, 10, 34, 4, "F");
    doc.setFillColor(...BLACK);
    doc.rect(108, 0, PW - 108, 14, "F");
    doc.triangle(108, 0, 108, 14, 93, 0, "F");
    doc.setFont("helvetica", "bold").setFontSize(26).setTextColor(0);
    doc.text("CREDIT NOTE", 14, 30);
    try {
      doc.addImage(logo, "PNG", 148, 16, 47, 18, "main_logo");
    } catch (e) {
      doc.setFontSize(15).setTextColor(...ORANGE);
      doc.text("Digident", 162, 9);
    }
  };

  const drawFooter = () => {
    doc.setFillColor(...BLACK);
    doc.rect(0, PH - 13, 100, 13, "F");
    doc.triangle(100, PH - 13, 100, PH, 116, PH, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(158, PH - 7, PW - 158, 7, "F");
    doc.triangle(158, PH - 7, 158, PH, 143, PH, "F");
    doc.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(...BLACK);
    doc.text(SELLER.companyName + ".", 14, PH - 26);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(doc.splitTextToSize(SELLER.address, 180), 14, PH - 21);
    doc.setTextColor(...WHITE);
    doc.text(`Email: ${SELLER.email} | Contact: ${SELLER.contactNumber}`, 14, PH - 6);
  };

  drawHeader();

  /* ── Meta row: Credit Note No / Date / Status (left), Seller GSTIN (right) ── */
  const sourceRef = creditNote.sourceInvoiceNumber || creditNote.sourceOrderId;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
  doc.text(`Credit Note No: ${creditNote.refundId}`, 14, 42);
  doc.text(`Date: ${fmtDate(creditNote.refundedAt)}`, 14, 47.5);
  doc.text(`Against Invoice: ${sourceRef} (${fmtDate(sourceOrderDate)})`, 14, 53);

  doc.setFont("helvetica", "bold");
  doc.text("Our GSTIN", PW - 14, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(SELLER.gstin, PW - 14, 47.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(isApplied ? [34, 160, 80] : [200, 130, 20]));
  doc.text(isApplied ? "STATUS: APPLIED" : "STATUS: UNUSED CREDIT", PW - 14, 53, { align: "right" });
  doc.setTextColor(0);

  /* ── Return / Credit From block ── */
  let y = 62;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.line(14, y, PW - 14, y);
  y += 7;

  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("RETURN / CREDIT FROM", 14, y);
  doc.text("ISSUED BY", 120, y);
  y += 5.5;
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GREY);
  doc.text(creditNote.customerName || "-", 14, y);
  doc.text(SELLER.companyName, 120, y);
  y += 5;
  doc.text(creditNote.customerPhone || "-", 14, y);
  const addrLines = doc.splitTextToSize(SELLER.address, 75);
  doc.text(addrLines, 120, y);
  if (creditNote.customerEmail) {
    y += 5;
    doc.text(creditNote.customerEmail, 14, y);
  }
  y += addrLines.length * 5 + 6;
  doc.setTextColor(0);

  /* ── Items table ── */
  autoTable(doc, {
    startY: y,
    head: [["#", "ITEM DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
    body: items.map((it, idx) => [
      String(idx + 1),
      `${it.productName}${it.variantName ? ` — ${it.variantName}` : ""}${it.reason ? `\n(${it.reason})` : ""}`,
      String(it.quantity),
      Number(it.price).toFixed(2),
      (Number(it.price) * Number(it.quantity)).toFixed(2),
    ]),
    theme: "plain",
    headStyles: { fillColor: ORANGE, textColor: WHITE, halign: "center", fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 30 },
    },
    didDrawCell: (data) => {
      if (data.section === "body") {
        doc.setDrawColor(...ORANGE);
        doc.setLineWidth(0.1);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  /* ── Totals box (right-aligned) ── */
  const boxW = 85;
  const boxX = PW - 14 - boxW;
  doc.setFontSize(9.5);
  const totalsRows = [["Taxable Value", money(taxableValue)]];
  if (gstPercent > 0) totalsRows.push([`GST (${gstPercent}%)`, money(gstAmount)]);
  totalsRows.forEach(([label, value], i) => {
    doc.setTextColor(...GREY).setFont("helvetica", "normal");
    doc.text(label, boxX, y + i * 6);
    doc.setTextColor(0);
    doc.text(value, PW - 14, y + i * 6, { align: "right" });
  });
  y += totalsRows.length * 6 + 2;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(boxX, y, boxW, 11, 1, 1, "F");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...ORANGE);
  doc.text("Credit Note Total", boxX + 4, y + 7.3);
  doc.setTextColor(0);
  doc.text(money(grossTotal), PW - 17, y + 7.3, { align: "right" });
  y += 20;

  /* ── Applied-to block, if used — its own mini item table, not just an ID ── */
  if (isApplied) {
    const appliedRef = creditNote.appliedInvoiceNumber || creditNote.appliedToOrderId;
    doc.setFillColor(230, 245, 235);
    doc.roundedRect(14, y, PW - 28, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(34, 120, 70);
    doc.text(
      `Applied against Invoice ${appliedRef}  ·  ${fmtDate(creditNote.appliedOrderDate)}  ·  Order total ${money(
        creditNote.appliedOrderGrandTotal
      )}`,
      18,
      y + 5.5
    );
    y += 12;

    const appliedItems = creditNote.appliedOrderItems || [];
    if (appliedItems.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["ITEM PURCHASED ON THAT ORDER", "QTY"]],
        body: appliedItems.map((it) => [
          `${it.productName}${it.variantName ? ` — ${it.variantName}` : ""}`,
          String(it.quantity),
        ]),
        theme: "plain",
        headStyles: { fillColor: [200, 230, 210], textColor: [30, 90, 55], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8.5, cellPadding: 2.5, textColor: [40, 40, 40] },
        columnStyles: { 1: { halign: "center", cellWidth: 20 } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      y += 4;
    }
  }

  /* ── Terms & Conditions ── */
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(14, y, PW - 14, y);
  y += 6;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
  doc.text("Terms & Conditions", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GREY);
  const terms = isApplied
    ? "This credit note has been fully applied to the order referenced above and carries no further balance."
    : "This credit note is valid toward the customer's next purchase and is not exchangeable for cash. " +
      "Please retain this document for your records and present the Credit Note No. above when redeeming.";
  doc.text(doc.splitTextToSize(terms, PW - 28), 14, y);
  y += 16;

  /* ── Signature ── */
  const sigY = Math.max(y + 15, PH - 45);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.line(PW - 70, sigY, PW - 14, sigY);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GREY);
  doc.text("Authorised Signatory", PW - 42, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
  doc.text(SELLER.companyName, PW - 42, sigY + 10, { align: "center" });

  drawFooter();

  doc.save(`Digident_CreditNote_${creditNote.refundId}.pdf`);
}
