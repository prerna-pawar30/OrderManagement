import logoMain from "../assets/digident-png 2.png";
import logo from "../assets/digident-png .png";
import bankQR from "../assets/QR.png";
const logoWatermark = logoMain;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) : "-");

/**
 * @param {object} invoice - the real Invoice document (from your existing
 *   Invoice model) — items/summary/totals are all pre-computed by its
 *   pre-save hook, so this function just lays them out.
 * @param {string} [orderId] - the human-readable manual order ID (e.g.
 *   "MORD-..."), passed in separately since the invoice schema's own
 *   orderNumber field is auto-generated and isn't the same value.
 */
export async function generateInvoicePdf(invoice, orderId) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ORANGE = [230, 135, 54];
  const BLACK = [0, 0, 0];
  const WHITE = [255, 255, 255];
  const PW = doc.internal.pageSize.width;
  const PH = doc.internal.pageSize.height;
  const LH = 6;

  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    try {
      doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
    } catch (e) {
      // ignore — watermark is cosmetic only
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
    doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0);
    doc.text("INVOICE", 14, 32);

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
    doc.text((invoice.seller?.companyName || "DIGIDENT INDIA PRIVATE LIMITED").toUpperCase(), 14, PH - 26);

    doc.setFont("helvetica", "normal").setFontSize(10);
    const footerAddr = invoice.seller?.address || "";
    const footerAddrLines = doc.splitTextToSize(footerAddr, 180);
    doc.text(footerAddrLines, 14, PH - 21);

    doc.setTextColor(...WHITE);
    doc.text(
      `Email: ${invoice.seller?.email || "info@digident.in"} | Contact: ${
        invoice.seller?.contactNumber || ""
      }`,
      14,
      PH - 6
    );
  };

  /* ── PAGE 1 ── */
  drawHeader();

  doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(0);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 14, 45);
  doc.text(`Invoice Date: ${fmtDate(invoice.invoiceDate)}`, 14, 51);
  doc.setFont("helvetica", "bold");
  doc.text(`Due Date: ${fmtDate(invoice.dueDate)}`, 14, 57);

  const rightColX = 120;
  let rightY = 75;

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("BILL TO", rightColX, rightY);

  doc.setFont("helvetica", "normal").setFontSize(10);
  rightY += LH;
  doc.text(invoice.billTo?.contactPerson || "N/A", rightColX, rightY);
  rightY += LH;
  doc.text(invoice.billTo?.contactNumber || "N/A", rightColX, rightY);
  rightY += LH;
  doc.setFont("helvetica", "bold");
  doc.text(invoice.billTo?.companyName || "N/A", rightColX, rightY);
  rightY += 5;
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(invoice.billTo?.address || "", 75);
  doc.text(addrLines, rightColX, rightY);
  rightY += addrLines.length * LH;
  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN: ${invoice.billTo?.gstin || "N/A"}`, rightColX, rightY);

  rightY += 10;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Terms of Delivery : ${invoice.termsOfDelivery || "-"}`, rightColX, rightY);
  rightY += LH;
  doc.text(`Shipping Condition : ${invoice.shippingCondition || "-"}`, rightColX, rightY);

  let leftY = 75;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`CUSTOMER NO : ${invoice.customerNo ?? "-"}`, 14, leftY);
  leftY += LH;
  doc.setFont("helvetica", "normal");
  doc.text(`Payment Terms : ${invoice.paymentTerms || "-"}`, 14, leftY);
  leftY += LH;
  doc.setFont("helvetica", "bold");
  doc.text(`Our GSTIN : ${invoice.seller?.gstin || "-"}`, 14, leftY);
  leftY += LH + 5;
  doc.setFont("helvetica", "normal");
  const orderNumberLines = doc.splitTextToSize(
    `Order Number : ${orderId || invoice.orderNumber || "-"}`,
    100
  );
  doc.text(orderNumberLines, 14, leftY);
  leftY += orderNumberLines.length * LH;
  doc.text(`Customer Service Rep : ${invoice.customerServiceRep || "-"}`, 14, leftY);

  // Item fields (grossAmount, discountValue, gstAmount, totalAmount) are all
  // pre-computed by the Invoice schema's pre-save hook — used as-is here.
  const tableRows = (invoice.items || []).map((item) => [
    item.articleNo || "-",
    item.description,
    item.qty,
    item.price,
    `${(item.discountPercent || 0).toFixed(2)}%`,
    (item.discountValue || 0).toFixed(2),
    (item.totalAmount || 0).toFixed(2),
    `${item.gstType || "IGST"} ${item.gstPercent || 0}%`,
  ]);

  // Table start is computed from whichever column (BILL TO on the right,
  // CUSTOMER NO on the left) ended up taller, with a floor of 155mm to match
  // the reference layout — a long address or shipping note can no longer
  // push the table up into the info blocks above it.
  const tableStartY = Math.max(rightY, leftY, 145) + 15;

  autoTable(doc, {
    startY: tableStartY,
    head: [["ART. NO", "DESCRIPTION", "QTY", "PRICE", "DISC (%)", "DISC VALUE", "Total Amount", "GST %"]],
    body: tableRows,
    theme: "plain",
    headStyles: { fillColor: ORANGE, textColor: WHITE, halign: "center" },
    bodyStyles: { fontSize: 8.5, halign: "center", cellPadding: 3 },
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

  drawFooter();

  /* ── PAGE 2 ── */
  doc.addPage();
  drawHeader();

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...ORANGE);
  doc.text("SUMMARY & TAX DETAILS", 14, 50);

  const s = invoice.summary || {};
  autoTable(doc, {
    startY: 60,
    head: [["DESCRIPTION", "GOODS", "FREIGHT", "TOTAL"]],
    body: [
      [
        "Net Value",
        (s.totalNet || 0).toFixed(2),
        (s.freightCost || 0).toFixed(2),
        ((s.totalNet || 0) + (s.freightCost || 0)).toFixed(2),
      ],
      ["Total Discount", (s.totalDiscount || 0).toFixed(2), "0.00", (s.totalDiscount || 0).toFixed(2)],
      ["Total Tax", (s.totalTax || 0).toFixed(2), "0.00", (s.totalTax || 0).toFixed(2)],
      [
        "Grand Total",
        (s.totalPayAmount || 0).toFixed(2),
        (s.freightCost || 0).toFixed(2),
        (s.totalPayAmount || 0).toFixed(2),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: ORANGE },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    margin: { left: 110 },
    body: [
      ["Total Payable", `INR ${(s.totalPayAmount || 0).toLocaleString("en-IN")}`],
      ["Paid Amount", `INR ${(s.paidAmount || 0).toLocaleString("en-IN")}`],
      ["Balance Due", `INR ${(s.amountToPay || 0).toLocaleString("en-IN")}`],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  const bd = invoice.bankDetails || {};
  const hasBankDetails = bd.accountNo || bd.holderName || bd.ifscCode;
  if (hasBankDetails) {
    const finalY = doc.lastAutoTable.finalY + 15;
    const qrSize = 35;

    try {
      doc.addImage(bankQR, "PNG", 14, finalY, qrSize, qrSize, undefined, "FAST");
    } catch (e) {
      // ignore — QR is cosmetic only
    }

    const textX = 14 + qrSize + 10;
    let textY = finalY + 5;

    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(0);
    doc.text("Bank Details", textX, textY);
    doc.setFont("helvetica", "normal").setFontSize(10);
    textY += 7;
    doc.text(`Account No : ${bd.accountNo || ""}`, textX, textY);
    textY += 6;
    doc.text(`Account Type : ${bd.accountType || ""}`, textX, textY);
    textY += 6;
    doc.text(`IFSC Code : ${bd.ifscCode || ""}`, textX, textY);
    textY += 6;
    doc.text(`Holder Name : ${bd.holderName || ""}`, textX, textY);
  }

  drawFooter();
  doc.save(`Digident_Invoice_${invoice.invoiceNumber}.pdf`);
}
