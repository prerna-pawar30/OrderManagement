/**
 * Builds and downloads the credit-note PDF (jsPDF).
 *
 * Used by: 7 files (shared), e.g. components/creditnote/CreateCreditNoteModal.jsx,
 * components/creditnote/CreditNoteDetailModal.jsx, components/creditnote/SettleRefundModal.jsx
 */

import logoMain from "../assets/DigidentLogoWatermark.png";
import logo from "../assets/DigidentLogo.png";

const logoWatermark = logoMain;

const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "-";
const money = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Status comes from the CreditNote itself (status / balance / usage). Old
  // refundHistory-based notes have none of these — fall back to "was it
  // applied to an order?" for those.
  const usage = Array.isArray(creditNote.usage) ? creditNote.usage : [];
  const hasNewStatus = typeof creditNote.status === "string" && creditNote.balance !== undefined;
  const cnTotal = Number(creditNote.summary?.totalAmount ?? creditNote.amount ?? 0);
  const cnBalance = hasNewStatus
    ? Number(creditNote.balance || 0)
    : creditNote.appliedToOrderId
      ? 0
      : cnTotal;
  const cnStatus = hasNewStatus ? creditNote.status : creditNote.appliedToOrderId ? "used" : "open";
  const isApplied = cnStatus === "used"; // nothing left
  const STATUS_TEXT = {
    open: { text: "STATUS: UNUSED CREDIT", color: [200, 130, 20] },
    partially_used: {
      text: `STATUS: PARTLY USED (${cnBalance.toFixed(2)} LEFT)`,
      color: [200, 130, 20],
    },
    used: { text: "STATUS: FULLY USED", color: [34, 160, 80] },
    cancelled: { text: "STATUS: CANCELLED", color: [150, 150, 150] },
  };
  const statusInfo = STATUS_TEXT[cnStatus] || STATUS_TEXT.open;
  const METHOD_TEXT = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank transfer",
    card: "Card",
    other: "Other",
  };
  const sourceOrderDate = creditNote.sourceOrderDate || creditNote.orderDate;
  const gstPercent = Number(creditNote.sourceOrderGstPercentage) || 0;

  // Line items can arrive in either shape depending on where the credit
  // note came from: a manual order's own returnRequests
  // ({ productName, variantName, quantity, price }) or an invoice's line
  // items ({ description, qty, price }) when settled straight off a
  // standalone invoice. Normalize once so the rest of this file doesn't
  // need to care which one it got.
  const rawItems = creditNote.returnedItems || creditNote.items || [];
  const items = rawItems.map((rawItem) => ({
    label:
      rawItem.description ||
      `${rawItem.productName || ""}${rawItem.variantName ? ` — ${rawItem.variantName}` : ""}`,
    quantity: Number(rawItem.qty ?? rawItem.quantity ?? 0),
    price: Number(rawItem.price ?? 0),
    reason: rawItem.reason || null,
  }));

  // Items are GST-inclusive (same convention as everywhere else in this
  // app) — extract the tax portion out for the breakdown rows.
  const grossTotal =
    items.reduce((total, item) => total + item.price * item.quantity, 0) ||
    Number(creditNote.amount) ||
    0;
  const taxableValue = gstPercent > 0 ? grossTotal / (1 + gstPercent / 100) : grossTotal;
  const gstAmount = grossTotal - taxableValue;

  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    try {
      doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
    } catch (error) {
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
    doc.rect(108, 0, pageWidth - 108, 14, "F");
    doc.triangle(108, 0, 108, 14, 93, 0, "F");
    doc.setFont("helvetica", "bold").setFontSize(26).setTextColor(0);
    doc.text("CREDIT NOTE", 14, 30);
    try {
      doc.addImage(logo, "PNG", 148, 16, 47, 18, "main_logo");
    } catch (error) {
      doc.setFontSize(15).setTextColor(...ORANGE);
      doc.text("Digident", 162, 9);
    }
  };

  const drawFooter = () => {
    doc.setFillColor(...BLACK);
    doc.rect(0, pageHeight - 13, 100, 13, "F");
    doc.triangle(100, pageHeight - 13, 100, pageHeight, 116, pageHeight, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(158, pageHeight - 7, pageWidth - 158, 7, "F");
    doc.triangle(158, pageHeight - 7, 158, pageHeight, 143, pageHeight, "F");
    doc
      .setFont("helvetica", "bold")
      .setFontSize(11.5)
      .setTextColor(...BLACK);
    doc.text(SELLER.companyName + ".", 14, pageHeight - 26);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(doc.splitTextToSize(SELLER.address, 180), 14, pageHeight - 21);
    doc.setTextColor(...WHITE);
    doc.text(`Email: ${SELLER.email} | Contact: ${SELLER.contactNumber}`, 14, pageHeight - 6);
  };

  drawHeader();

  /* ── Meta row: Credit Note No / Date / Status (left), Seller GSTIN (right) ── */
  const sourceRef = creditNote.sourceInvoiceNumber || creditNote.sourceOrderId;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
  doc.text(`Credit Note No: ${creditNote.refundId}`, 14, 42);
  doc.text(`Date: ${fmtDate(creditNote.refundedAt)}`, 14, 47.5);
  doc.text(`Against Invoice: ${sourceRef} (${fmtDate(sourceOrderDate)})`, 14, 53);

  doc.setFont("helvetica", "bold");
  doc.text("Our GSTIN", pageWidth - 14, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(SELLER.gstin, pageWidth - 14, 47.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...statusInfo.color);
  doc.text(statusInfo.text, pageWidth - 14, 53, { align: "right" });
  doc.setTextColor(0);

  /* ── Return / Credit From block ── */
  let y = 62;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 7;

  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("RETURN / CREDIT FROM", 14, y);
  doc.text("ISSUED BY", 120, y);
  y += 5.5;
  doc
    .setFont("helvetica", "normal")
    .setFontSize(9.5)
    .setTextColor(...GREY);
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
    body: items.map((item, idx) => [
      String(idx + 1),
      `${item.label}${item.reason ? `\n(${item.reason})` : ""}`,
      String(item.quantity),
      item.price.toFixed(2),
      (item.price * item.quantity).toFixed(2),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: ORANGE,
      textColor: WHITE,
      halign: "center",
      fontStyle: "bold",
      fontSize: 8.5,
    },
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
  const boxX = pageWidth - 14 - boxW;
  doc.setFontSize(9.5);
  const totalsRows = [["Taxable Value", money(taxableValue)]];
  if (gstPercent > 0) totalsRows.push([`GST (${gstPercent}%)`, money(gstAmount)]);
  totalsRows.forEach(([label, value], index) => {
    doc.setTextColor(...GREY).setFont("helvetica", "normal");
    doc.text(label, boxX, y + index * 6);
    doc.setTextColor(0);
    doc.text(value, pageWidth - 14, y + index * 6, { align: "right" });
  });
  y += totalsRows.length * 6 + 2;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(boxX, y, boxW, 11, 1, 1, "F");
  doc
    .setFont("helvetica", "bold")
    .setFontSize(11)
    .setTextColor(...ORANGE);
  doc.text("Credit Note Total", boxX + 4, y + 7.3);
  doc.setTextColor(0);
  doc.text(money(grossTotal), pageWidth - 17, y + 7.3, { align: "right" });
  y += 20;

  /* ── How this credit was used (new CreditNote documents) ── */
  if (usage.length > 0) {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
    doc.text("How this credit was used", 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["DATE", "USED FOR", "AMOUNT"]],
      body: [
        ...usage.map((usageEntry) => [
          fmtDate(usageEntry.at),
          usageEntry.kind === "applied"
            ? `Applied to invoice ${usageEntry.appliedToNumber || usageEntry.appliedToId}${usageEntry.paidExistingInvoice ? " (as payment)" : " (as discount)"}`
            : `Paid back to customer - ${METHOD_TEXT[usageEntry.method] || usageEntry.method || ""}${usageEntry.reference ? ` (Ref: ${usageEntry.reference})` : ""}`,
          money(usageEntry.amount),
        ]),
        ["", "Balance left on this credit note", money(cnBalance)],
      ],
      theme: "plain",
      headStyles: {
        fillColor: [200, 230, 210],
        textColor: [30, 90, 55],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, textColor: [40, 40, 40] },
      columnStyles: { 0: { cellWidth: 30 }, 2: { halign: "right", cellWidth: 35 } },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === usage.length)
          data.cell.styles.fontStyle = "bold";
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  } else if (isApplied && creditNote.appliedToOrderId) {
    /* ── Legacy: applied-to block — its own mini item table, not just an ID ── */
    const appliedRef = creditNote.appliedInvoiceNumber || creditNote.appliedToOrderId;
    doc.setFillColor(230, 245, 235);
    doc.roundedRect(14, y, pageWidth - 28, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(34, 120, 70);
    doc.text(
      `Applied against Invoice ${appliedRef}  ·  ${fmtDate(creditNote.appliedOrderDate)}  ·  Order total ${money(
        creditNote.appliedOrderGrandTotal
      )}`,
      18,
      y + 5.5
    );
    y += 12;

    const appliedItems = (creditNote.appliedOrderItems || []).map((appliedOrderItem) => ({
      label:
        appliedOrderItem.description ||
        `${appliedOrderItem.productName || ""}${appliedOrderItem.variantName ? ` — ${appliedOrderItem.variantName}` : ""}`,
      quantity: appliedOrderItem.qty ?? appliedOrderItem.quantity ?? 0,
    }));
    if (appliedItems.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["ITEM PURCHASED ON THAT ORDER", "QTY"]],
        body: appliedItems.map((appliedItem) => [appliedItem.label, String(appliedItem.quantity)]),
        theme: "plain",
        headStyles: {
          fillColor: [200, 230, 210],
          textColor: [30, 90, 55],
          fontStyle: "bold",
          fontSize: 8,
        },
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
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
  doc.text("Terms & Conditions", 14, y);
  y += 5;
  doc
    .setFont("helvetica", "normal")
    .setFontSize(8.5)
    .setTextColor(...GREY);
  const terms =
    cnStatus === "cancelled"
      ? "This credit note has been cancelled and cannot be used."
      : isApplied
        ? "This credit note has been fully used as shown above and carries no further balance."
        : cnStatus === "partially_used"
          ? `This credit note has been partly used as shown above. The remaining balance of ${money(cnBalance)} can be ` +
            "used toward the customer's next purchase. Please present the Credit Note No. above when redeeming."
          : "This credit note is valid toward the customer's next purchase. " +
            "Please retain this document for your records and present the Credit Note No. above when redeeming.";
  doc.text(doc.splitTextToSize(terms, pageWidth - 28), 14, y);
  y += 16;

  /* ── Signature ── */
  const sigY = Math.max(y + 15, pageHeight - 45);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);
  doc
    .setFont("helvetica", "normal")
    .setFontSize(8.5)
    .setTextColor(...GREY);
  doc.text("Authorised Signatory", pageWidth - 42, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
  doc.text(SELLER.companyName, pageWidth - 42, sigY + 10, { align: "center" });

  drawFooter();

  doc.save(`Digident_CreditNote_${creditNote.refundId}.pdf`);
}
