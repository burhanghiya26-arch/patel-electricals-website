import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  sku?: string;
  imageUrl?: string;
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
  orderDate: Date;
  paymentMethod: string;
  orderStatus: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // Header - Company Info
  doc.setFontSize(20);
  doc.setTextColor(25, 42, 86); // Dark blue
  doc.text('Patel Electricals', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Wholesale Spare Parts', margin, yPosition);
  yPosition += 5;
  doc.text('Surat, Gujarat - 394210', margin, yPosition);
  yPosition += 5;
  doc.text('📞 8780657095 | 📧 burhanghiya26@gmail.com', margin, yPosition);
  yPosition += 10;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Invoice Title and Details
  doc.setFontSize(14);
  doc.setTextColor(25, 42, 86);
  doc.text('INVOICE', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice #: ${data.orderNumber}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Order ID: ${data.orderId}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Date: ${data.orderDate.toLocaleDateString('en-IN')}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Status: ${data.orderStatus}`, margin, yPosition);
  yPosition += 10;

  // Customer and Shipping Info
  doc.setFontSize(10);
  doc.setTextColor(25, 42, 86);
  doc.text('Bill To:', margin, yPosition);
  yPosition += 5;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(data.customerName, margin, yPosition);
  yPosition += 5;
  doc.text(data.customerPhone, margin, yPosition);
  yPosition += 5;
  doc.text(data.customerEmail, margin, yPosition);
  yPosition += 8;

  // Shipping Address
  doc.setFontSize(10);
  doc.setTextColor(25, 42, 86);
  doc.text('Ship To:', margin + contentWidth / 2, yPosition - 8);

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const addressLines = doc.splitTextToSize(data.shippingAddress, contentWidth / 2 - 5);
  doc.text(addressLines, margin + contentWidth / 2, yPosition - 3);
  yPosition += Math.max(20, addressLines.length * 4);

  // Items Table with Product Details
  const tableData = data.items.map((item) => [
    item.name,
    item.quantity.toString(),
    `₹${item.price.toFixed(2)}`,
    `₹${item.total.toFixed(2)}`,
  ]);

  // Create items table
  autoTable(doc, {
    startY: yPosition,
    margin: { left: margin, right: margin, top: 5, bottom: 5 },
    head: [['Product', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [25, 42, 86],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: contentWidth * 0.45 },
      1: { halign: 'center', cellWidth: contentWidth * 0.15 },
      2: { halign: 'right', cellWidth: contentWidth * 0.2 },
      3: { halign: 'right', cellWidth: contentWidth * 0.2 },
    },
    didDrawPage: (data: any) => {
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' } as any
      );
    },
  });

  // Add product details section with labels
  const tableEndY = (doc as any).lastAutoTable?.finalY || yPosition;
  yPosition = tableEndY + 15;
  
  if (data.items.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(25, 42, 86);
    doc.setFont(undefined as any, 'bold');
    doc.text('Product Details:', margin, yPosition);
    yPosition += 8;

    // Add each product with labels
    data.items.forEach((item, index) => {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined as any, 'normal');
      
      // Product name
      doc.text(`${index + 1}. ${item.name}`, margin, yPosition);
      yPosition += 5;
      
      // Product details with labels
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`   Quantity: ${item.quantity} unit(s)`, margin + 2, yPosition);
      yPosition += 4;
      
      doc.text(`   Unit Price: ₹${item.price.toFixed(2)}`, margin + 2, yPosition);
      yPosition += 4;
      
      doc.text(`   Total: ₹${item.total.toFixed(2)}`, margin + 2, yPosition);
      yPosition += 4;
      
      if (item.sku) {
        doc.text(`   SKU: ${item.sku}`, margin + 2, yPosition);
        yPosition += 4;
      }
      
      yPosition += 3;
    });
  }

  // Add some space before summary
  yPosition += 8;

  // Summary Section - Manual drawing (NOT using autoTable)
  const summaryStartX = margin + contentWidth * 0.55;
  const summaryValueX = pageWidth - margin - 5;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // Subtotal
  doc.text('Subtotal:', summaryStartX, yPosition);
  doc.text(`₹${data.subtotal.toFixed(2)}`, summaryValueX, yPosition, { align: 'right' } as any);
  yPosition += 6;

  // Tax
  doc.text('Tax (GST):', summaryStartX, yPosition);
  doc.text(`₹${data.tax.toFixed(2)}`, summaryValueX, yPosition, { align: 'right' } as any);
  yPosition += 8;

  // Total with background box
  doc.setDrawColor(25, 42, 86);
  doc.setFillColor(240, 240, 240);
  const boxWidth = summaryValueX - summaryStartX + 5;
  doc.rect(summaryStartX - 3, yPosition - 5, boxWidth, 10, 'F');

  doc.setFontSize(11);
  doc.setTextColor(25, 42, 86);
  doc.setFont(undefined as any, 'bold');
  doc.text('Total Amount:', summaryStartX, yPosition + 1);
  doc.text(`₹${data.total.toFixed(2)}`, summaryValueX, yPosition + 1, { align: 'right' } as any);

  yPosition += 15;

  // Payment Info
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, 'normal');
  doc.text(`Payment Method: ${data.paymentMethod}`, margin, yPosition);
  yPosition += 8;

  // Terms and Conditions
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const termsText =
    'Thank you for your business! This is a computer-generated invoice and does not require a signature. For any queries, please contact us at 8780657095 or burhanghiya26@gmail.com';
  const termsLines = doc.splitTextToSize(termsText, contentWidth);
  doc.text(termsLines, margin, yPosition);

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

export async function generateInvoiceFileName(orderNumber: string): Promise<string> {
  return `Invoice-${orderNumber}-${Date.now()}.pdf`;
}
