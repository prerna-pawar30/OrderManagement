/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { InvoiceService } from "../../api/services";
import { Plus, Loader2, Search as SearchIcon, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MonthYearExcelExport from "./Monthyearexcelexport.jsx";
import UpdateInvoiceModal from "../UpdateInvoiceModal.jsx";
import logoMain from "../../assets/digident-png 2.png";
import logo from "../../assets/digident-png .png";
import bankQR from "../../assets/QR.png";
// This project only ships one logo asset — reused for both the header logo
// and the watermark, matching the pattern used in lib/generateInvoicePdf.js.
const logoWatermark = logoMain;

import InvoiceSearch from "./InvoiceSearch";
import CustomerGroupItem from "./CustomerGroupItem";
import Pagination from "../../components/ui/Pagination.jsx";

const InvoiceListPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData(currentPage);
    setExpandedUser(null);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchAllData = async (page = 1) => {
    setLoading(true);
    try {
      const [invoiceRes, customerData] = await Promise.all([
        InvoiceService.getAllInvoices(page, ITEMS_PER_PAGE),
        InvoiceService.getCustomers(),
      ]);

      if (invoiceRes && invoiceRes.invoices) {
        setInvoices(invoiceRes.invoices);
        setTotalPages(invoiceRes.pagination?.totalPages ?? 1);
        setTotalItems(invoiceRes.pagination?.totalItems ?? invoiceRes.invoices.length);
      } else if (Array.isArray(invoiceRes)) {
        setInvoices(invoiceRes);
        setTotalPages(1);
        setTotalItems(invoiceRes.length);
      }

      setCustomers(customerData);
    } catch (error) {
      console.error("Failed to fetch initial page data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const groupedUsers = useMemo(() => {
    const filtered = invoices.filter(
      (inv) =>
        inv.billTo?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.billTo?.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = filtered.reduce((acc, inv) => {
      // Group by customerNo — the backend's own de-duplicated customer ID
      // (assigned by generateCustomerNo in invoice.service.js) — instead of
      // billTo.companyName, so two different customers who happen to share
      // a company/display name don't get merged, and the same customer
      // typed with slightly different casing still groups correctly.
      const key = inv.customerNo ?? inv.billTo?.companyName ?? "Unknown Customer";
      if (!acc[key]) {
        acc[key] = {
          customerNo: inv.customerNo,
          customerName: inv.billTo?.companyName || "Unknown Customer",
          contactPerson: inv.billTo?.contactPerson,
          contactNumber: inv.billTo?.contactNumber,
          invoiceCount: 0,
          totalAmount: 0,
          allInvoices: [],
        };
      }
      acc[key].allInvoices.push(inv);
      acc[key].invoiceCount += 1;
      acc[key].totalAmount += inv.summary?.totalPayAmount || 0;
      return acc;
    }, {});

    return Object.values(groups);
  }, [invoices, searchTerm]);

  const handleCreateInvoice = async (user) => {
    try {
      setLoading(true);
      const customerId = user.customerNo ?? user.allInvoices?.[0]?.customerNo;
      const customerInvoices = await InvoiceService.getCustomerInvoicesById(customerId);
      const latestInvoice = customerInvoices?.[0] || null;

      const customerData = {
        companyName: user.customerName,
        contactPerson: user.contactPerson,
        contactNumber: user.contactNumber,
        address: latestInvoice?.billTo?.address || "",
        gstin: latestInvoice?.billTo?.gstin || "",
        invoices: customerInvoices,
        latestInvoice,
      };

      navigate("/invoices/create", { state: { customerData } });
    } catch (error) {
      console.error("Create Invoice Navigation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (invoice) => {
    setSelectedInvoice(invoice);
    setUpdateModalOpen(true);
  };

  const toggleUser = (userName) => {
    setExpandedUser(expandedUser === userName ? null : userName);
  };

/* ================= CUSTOMER STATEMENT PDF ================= */
const handleDownloadCustomerReport = async (user) => {
  try {
    const { default: jsPDF }     = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const ORA = [230, 135, 54];
    const BLK = [0, 0, 0];
    const WHT = [255, 255, 255];
    const GRY = [245, 245, 245];
    const PW  = doc.internal.pageSize.width;
    const PH  = doc.internal.pageSize.height;

    /* ── Watermark ── */
    const drawWatermark = () => {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.03 }));
      try {
        doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
      } catch {}
      doc.restoreGraphicsState();
    };

    /* ── Header ── */
    const drawHeader = () => {
      drawWatermark();
      // Orange accent bars — top left
      doc.setFillColor(...ORA);
      doc.rect(0, 4, 45, 4, "F");
      doc.rect(0, 10, 34, 4, "F");
      // Black ribbon — top right
      doc.setFillColor(...BLK);
      doc.rect(108, 0, PW - 108, 14, "F");
      doc.triangle(108, 0, 108, 14, 93, 0, "F");
      // Title
      doc.setFont("helvetica", "bold")
         .setFontSize(30)
         .setTextColor(0)
         .text("STATEMENT", 14, 32);
      // Logo
      try {
        doc.addImage(logoMain, "PNG", 148, 16, 47, 18, "lg");
      } catch {
        doc.setFontSize(15).setTextColor(...ORA);
        doc.text("Digident", 162, 9);
      }
    };

    /* ── Footer ── */
    const drawFooter = () => {
      // Black left band
      doc.setFillColor(...BLK);
      doc.rect(0, PH - 13, 100, 13, "F");
      doc.triangle(100, PH - 13, 100, PH, 116, PH, "F");
      // Orange right accent
      doc.setFillColor(...ORA);
      doc.rect(158, PH - 7, PW - 158, 7, "F");
      doc.triangle(158, PH - 7, 158, PH, 143, PH, "F");

      // Company name — above the band
      doc.setFont("helvetica", "bold")
         .setFontSize(10)
         .setTextColor(...BLK);
      doc.text("DIGIDENT INDIA PRIVATE LIMITED.", 14, PH - 28);

      // Address
      const addr =
        user.allInvoices?.[0]?.seller?.address ||
        "Digident India Pvt Ltd, 314, Professor Colony, Near Matlani Garden, Behind Agrawal Sweets, Sapna Sangita Road, Indore, (M.P.) 452001.";
      doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60, 60, 60);
      doc.text(doc.splitTextToSize(addr, 180), 14, PH - 23);

      // Email + contact inside black band
      const email   = user.allInvoices?.[0]?.seller?.email          || "info@digident.in";
      const contact = user.allInvoices?.[0]?.seller?.contactNumber  || "+91 9294503001";
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...WHT);
      doc.text(`Email: ${email}  |  Contact: ${contact}`, 14, PH - 5);
    };

    /* ══════════ PAGE CONTENT ══════════ */
    drawHeader();

    /* ── Customer info block ── */
    // Orange left accent bar
    doc.setFillColor(...ORA);
    doc.rect(14, 42, 3, 20, "F");

    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(0);
    doc.text(user.customerName, 21, 50);

    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80, 80, 80);
    if (user.contactPerson) doc.text(user.contactPerson, 21, 57);
    if (user.contactNumber) doc.text(String(user.contactNumber), 21, 63);

    // Statement date — top right
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...ORA);
    doc.text("STATEMENT DATE", PW - 14, 44, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
    doc.text(
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
      }),
      PW - 14, 51, { align: "right" }
    );

    /* ── Divider ── */
    doc.setDrawColor(...ORA);
    doc.setLineWidth(0.3);
    doc.line(14, 68, PW - 14, 68);

    /* ── Summary cards ── */
    const cardY    = 73;
    const cardH    = 24;
    const totalW   = PW - 28;           // 182 mm usable
    const cardW    = (totalW - 12) / 3; // 3 cards, 6mm gap each side → ~56.7mm

    const remaining = user.allInvoices.reduce(
      (s, i) => s + (i.summary?.amountToPay || 0), 0
    );
    const totalPaid = user.allInvoices.reduce(
      (s, i) => s + (i.summary?.paidAmount   || 0), 0
    );

    const cards = [
      {
        label:  "TOTAL INVOICES",
        value:  String(user.invoiceCount),
        accent: ORA,
      },
      {
        label:  "TOTAL BILLED",
        value:  `INR ${user.totalAmount.toLocaleString("en-IN")}`,
        accent: ORA,
      },
      {
        label:  "BALANCE DUE",
        value:  `INR ${remaining.toLocaleString("en-IN")}`,
        accent: remaining > 0 ? [210, 50, 50] : [34, 160, 80],
      },
    ];

    cards.forEach((card, i) => {
      const cx = 14 + i * (cardW + 6);
      // Card bg
      doc.setFillColor(...GRY);
      doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "F");
      // Top accent bar
      doc.setFillColor(...card.accent);
      doc.roundedRect(cx, cardY, cardW, 2, 1, 1, "F");
      // Label
      doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(120, 120, 120);
      doc.text(card.label, cx + cardW / 2, cardY + 9,  { align: "center" });
      // Value
      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...card.accent);
      doc.text(card.value,  cx + cardW / 2, cardY + 19, { align: "center" });
    });

    // Total Paid — below cards, right-aligned
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 100, 100);
    doc.text(
      `Total Paid: INR ${totalPaid.toLocaleString("en-IN")}`,
      PW - 14,
      cardY + cardH + 7,
      { align: "right" }
    );

    /* ── Invoice detail table ── */
    const tableStartY = cardY + cardH + 14;

    autoTable(doc, {
      startY: tableStartY,
      head: [["Inv No.", "Date", "Total (INR)", "Paid (INR)", "Balance (INR)", "Status"]],
      body: user.allInvoices.map((inv) => [
        inv.invoiceNumber || "—",
        new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
        (inv.summary?.totalPayAmount || 0).toFixed(2),
        (inv.summary?.paidAmount     || 0).toFixed(2),
        (inv.summary?.amountToPay    || 0).toFixed(2),
        (inv.status || "").toUpperCase(),
      ]),
      theme: "plain",
      headStyles: {
        fillColor:   ORA,
        textColor:   WHT,
        halign:      "center",
        fontSize:    8.5,
        fontStyle:   "bold",
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize:    8.5,
        halign:      "center",
        cellPadding: 3.5,
        textColor:   [30, 30, 30],
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", textColor: [200, 90, 20] },
        1: { halign: "center", textColor: [80, 80, 80] },
        4: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        // Balance — red if owing, green if cleared
        if (data.section === "body" && data.column.index === 4) {
          const val = parseFloat(data.cell.raw);
          data.cell.styles.textColor = val > 0 ? [210, 50, 50] : [34, 160, 80];
        }
        // Status colour
        if (data.section === "body" && data.column.index === 5) {
          const st = (data.cell.raw || "").toLowerCase();
          data.cell.styles.textColor =
            st === "paid"    ? [34, 160, 80]  :
            st === "issued"  ? [34, 160, 80]  :
            st === "overdue" ? [210, 50, 50]  :
                               [180, 130, 20];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (d) => {
        if (d.section === "body") {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.15);
          doc.line(
            d.cell.x,
            d.cell.y + d.cell.height,
            d.cell.x + d.cell.width,
            d.cell.y + d.cell.height
          );
        }
      },
      margin: { left: 14, right: 14 },
    });

    /* ── Grand total summary bar ── */
    const sumY = doc.lastAutoTable.finalY + 6;
    doc.setFillColor(245, 240, 235);
    doc.roundedRect(14, sumY, PW - 28, 10, 1, 1, "F");

    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...ORA);
    doc.text("Grand Total", 18, sumY + 6.5);

    doc.setTextColor(0);
    doc.text(
      `INR ${user.totalAmount.toLocaleString("en-IN")}`,
      14 + (PW - 28) * 0.44, sumY + 6.5, { align: "center" }
    );

    doc.setTextColor(...(totalPaid > 0 ? [34, 160, 80] : [100, 100, 100]));
    doc.text(
      `INR ${totalPaid.toLocaleString("en-IN")}`,
      14 + (PW - 28) * 0.60, sumY + 6.5, { align: "center" }
    );

    doc.setTextColor(...(remaining > 0 ? [210, 50, 50] : [34, 160, 80]));
    doc.text(
      `INR ${remaining.toLocaleString("en-IN")}`,
      14 + (PW - 28) * 0.76, sumY + 6.5, { align: "center" }
    );

    /* ── Authorised Signatory ── */
    const sigY = PH - 50;
    doc.setDrawColor(...ORA);
    doc.setLineWidth(0.5);
    doc.line(PW - 75, sigY, PW - 14, sigY);
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(100, 100, 100);
    doc.text("Authorised Signatory", PW - 44.5, sigY + 5,  { align: "center" });
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
    doc.text("DIGIDENT INDIA PRIVATE LIMITED.", PW - 44.5, sigY + 11, { align: "center" });

    drawFooter();

    doc.save(`Statement_${user.customerName.replace(/\s+/g, "_")}.pdf`);
  } catch (error) {
    console.error("Report Error:", error);
    alert("Failed to generate report");
  }
};

  /* ================= INVOICE PDF GENERATOR ================= */
  const handleDownloadClick = async (invoiceId) => {
    try {
      setIsDownloading(true);

      const response = await InvoiceService.getInvoiceById(invoiceId);
      const order = response.data || response;

      if (!order || !order.items) {
        alert("Invoice data not found or incomplete");
        return;
      }

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const ORANGE = [230, 135, 54];
      const BLACK  = [0, 0, 0];
      const WHITE  = [255, 255, 255];
      const PW     = doc.internal.pageSize.width;
      const PH     = doc.internal.pageSize.height;
      const LH     = 6;

      const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) : "-");

      const drawWatermark = () => {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.03 }));
        try {
          doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
        } catch (e) {
          console.warn("Watermark failed");
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
        doc.text("DIGIDENT INDIA PRIVATE LIMITED.", 14, PH - 26);

        doc.setFont("helvetica", "normal").setFontSize(10);
        const footerAddr = order.seller?.address || "";
        const footerAddrLines = doc.splitTextToSize(footerAddr, 180);
        doc.text(footerAddrLines, 14, PH - 21);

        doc.setTextColor(...WHITE);
        doc.text(
          `Email: ${order.seller?.email || "info@digident.in"} | Contact: ${order.seller?.contactNumber || ""}`,
          14,
          PH - 6
        );
      };

      // ── PAGE 1 ──
      drawHeader();

      doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(0);
      doc.text(`Invoice Number: ${order.invoiceNumber}`, 14, 45);
      doc.text(`Invoice Date: ${fmtDate(order.invoiceDate)}`, 14, 51);
      doc.setFont("helvetica", "bold");
      doc.text(`Due Date: ${fmtDate(order.dueDate)}`, 14, 57);

      const rightColX = 120;
      let rightY = 75;

      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text("BILL TO", rightColX, rightY);

      doc.setFont("helvetica", "normal").setFontSize(10);
      rightY += LH;
      doc.text(order.billTo?.contactPerson || "N/A", rightColX, rightY);
      rightY += LH;
      doc.text(order.billTo?.contactNumber || "N/A", rightColX, rightY);
      rightY += LH;
      doc.setFont("helvetica", "bold");
      doc.text(order.billTo?.companyName || "N/A", rightColX, rightY);
      rightY += 5;
      doc.setFont("helvetica", "normal");
      const addrLines = doc.splitTextToSize(order.billTo?.address || "", 75);
      doc.text(addrLines, rightColX, rightY);
      rightY += addrLines.length * LH;
      doc.setFont("helvetica", "bold");
      doc.text(`GSTIN: ${order.billTo?.gstin || "N/A"}`, rightColX, rightY);

      rightY += 10;
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(`Terms of Delivery : ${order.termsOfDelivery || "-"}`, rightColX, rightY);
      rightY += LH;
      doc.text(`Shipping Condition : ${order.shippingCondition || "-"}`, rightColX, rightY);
      rightY += LH;
      doc.text(`Order Date : ${fmtDate(order.orderDate)}`, rightColX, rightY);

      let leftY = 75;      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text(`CUSTOMER NO : ${order.customerNo || "-"}`, 14, leftY);
      leftY += LH;
      doc.setFont("helvetica", "normal");
      doc.text(`Payment Terms : ${order.paymentTerms || "-"}`, 14, leftY);
      leftY += LH;
      doc.setFont("helvetica", "bold");
      doc.text(`Our GSTIN : ${order.seller?.gstin || "23AAKCD9669F1ZA"}`, 14, leftY);
      leftY += LH + 5;
      doc.setFont("helvetica", "normal");
      const orderNumberLines = doc.splitTextToSize(`Order Number : ${order.orderNumber || "-"}`, 100);
      doc.text(orderNumberLines, 14, leftY);
      leftY += orderNumberLines.length * LH;
      doc.text(`Customer Service Rep : ${order.customerServiceRep || "-"}`, 14, leftY);

      const tableRows = order.items.map((item) => [
        item.articleNo || "-",
        item.description,
        item.qty,
        item.price,
        `${item.discountPercent}%`,
        item.discountValue.toFixed(2),
        item.totalAmount.toFixed(2),
        `${item.gstType} ${item.gstPercent}%`,
      ]);

      // Whichever info column ran taller (a long address, extra shipping
      // notes, etc.) pushes the table down so it never overlaps.
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

      // ── PAGE 2 ──
      doc.addPage();
      drawHeader();

      doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...ORANGE);
      doc.text("SUMMARY & TAX DETAILS", 14, 50);

      const s = order.summary;
      autoTable(doc, {
        startY: 60,
        head: [["DESCRIPTION", "GOODS", "FREIGHT", "TOTAL"]],
        body: [
          ["Net Value",    s.totalNet.toFixed(2),     s.freightCost.toFixed(2), (s.totalNet + s.freightCost).toFixed(2)],
          ["Total Tax",    s.totalTax.toFixed(2),     "0.00",                   s.totalTax.toFixed(2)],
          ["Grand Total",  s.totalPayAmount.toFixed(2), s.freightCost.toFixed(2), s.totalPayAmount.toFixed(2)],
        ],
        theme: "grid",
        headStyles: { fillColor: ORANGE },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        margin: { left: 110 },
        body: [
          ["Total Payable", `INR ${s.totalPayAmount.toLocaleString("en-IN")}`],
          ["Paid Amount",   `INR ${s.paidAmount.toLocaleString("en-IN")}`],
          ["Balance Due",   `INR ${s.amountToPay.toLocaleString("en-IN")}`],
        ],
        theme: "grid",
        columnStyles: { 0: { fontStyle: "bold" } },
      });

      const finalY  = doc.lastAutoTable.finalY + 100;
      const qrSize  = 35;

      try {
        if (bankQR) doc.addImage(bankQR, "PNG", 14, finalY, qrSize, qrSize, undefined, "NONE");
      } catch (e) {
        console.warn("Bank QR failed to load", e);
      }

      const textX = 14 + qrSize + 10;
      let textY = finalY + 5;

      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(0);
      doc.text("Bank Details", textX, textY);
      doc.setFont("helvetica", "normal").setFontSize(10);
      textY += 7;
      doc.text(`Account No : ${order.bankDetails?.accountNo || ""}`, textX, textY);
      textY += 6;
      doc.text(`Account Type : ${order.bankDetails?.accountType || ""}`, textX, textY);
      textY += 6;
      doc.text(`IFSC Code : ${order.bankDetails?.ifscCode || ""}`, textX, textY);
      textY += 6;
      doc.text(`Holder Name : ${order.bankDetails?.holderName || ""}`, textX, textY);

      drawFooter();
      doc.save(`Digident_Invoice_${order.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={40} />
        <p className="text-gray-500 font-medium">Loading Database...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customer Invoices</h1>
            <p className="text-gray-500 text-sm">
              Manage billing records
              {totalItems > 0 && (
                <span className="ml-2 text-orange-500 font-semibold">({totalItems} total)</span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* ── Excel Export ── */}
            <MonthYearExcelExport
              fetchInvoices={InvoiceService.getInvoicesByMonthYear}
            />

            {/* ── Create Invoice ── */}
            <button
              onClick={() => navigate("/invoices/create")}
              className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-xl
                         hover:bg-orange-600 transition-all font-semibold shadow-lg active:scale-95"
            >
              <Plus size={20} />
              Create New Invoice
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <InvoiceSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        {/* ── Invoice Groups ── */}
        <div className="space-y-4">
          {groupedUsers.length > 0 ? (
            groupedUsers.map((user) => (
              <CustomerGroupItem
                key={user.customerNo ?? user.customerName}
                user={user}
                expandedUser={expandedUser}
                toggleUser={toggleUser}
                handleDownloadClick={handleDownloadClick}
                handleEditClick={handleEditClick}
                handleCreateInvoice={handleCreateInvoice}
                handleDownloadCustomerReport={handleDownloadCustomerReport}
              />
            ))
          ) : customers.length > 0 ? (
            customers.map((customer) => (
              <CustomerGroupItem
                key={customer.customerNo}
                user={{
                  customerName: customer.companyName,
                  contactPerson: customer.contactPerson,
                  contactNumber: customer.contactNumber,
                  invoiceCount: 0,
                  totalAmount: 0,
                  allInvoices: [],
                }}
                expandedUser={expandedUser}
                toggleUser={toggleUser}
                handleDownloadClick={handleDownloadClick}
                handleEditClick={handleEditClick}
                handleCreateInvoice={handleCreateInvoice}
                handleDownloadCustomerReport={handleDownloadCustomerReport}
              />
            ))
          ) : (
            <div className="bg-white p-20 text-center rounded-3xl border border-dashed border-gray-200">
              <SearchIcon className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-400 font-medium">
                No customers found matching your search.
              </p>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all shadow-sm
                  ${currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200"
                  }`}
              >
                <ChevronRight className="rotate-180" size={18} />
                Previous
              </button>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all shadow-sm
                  ${currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200"
                  }`}
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Page <span className="font-semibold text-gray-600">{currentPage}</span> of {totalPages}
            </p>
          </div>
        )}
      </div>

      {/* ── Update Modal ── */}
      {isUpdateModalOpen && (
        <UpdateInvoiceModal
          invoice={selectedInvoice}
          onClose={() => setUpdateModalOpen(false)}
          onRefresh={() => fetchAllData(currentPage)}
        />
      )}
    </div>
  );
};

export default InvoiceListPage;
