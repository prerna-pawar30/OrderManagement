import logoMain from "../assets/digident-png 2.png";

// Same visual design as the "Statement" PDF InvoiceListPage generates per
// invoice-customerNo group — pulled out here so the Customer Detail page
// (which resolves a customer from manual orders + their linked invoices,
// not from customerNo) can produce an identical document.
//
// @param {object} params
// @param {string} params.customerName
// @param {string} [params.contactPerson]
// @param {string} [params.contactNumber]
// @param {Array}  params.invoices - real Invoice documents (invoiceNumber,
//   invoiceDate, status, summary.{totalPayAmount,paidAmount,amountToPay})
export async function generateStatementPdf({ customerName, contactPerson, contactNumber, invoices = [] }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ORA = [230, 135, 54];
  const BLK = [0, 0, 0];
  const WHT = [255, 255, 255];
  const GRY = [245, 245, 245];
  const PW = doc.internal.pageSize.width;
  const PH = doc.internal.pageSize.height;

  const sorted = [...invoices].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  const seller = sorted[0]?.seller || {};

  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    try {
      doc.addImage(logoMain, "PNG", 20, 60, 170, 140, undefined, "FAST");
    } catch {
      /* watermark is cosmetic only */
    }
    doc.restoreGraphicsState();
  };

  const drawHeader = () => {
    drawWatermark();
    doc.setFillColor(...ORA);
    doc.rect(0, 4, 45, 4, "F");
    doc.rect(0, 10, 34, 4, "F");
    doc.setFillColor(...BLK);
    doc.rect(108, 0, PW - 108, 14, "F");
    doc.triangle(108, 0, 108, 14, 93, 0, "F");
    doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0).text("STATEMENT", 14, 32);
    try {
      doc.addImage(logoMain, "PNG", 148, 16, 47, 18, "lg");
    } catch {
      doc.setFontSize(15).setTextColor(...ORA);
      doc.text("Digident", 162, 9);
    }
  };

  const drawFooter = () => {
    doc.setFillColor(...BLK);
    doc.rect(0, PH - 13, 100, 13, "F");
    doc.triangle(100, PH - 13, 100, PH, 116, PH, "F");
    doc.setFillColor(...ORA);
    doc.rect(158, PH - 7, PW - 158, 7, "F");
    doc.triangle(158, PH - 7, 158, PH, 143, PH, "F");

    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...BLK);
    doc.text((seller.companyName || "DIGIDENT INDIA PRIVATE LIMITED").toUpperCase(), 14, PH - 28);

    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60, 60, 60);
    const addr =
      seller.address ||
      "Digident India Pvt Ltd, 314, Professor Colony, Near Matlani Garden, Behind Agrawal Sweets, Sapna Sangita Road, Indore, (M.P.) 452001.";
    doc.text(doc.splitTextToSize(addr, 180), 14, PH - 23);

    doc.setTextColor(...WHT);
    doc.text(
      `Email: ${seller.email || "info@digident.in"}  |  Contact: ${seller.contactNumber || "+91 9294503001"}`,
      14,
      PH - 5
    );
  };

  drawHeader();

  doc.setFillColor(...ORA);
  doc.rect(14, 42, 3, 20, "F");
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(0);
  doc.text(customerName || "Customer", 21, 50);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80, 80, 80);
  if (contactPerson) doc.text(contactPerson, 21, 57);
  if (contactNumber) doc.text(String(contactNumber), 21, 63);

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...ORA);
  doc.text("STATEMENT DATE", PW - 14, 44, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
  doc.text(
    new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    PW - 14,
    51,
    { align: "right" }
  );

  doc.setDrawColor(...ORA);
  doc.setLineWidth(0.3);
  doc.line(14, 68, PW - 14, 68);

  const cardY = 73;
  const cardH = 24;
  const totalW = PW - 28;
  const cardW = (totalW - 12) / 3;

  const totalAmount = sorted.reduce((s, i) => s + (i.summary?.totalPayAmount || 0), 0);
  const totalPaid = sorted.reduce((s, i) => s + (i.summary?.paidAmount || 0), 0);
  const remaining = sorted.reduce((s, i) => s + (i.summary?.amountToPay || 0), 0);

  const cards = [
    { label: "TOTAL INVOICES", value: String(sorted.length), accent: ORA },
    { label: "TOTAL BILLED", value: `INR ${totalAmount.toLocaleString("en-IN")}`, accent: ORA },
    {
      label: "BALANCE DUE",
      value: `INR ${remaining.toLocaleString("en-IN")}`,
      accent: remaining > 0 ? [210, 50, 50] : [34, 160, 80],
    },
  ];

  cards.forEach((card, i) => {
    const cx = 14 + i * (cardW + 6);
    doc.setFillColor(...GRY);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "F");
    doc.setFillColor(...card.accent);
    doc.roundedRect(cx, cardY, cardW, 2, 1, 1, "F");
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(120, 120, 120);
    doc.text(card.label, cx + cardW / 2, cardY + 9, { align: "center" });
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...card.accent);
    doc.text(card.value, cx + cardW / 2, cardY + 19, { align: "center" });
  });

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 100, 100);
  doc.text(`Total Paid: INR ${totalPaid.toLocaleString("en-IN")}`, PW - 14, cardY + cardH + 7, { align: "right" });

  const tableStartY = cardY + cardH + 14;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Inv No.", "Date", "Total (INR)", "Paid (INR)", "Balance (INR)", "Status"]],
    body: sorted.map((inv) => [
      inv.invoiceNumber || "—",
      new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
      (inv.summary?.totalPayAmount || 0).toFixed(2),
      (inv.summary?.paidAmount || 0).toFixed(2),
      (inv.summary?.amountToPay || 0).toFixed(2),
      (inv.status || "").toUpperCase(),
    ]),
    theme: "plain",
    headStyles: { fillColor: ORA, textColor: WHT, halign: "center", fontSize: 8.5, fontStyle: "bold", cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, halign: "center", cellPadding: 3.5, textColor: [30, 30, 30] },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", textColor: [200, 90, 20] },
      1: { halign: "center", textColor: [80, 80, 80] },
      4: { fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const val = parseFloat(data.cell.raw);
        data.cell.styles.textColor = val > 0 ? [210, 50, 50] : [34, 160, 80];
      }
      if (data.section === "body" && data.column.index === 5) {
        const st = (data.cell.raw || "").toLowerCase();
        data.cell.styles.textColor =
          st === "paid" ? [34, 160, 80] : st === "issued" ? [34, 160, 80] : st === "overdue" ? [210, 50, 50] : [180, 130, 20];
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (d) => {
      if (d.section === "body") {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.15);
        doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      }
    },
    margin: { left: 14, right: 14 },
  });

  const sumY = doc.lastAutoTable.finalY + 6;
  doc.setFillColor(245, 240, 235);
  doc.roundedRect(14, sumY, PW - 28, 10, 1, 1, "F");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...ORA);
  doc.text("Grand Total", 18, sumY + 6.5);
  doc.setTextColor(0);
  doc.text(`INR ${totalAmount.toLocaleString("en-IN")}`, 14 + (PW - 28) * 0.44, sumY + 6.5, { align: "center" });
  doc.setTextColor(...(totalPaid > 0 ? [34, 160, 80] : [100, 100, 100]));
  doc.text(`INR ${totalPaid.toLocaleString("en-IN")}`, 14 + (PW - 28) * 0.6, sumY + 6.5, { align: "center" });
  doc.setTextColor(...(remaining > 0 ? [210, 50, 50] : [34, 160, 80]));
  doc.text(`INR ${remaining.toLocaleString("en-IN")}`, 14 + (PW - 28) * 0.76, sumY + 6.5, { align: "center" });

  const sigY = PH - 50;
  doc.setDrawColor(...ORA);
  doc.setLineWidth(0.5);
  doc.line(PW - 75, sigY, PW - 14, sigY);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(100, 100, 100);
  doc.text("Authorised Signatory", PW - 44.5, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
  doc.text((seller.companyName || "DIGIDENT INDIA PRIVATE LIMITED.").toUpperCase(), PW - 44.5, sigY + 11, {
    align: "center",
  });

  drawFooter();
  doc.save(`Statement_${(customerName || "customer").replace(/\s+/g, "_")}.pdf`);
}
