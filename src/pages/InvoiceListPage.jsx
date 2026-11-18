/**
 * All invoices grouped by customer, with source tabs (client / manual order / ecommerce / old /
 * direct), agent filter, fuzzy search, PDF, statement and Excel export.
 *
 * • loads all invoices once and groups them by customer (using the customer list)
 * • tabs: All / Client / Manual Orders / Ecommerce / Old / Direct
 * • agent filter, fuzzy search (works even with spelling mistakes)
 * • pagination by customer (10 per page)
 *
 * Route: /invoices
 * Used by: routes/AppRoutes.jsx
 * API: CreditNoteService.getAll, InvoiceService.getAllInvoices,
 * InvoiceService.getCustomerInvoicesById, InvoiceService.getCustomers,
 * InvoiceService.getInvoiceById, InvoiceService.getInvoicesByMonthYear
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ReceiptText,
  Loader2,
  X as CloseIcon,
} from "lucide-react";

import { InvoiceService, CreditNoteService } from "../backend/ApiService";
import { generateCreditNotePdf } from "../utils/CreditNotePdf";
import { generateStatementPdf } from "../utils/StatementPdf";
import { fuzzyMatch, invoiceSearchIndex } from "../utils/FuzzyMatch";
import { SOURCES, getInvoiceSource } from "../utils/InvoiceSource";
import MonthYearExcelExport from "../components/invoice/MonthYearExcelExport.jsx";
import UpdateInvoiceModal from "../components/invoice/UpdateInvoiceModal.jsx";
import InvoiceDetailModal from "../components/invoice/InvoiceDetailModal";

import logoMain from "../assets/DigidentLogoWatermark.png";
import logo from "../assets/DigidentLogo.png";
import bankQR from "../assets/BankQr.png";
import { hsnOf, byDateDesc, norm, agentIdOf, agentNameOf } from "../utils/InvoiceListHelpers.js";
import { useDebounced } from "../hooks/UseDebounced.js";
import { CustomerGroup } from "../components/invoice/CustomerGroup.jsx";
const logoWatermark = logoMain;

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
const InvoiceListPage = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invLoading, setInvLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [typeFilter, setTypeFilter] = useState("all"); // all | client | manual | ecommerce | direct
  const [agentFilter, setAgentFilter] = useState(""); // agent id
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openGroup, setOpenGroup] = useState(null);
  const GROUPS_PER_PAGE = 10;

  const [isDownloading, setIsDownloading] = useState(false);
  const [cnBusyId, setCnBusyId] = useState(null);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);

  /* ── Fetch: all invoices + customers together ───────────────── */
  const fetchInvoices = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setInvLoading(true);
    setFetchError("");
    try {
      const [invRes, custRes] = await Promise.all([
        InvoiceService.getAllInvoices(1, 10000),
        InvoiceService.getCustomers(),
      ]);
      const invData = invRes?.data ?? invRes;
      const custData = custRes?.data ?? custRes;
      const list = Array.isArray(invData) ? invData : invData?.invoices || [];
      setInvoices([...list].sort(byDateDesc));
      setCustomers(Array.isArray(custData) ? custData : custData?.customers || []);
    } catch (err) {
      setFetchError(err?.response?.data?.message || err.message || "Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    setCurrentPage(1);
    setOpenGroup(null);
  }, [searchTerm, typeFilter, agentFilter]);

  const debouncedSearch = useDebounced(searchTerm.trim(), 300);
  const searching = searchTerm.trim() !== debouncedSearch;

  /* ── Agent dropdown ───────────────────────────────────────────── */
  const agentOptions = useMemo(() => {
    const agentsById = new Map();
    invoices.forEach((invoice) => {
      const id = agentIdOf(invoice);
      if (!id) return;
      const agentSummary = agentsById.get(id) || { id, name: agentNameOf(invoice), count: 0 };
      agentSummary.count += 1;
      agentsById.set(id, agentSummary);
    });
    return [...agentsById.values()].sort((first, second) => first.name.localeCompare(second.name));
  }, [invoices]);

  /* ── Search index (built once) ───────────────────────────────────── */
  const indexed = useMemo(
    () =>
      invoices.map((invoice) => ({
        inv: invoice,
        idx: invoiceSearchIndex(invoice),
        src: getInvoiceSource(invoice),
      })),
    [invoices]
  );

  // Search + agent filter applied before the tab filter, so the tab counts come from this list
  const beforeTab = useMemo(
    () =>
      indexed.filter(
        ({ inv: invoice, idx }) =>
          (!agentFilter || agentIdOf(invoice) === agentFilter) &&
          (!debouncedSearch || fuzzyMatch(debouncedSearch, idx.text, idx.digits))
      ),
    [indexed, agentFilter, debouncedSearch]
  );

  const typeCounts = useMemo(() => {
    const countsByType = { all: beforeTab.length, client: 0, manual: 0, ecommerce: 0, direct: 0 };
    beforeTab.forEach(({ src }) => {
      countsByType[src] += 1;
    });
    return countsByType;
  }, [beforeTab]);

  const visibleInvoices = useMemo(
    () =>
      beforeTab
        .filter(({ src }) => typeFilter === "all" || src === typeFilter)
        .map(({ inv: invoice }) => invoice),
    [beforeTab, typeFilter]
  );

  /* ── Customer-wise grouping ───────────────────────────────────── */
  const filtersOn = typeFilter !== "all" || !!agentFilter || !!debouncedSearch;

  const customerGroups = useMemo(() => {
    const groups = new Map();
    const newGroup = (key, customer) => ({
      key,
      customerNo: customer.customerNo,
      customerName: customer.companyName || customer.contactPerson || "Unknown Customer",
      contactPerson: customer.contactPerson || "",
      contactNumber: customer.contactNumber || "",
      totalAmount: 0,
      allInvoices: [],
    });
    customers.forEach((customer) =>
      groups.set(`c${customer.customerNo}`, newGroup(`c${customer.customerNo}`, customer))
    );

    visibleInvoices.forEach((visibleInvoice) => {
      let group =
        visibleInvoice.customerNo != null ? groups.get(`c${visibleInvoice.customerNo}`) : null;
      if (!group) {
        const company = norm(visibleInvoice.billTo?.companyName);
        const person = norm(visibleInvoice.billTo?.contactPerson);
        group = [...groups.values()].find(
          (x) => norm(x.customerName) === company && norm(x.contactPerson) === person
        );
        if (!group) {
          const key = `n${company}|${person}`;
          group =
            groups.get(key) ||
            newGroup(key, { customerNo: visibleInvoice.customerNo, ...visibleInvoice.billTo });
          groups.set(key, group);
        }
      }
      group.allInvoices.push(visibleInvoice);
      group.totalAmount += visibleInvoice.summary?.totalPayAmount || 0;
      if (!group.contactNumber && visibleInvoice.billTo?.contactNumber)
        group.contactNumber = visibleInvoice.billTo.contactNumber;
      if (visibleInvoice.leadId && !group.leadId) {
        group.leadId = visibleInvoice.leadId;
        group.clientId = visibleInvoice.clientId || "";
      }
    });

    return [...groups.values()]
      .filter((group) => !filtersOn || group.allInvoices.length > 0)
      .map((group) => ({ ...group, invoiceCount: group.allInvoices.length }))
      .sort(
        (first, second) =>
          new Date(second.allInvoices[0]?.invoiceDate || 0) -
            new Date(first.allInvoices[0]?.invoiceDate || 0) ||
          (first.customerNo ?? 0) - (second.customerNo ?? 0)
      );
  }, [customers, visibleInvoices, filtersOn]);

  const totalItems = invoices.length;
  const totalCustomers = useMemo(
    () =>
      new Set(
        invoices.map(
          (invoice) =>
            invoice.customerNo ??
            `${norm(invoice.billTo?.companyName)}|${norm(invoice.billTo?.contactPerson)}`
        )
      ).size || customers.length,
    [invoices, customers]
  );
  const totalPages = Math.max(1, Math.ceil(customerGroups.length / GROUPS_PER_PAGE));
  const pageGroups = customerGroups.slice(
    (currentPage - 1) * GROUPS_PER_PAGE,
    currentPage * GROUPS_PER_PAGE
  );

  /* ── Credit notes ─────────────────────────────────────────────── */
  const handleDownloadCreditNotes = async (invoice) => {
    const invoiceId = invoice.invoiceId || invoice._id;
    if (cnBusyId) return;
    setCnBusyId(invoiceId);
    try {
      const res = await CreditNoteService.getAll({ invoiceId });
      const notes = res?.data?.creditNotes || res?.creditNotes || [];
      if (!notes.length) {
        toast.error(`No credit note found for ${invoice.invoiceNumber}`);
        return;
      }
      for (const note of notes) await generateCreditNotePdf(note);
      if (notes.length > 1) toast.success(`${notes.length} credit notes downloaded`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not download credit note");
    } finally {
      setCnBusyId(null);
    }
  };

  /* ── New invoice for a customer ───────────────────────────────── */
  const handleCreateInvoice = async (group) => {
    try {
      const customerId = group.customerNo ?? group.allInvoices?.[0]?.customerNo;
      let customerInvoices = group.allInvoices;
      if (customerId != null) {
        const res = await InvoiceService.getCustomerInvoicesById(customerId);
        const data = res?.data ?? res;
        customerInvoices = Array.isArray(data) ? data : data?.invoices || group.allInvoices;
      }
      const latestInvoice = customerInvoices?.[0] || null;
      navigate("/invoices/create", {
        state: {
          customerData: {
            companyName: group.customerName,
            contactPerson: group.contactPerson,
            contactNumber: group.contactNumber,
            address: latestInvoice?.billTo?.address || "",
            gstin: latestInvoice?.billTo?.gstin || "",
            invoices: customerInvoices,
            latestInvoice,
          },
        },
      });
    } catch (error) {
      console.error("Create Invoice Navigation Error:", error);
      toast.error("Could not open the invoice form");
    }
  };

  const handleEditClick = (invoice) => {
    setSelectedInvoice(invoice);
    setUpdateModalOpen(true);
  };

  const openProfile = (group) =>
    navigate(
      `/customers/${encodeURIComponent(group.contactNumber)}?name=${encodeURIComponent(group.contactPerson || "")}`
    );

  /* ── Pagination ───────────────────────────────────────────────── */
  const goTo = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pageNums = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (pageNumber) =>
        pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1
    )
    .reduce((acc, pageNumber, index, list) => {
      if (index > 0 && list[index - 1] !== pageNumber - 1) acc.push("…");
      acc.push(pageNumber);
      return acc;
    }, []);

  /* ================= CUSTOMER STATEMENT PDF ================= */
  // The PDF itself is built in utils/StatementPdf.js
  const handleDownloadCustomerReport = async (group) => {
    try {
      await generateStatementPdf(group);
    } catch (error) {
      console.error("Statement Error:", error);
      toast.error("Statement PDF failed: " + (error?.message || "unknown error"));
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
      const BLACK = [0, 0, 0];
      const WHITE = [255, 255, 255];
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const lineHeight = 6;

      const fmtDate = (date) =>
        date ? new Date(date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) : "-";

      const drawWatermark = () => {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.03 }));
        try {
          doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
        } catch (error) {
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
        doc.rect(108, 0, pageWidth - 108, 14, "F");
        doc.triangle(108, 0, 108, 14, 93, 0, "F");
        doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0);
        doc.text("INVOICE", 14, 32);

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
        doc.text("DIGIDENT INDIA PRIVATE LIMITED.", 14, pageHeight - 26);

        doc.setFont("helvetica", "normal").setFontSize(10);
        const footerAddr = order.seller?.address || "";
        const footerAddrLines = doc.splitTextToSize(footerAddr, 180);
        doc.text(footerAddrLines, 14, pageHeight - 21);

        doc.setTextColor(...WHITE);
        doc.text(
          `Email: ${order.seller?.email || "info@digident.in"} | Contact: ${order.seller?.contactNumber || ""}`,
          14,
          pageHeight - 6
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
      rightY += lineHeight;
      doc.text(order.billTo?.contactPerson || "N/A", rightColX, rightY);
      rightY += lineHeight;
      doc.text(order.billTo?.contactNumber || "N/A", rightColX, rightY);
      rightY += lineHeight;
      doc.setFont("helvetica", "bold");
      doc.text(order.billTo?.companyName || "N/A", rightColX, rightY);
      rightY += 5;
      doc.setFont("helvetica", "normal");
      const addrLines = doc.splitTextToSize(order.billTo?.address || "", 75);
      doc.text(addrLines, rightColX, rightY);
      rightY += addrLines.length * lineHeight;
      doc.setFont("helvetica", "bold");
      doc.text(`GSTIN: ${order.billTo?.gstin || "N/A"}`, rightColX, rightY);

      rightY += 10;
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(`Terms of Delivery : ${order.termsOfDelivery || "-"}`, rightColX, rightY);
      rightY += lineHeight;
      doc.text(`Shipping Condition : ${order.shippingCondition || "-"}`, rightColX, rightY);
      rightY += lineHeight;
      doc.text(`Order Date : ${fmtDate(order.orderDate)}`, rightColX, rightY);

      let leftY = 75;
      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text(`CUSTOMER NO : ${order.customerNo || "-"}`, 14, leftY);
      leftY += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.text(`Payment Terms : ${order.paymentTerms || "-"}`, 14, leftY);
      leftY += lineHeight;
      doc.setFont("helvetica", "bold");
      doc.text(`Our GSTIN : ${order.seller?.gstin || "23AAKCD9669F1ZA"}`, 14, leftY);
      leftY += lineHeight + 5;
      doc.setFont("helvetica", "normal");
      const orderNumberLines = doc.splitTextToSize(
        `Order Number : ${order.orderNumber || "-"}`,
        100
      );
      doc.text(orderNumberLines, 14, leftY);
      leftY += orderNumberLines.length * lineHeight;
      doc.text(`Customer Service Rep : ${order.customerServiceRep || "-"}`, 14, leftY);

      const tableRows = order.items.map((item) => [
        item.articleNo || "-",
        hsnOf(item),
        item.description,
        item.qty,
        item.price,
        `${(item.discountPercent || 0).toFixed(2)}%`,
        item.discountValue.toFixed(2),
        item.totalAmount.toFixed(2),
        `${item.gstType} ${item.gstPercent}%`,
      ]);

      // Whichever info column ran taller (a long address, extra shipping
      // notes, etc.) pushes the table down so it never overlaps.
      const tableStartY = Math.max(rightY, leftY, 145) + 15;

      autoTable(doc, {
        startY: tableStartY,
        head: [
          [
            "ART. NO",
            "HSN CODE",
            "DESCRIPTION",
            "QTY",
            "PRICE",
            "DISC (%)",
            "DISC VALUE",
            "Total Amount",
            "GST %",
          ],
        ],
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

      doc
        .setFont("helvetica", "bold")
        .setFontSize(18)
        .setTextColor(...ORANGE);
      doc.text("SUMMARY & TAX DETAILS", 14, 50);

      const summary = order.summary;
      autoTable(doc, {
        startY: 60,
        head: [["DESCRIPTION", "GOODS", "FREIGHT", "TOTAL"]],
        body: [
          [
            "Net Value",
            summary.totalNet.toFixed(2),
            summary.freightCost.toFixed(2),
            (summary.totalNet + summary.freightCost).toFixed(2),
          ],
          ["Total Tax", summary.totalTax.toFixed(2), "0.00", summary.totalTax.toFixed(2)],
          [
            "Grand Total",
            summary.totalPayAmount.toFixed(2),
            summary.freightCost.toFixed(2),
            summary.totalPayAmount.toFixed(2),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: ORANGE },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        margin: { left: 110 },
        body: [
          ["Total Payable", `INR ${summary.totalPayAmount.toLocaleString("en-IN")}`],
          ["Paid Amount", `INR ${summary.paidAmount.toLocaleString("en-IN")}`],
          ["Balance Due", `INR ${summary.amountToPay.toLocaleString("en-IN")}`],
        ],
        theme: "grid",
        columnStyles: { 0: { fontStyle: "bold" } },
      });

      const finalY = doc.lastAutoTable.finalY + 100;
      const qrSize = 35;

      try {
        if (bankQR) doc.addImage(bankQR, "PNG", 14, finalY, qrSize, qrSize, undefined, "NONE");
      } catch (error) {
        console.warn("Bank QR failed to load", error);
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

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════════════════ */
  const divider = (
    <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-white/10 md:block" />
  );

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-600">
            Stage 3
          </span>
          <h2 className="mt-2 text-[22px] font-black uppercase tracking-[.12em] text-slate-800 dark:text-white">
            Invoice Management
          </h2>
          <p className="mt-1 text-[13px] text-slate-400 dark:text-mist-300">
            Grouped by customer · PDF download · Statement export
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2.5 xl:justify-end">
          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchInvoices()}
            title="Refresh"
            className="rounded-[10px] border border-slate-200 px-[11px] py-[9px] text-slate-500 transition-colors hover:border-orange-400/50 hover:text-orange-600 dark:border-white/10 dark:text-mist-300"
          >
            <RefreshCw size={15} className={invLoading ? "animate-spin" : ""} />
          </button>

          {/* Stats */}
          {[
            { val: invLoading ? "…" : totalItems, label: "Invoices", color: "text-emerald-500" },
            {
              val: invLoading ? "…" : totalCustomers,
              label: "Customers",
              color: "text-orange-600",
            },
          ].map(({ val, label, color }) => (
            <div
              key={label}
              className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-2 text-center dark:border-white/10 dark:bg-white/5"
            >
              <div className={`text-xl font-black leading-none ${color}`}>{val}</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[.08em] text-slate-400">
                {label}
              </div>
            </div>
          ))}

          {divider}
          <MonthYearExcelExport fetchInvoices={InvoiceService.getInvoicesByMonthYear} />
          {divider}

          <button
            type="button"
            onClick={() => navigate("/credit-notes")}
            title="Open Credit Notes"
            className="flex items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-orange-600/35 px-3.5 py-[9px] text-xs font-extrabold text-orange-600 transition-colors hover:bg-orange-50 dark:hover:bg-white/5"
          >
            <ReceiptText size={15} /> Credit Notes
          </button>

          <button
            type="button"
            onClick={() => navigate("/invoices/create")}
            className="flex items-center gap-[7px] whitespace-nowrap rounded-[10px] bg-orange-600 px-[18px] py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-85"
          >
            <Plus size={15} /> Create Invoice
          </button>
        </div>
      </div>

      {/* ── Tabs + agent ────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {SOURCES.map((source) => {
          const on = typeFilter === source.key;
          return (
            <button
              key={source.key}
              type="button"
              onClick={() => setTypeFilter(source.key)}
              className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border px-3.5 py-[7px] text-xs font-extrabold transition-colors ${
                on
                  ? "border-orange-600/55 bg-orange-600/[.12] text-orange-600"
                  : "border-slate-200 bg-white text-slate-500 hover:border-orange-300 dark:border-white/10 dark:bg-white/5 dark:text-mist-300"
              }`}
            >
              {source.label}
              <span
                className={`rounded-full px-[7px] py-px text-[10px] font-black ${
                  on ? "bg-orange-600/20 text-orange-600" : "bg-slate-400/15 text-slate-400"
                }`}
              >
                {typeCounts[source.key] ?? 0}
              </span>
            </button>
          );
        })}

        {agentOptions.length > 0 && (
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value)}
            title="Show invoices created by one agent"
            className="w-full min-w-[190px] rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white sm:ml-auto sm:w-auto"
          >
            <option value="">All agents</option>
            {agentOptions.map((agentOption) => (
              <option key={agentOption.id} value={agentOption.id}>
                {agentOption.name} ({agentOption.count})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className={`relative ${searchTerm.trim() ? "mb-2" : "mb-5"}`}>
        <Search
          size={15}
          className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setSearchTerm("")}
          placeholder="Search: customer, clinic, phone, invoice no., client ID, agent… (spelling mistakes are OK)"
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {searching ? (
            <Loader2 size={15} className="animate-spin text-slate-400" />
          ) : (
            searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                title="Clear"
                className="text-slate-400 hover:text-slate-600"
              >
                <CloseIcon size={15} />
              </button>
            )
          )}
        </div>
      </div>
      {debouncedSearch && !searching && (
        <div className="mb-4 text-[11.5px] text-slate-400">
          <b className="text-slate-500">{visibleInvoices.length}</b> invoice
          {visibleInvoices.length === 1 ? "" : "s"} found for “{debouncedSearch}”
          {visibleInvoices.length
            ? ""
            : " · try another spelling or the last 4 digits of the phone number"}
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────── */}
      {fetchError && (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-500">
          <AlertCircle size={15} /> {fetchError}
          <button
            type="button"
            onClick={() => fetchInvoices()}
            className="ml-auto text-[11px] underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Groups ──────────────────────────────────────────────── */}
      {invLoading ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3.5">
          <div className="h-[38px] w-[38px] animate-spin rounded-full border-[3px] border-slate-200 border-t-orange-600" />
          <span className="text-xs text-slate-400">Loading invoices…</span>
        </div>
      ) : customerGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-[60px] text-center dark:border-white/10 dark:bg-white/5">
          <Search size={40} className="mx-auto mb-3 text-slate-300" />
          <div className="text-[13px] text-slate-400">
            {debouncedSearch
              ? `No results for "${debouncedSearch}"`
              : filtersOn
                ? "No invoices match this filter"
                : "No customers found"}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pageGroups.map((group) => (
            <CustomerGroup
              key={group.key}
              group={group}
              isOpen={openGroup === group.key}
              onToggle={() =>
                setOpenGroup((prevOpenGroup) => (prevOpenGroup === group.key ? null : group.key))
              }
              onOpenInvoice={setDetailInvoice}
              onDownload={handleDownloadClick}
              downloading={isDownloading}
              onEdit={handleEditClick}
              onNewInvoice={handleCreateInvoice}
              onStatement={handleDownloadCustomerReport}
              onDownloadCreditNotes={handleDownloadCreditNotes}
              cnBusyId={cnBusyId}
              onProfile={openProfile}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-[9px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-white/10 dark:bg-white/5"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            {pageNums.map((item, index) =>
              item === "…" ? (
                <span key={`d${index}`} className="text-xs text-slate-300">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => goTo(item)}
                  className={`h-[34px] w-[34px] rounded-lg border text-xs font-bold ${
                    item === currentPage
                      ? "border-orange-600/40 bg-orange-600/10 text-orange-600"
                      : "border-slate-200 text-slate-500 dark:border-white/10"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-[9px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-white/10 dark:bg-white/5"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            Page <strong className="text-slate-500">{currentPage}</strong> of {totalPages} ·{" "}
            <strong className="text-slate-500">{totalItems}</strong> total
          </span>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          isOpen={!!detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onChanged={() => fetchInvoices({ silent: true })}
          onDownload={handleDownloadClick}
          onEdit={handleEditClick}
          onDownloadCreditNote={handleDownloadCreditNotes}
          creditNoteBusy={cnBusyId === (detailInvoice.invoiceId || detailInvoice._id)}
        />
      )}
      {isUpdateModalOpen && selectedInvoice && (
        <UpdateInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setUpdateModalOpen(false);
            setSelectedInvoice(null);
          }}
          onRefresh={() => fetchInvoices({ silent: true })}
        />
      )}
    </div>
  );
};

export default InvoiceListPage;
