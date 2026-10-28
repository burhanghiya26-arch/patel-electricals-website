import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  unit?: string;
}

interface InvoiceData {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  orderDate: Date;
  paymentMethod: string;
  orderStatus: string;
}

const SHOP_UPI_ID = "burhanghiya26-1@oksbi";
const SHOP_UPI_NAME = "Patel Electricals";
const BANK_NAME = "Bank of Baroda";
const BANK_ACCOUNT_HOLDER = "Burhanuddin Fakharuddin Ghiya";
const BANK_ACCOUNT_NUMBER = "70120100018589";
const BANK_IFSC = "BARB0DBBGOL";

const money = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function paymentLink(data: InvoiceData, balanceDue: number) {
  const params = new URLSearchParams({
    pa: SHOP_UPI_ID,
    pn: SHOP_UPI_NAME,
    cu: "INR",
    tn: `Bill ${data.orderNumber}`,
    am: balanceDue.toFixed(2),
  });
  return `upi://pay?${params.toString()}`;
}

async function loadPaymentQr(data: InvoiceData, balanceDue: number): Promise<Uint8Array | null> {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data=${encodeURIComponent(paymentLink(data, balanceDue))}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const total = Number(data.total || 0);
  const isCod = data.paymentMethod.toLowerCase().includes("cash on delivery");
  const amountPaid = Math.max(0, Number(data.amountPaid ?? (isCod ? 0 : total)));
  const balanceDue = Math.max(0, Number(data.balanceDue ?? Math.max(0, total - amountPaid)));
  const hasBalanceDue = balanceDue > 0.009;
  let y = margin;

  doc.setTextColor(20, 62, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("PATEL ELECTRICALS", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 88, 105);
  doc.text("Electricals | Spare Parts | Repairing | Fitting Service", margin, y + 5.5);
  doc.text("Udhana Meera Nagar, Surat, Gujarat - 394210", margin, y + 10);
  doc.text("Phone / WhatsApp: +91 8780657095 | www.patelspares.com", margin, y + 14.5);

  doc.setTextColor(20, 32, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVOICE", pageWidth - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Bill No: ${data.orderNumber}`, pageWidth - margin, y + 5.5, { align: "right" });
  doc.text(`Date: ${data.orderDate.toLocaleDateString("en-IN")}`, pageWidth - margin, y + 10, { align: "right" });
  doc.text(`Status: ${data.orderStatus}`, pageWidth - margin, y + 14.5, { align: "right" });
  y += 22;

  doc.setDrawColor(210, 220, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const customerLines = [
    `Customer: ${data.customerName || "Walk-in Customer"}`,
    ...(data.customerPhone ? [`Mobile: ${data.customerPhone}`] : []),
    ...(data.customerEmail ? [`Email: ${data.customerEmail}`] : []),
    ...(data.shippingAddress ? doc.splitTextToSize(`Address: ${data.shippingAddress}`, contentWidth - 12) : []),
  ];
  const customerHeight = Math.max(26, customerLines.length * 4.7 + 12);
  doc.roundedRect(margin, y, contentWidth, customerHeight, 2, 2, "S");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 32, 51);
  doc.setFontSize(8);
  customerLines.forEach((line: string, index: number) => doc.text(line, margin + 5, y + 7 + index * 4.7));
  y += customerHeight + 8;

  const tableRows = data.items.map((item, index) => [
    String(index + 1),
    item.name || "Item",
    item.unit || "piece",
    String(item.quantity),
    money(item.price),
    money(item.total),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: 12, bottom: 16 },
    head: [["#", "Description", "Unit", "Qty", "Rate", "Amount"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [20, 62, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 7.5, textColor: [20, 32, 51], valign: "middle" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 63, halign: "left" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 34, halign: "right" },
      5: { cellWidth: 34, halign: "right" },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY || y) + 10;
  const summaryHeight = hasBalanceDue ? 74 : 36;
  if (y + summaryHeight > pageHeight - 18) {
    doc.addPage();
    y = margin + 8;
  }

  const summaryX = pageWidth - margin - 67;
  const valueX = pageWidth - margin;
  doc.setTextColor(20, 32, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Amount Received", summaryX, y, { align: "right" });
  doc.text(money(amountPaid), valueX, y, { align: "right" });
  y += 6;
  doc.text("Balance Due", summaryX, y, { align: "right" });
  doc.text(money(balanceDue), valueX, y, { align: "right" });
  y += 8;
  doc.setFillColor(239, 246, 255);
  doc.rect(summaryX - 64, y - 5.5, valueX - summaryX + 64, 12, "F");
  doc.setTextColor(20, 62, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", summaryX, y + 2.5, { align: "right" });
  doc.text(money(total), valueX, y + 2.5, { align: "right" });
  y += 20;

  if (hasBalanceDue) {
    const qr = await loadPaymentQr(data, balanceDue);
    if (qr) doc.addImage(qr as any, "PNG", margin, y, 31, 31);
    doc.setTextColor(20, 32, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Scan & Pay by UPI", margin + 38, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`UPI ID: ${SHOP_UPI_ID}`, margin + 38, y + 12);
    doc.text(`Payable: ${money(balanceDue)}`, margin + 38, y + 17);
    doc.setDrawColor(210, 220, 230);
    doc.roundedRect(pageWidth - margin - 82, y - 1, 82, 40, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details", pageWidth - margin - 78, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(`Bank: ${BANK_NAME}`, pageWidth - margin - 78, y + 11);
    doc.text(`A/c Holder: ${BANK_ACCOUNT_HOLDER}`, pageWidth - margin - 78, y + 16);
    doc.text(`A/c No: ${BANK_ACCOUNT_NUMBER}`, pageWidth - margin - 78, y + 21);
    doc.text(`IFSC: ${BANK_IFSC}`, pageWidth - margin - 78, y + 26);
    y += 47;
  }

  const footerY = Math.min(y + 3, pageHeight - 23);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Thank you for choosing Patel Electricals.", pageWidth / 2, footerY + 8, { align: "center" });
  doc.text("WhatsApp: +91 8780657095 | www.patelspares.com", pageWidth / 2, footerY + 12, { align: "center" });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: "center" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function generateInvoiceFileName(orderNumber: string): Promise<string> {
  return `Invoice-${orderNumber}-${Date.now()}.pdf`;
}
