import PDFDocument from "pdfkit";

export interface ShippingLabelData {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  items: Array<{ name: string; quantity: number; partNumber?: string }>;
  totalAmount: string;
  shopName?: string;
  shopPhone?: string;
  shopEmail?: string;
  shopAddress?: string;
}

export async function generateShippingLabel(data: ShippingLabelData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 25 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header: Shop info (left)
      doc.fontSize(11).font("Helvetica-Bold").text(data.shopName || "Patel Electricals", 40, 35);
      doc.fontSize(8).font("Helvetica");
      doc.text(data.shopPhone || "8780657095", 40, 48);
      doc.text(data.shopEmail || "burhanghiya26@gmail.com", 40, 56);

      // Title (right aligned)
      doc.fontSize(18).font("Helvetica-Bold").text("SHIPPING LABEL", 300, 40, { align: "right" });
      doc.fontSize(9).font("Helvetica").text(`Order #${data.orderNumber}`, 300, 62, { align: "right" });

      doc.moveDown(1);

      // Address Box
      const boxX = 40;
      const boxY = doc.y + 10;
      const boxWidth = 515;
      const boxHeight = 80;

      doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

      // SHIP TO header
      doc.fontSize(10).font("Helvetica-Bold").text("SHIP TO:", boxX + 12, boxY + 10);

      // Address content - clean formatting without duplicates
      let contentY = boxY + 28;
      doc.fontSize(10).font("Helvetica-Bold").text(data.customerName, boxX + 12, contentY);

      contentY += 14;
      doc.fontSize(9).font("Helvetica").text(data.shippingAddress, boxX + 12, contentY);

      contentY += 12;
      doc.text(data.shippingCity, boxX + 12, contentY);

      contentY += 12;
      const stateZip = `${data.shippingState} - ${data.shippingZip}`;
      doc.text(stateZip, boxX + 12, contentY);

      doc.moveTo(boxX, boxY + boxHeight).lineTo(boxX + boxWidth, boxY + boxHeight).stroke();

      // Move to next section
      doc.y = boxY + boxHeight + 15;

      // Order Details Section
      doc.fontSize(11).font("Helvetica-Bold").text("ORDER DETAILS", 40, doc.y);
      doc.moveDown(0.8);

      // Table Header with Amount on same line
      const tableY = doc.y;
      const col1X = 40;
      const col2X = 240;
      const col3X = 400;
      const col4X = 450;

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Item", col1X, tableY);
      doc.text("Part #", col2X, tableY);
      doc.text("Qty", col3X, tableY);
      doc.text("Amount", col4X, tableY);

      // Separator line
      doc.moveTo(40, tableY + 16).lineTo(555, tableY + 16).stroke();

      // Items
      let itemY = tableY + 22;
      doc.fontSize(9).font("Helvetica");

      data.items.forEach((item) => {
        doc.text(item.name.substring(0, 30), col1X, itemY);
        doc.text(item.partNumber || "-", col2X, itemY);
        doc.text(item.quantity.toString(), col3X, itemY);
        doc.text(`₹${item.quantity}`, col4X, itemY); // Placeholder - will be calculated per item
        itemY += 14;
      });

      // Total line
      doc.moveTo(40, itemY).lineTo(555, itemY).stroke();
      itemY += 10;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("TOTAL:", col1X, itemY);
      doc.text(`₹${data.totalAmount}`, col4X, itemY, { align: "right" });

      doc.moveDown(3);

      // Footer
      doc.fontSize(8).font("Helvetica").text("Please keep this label safe. Do not fold or damage.", 40, doc.y, { align: "center" });
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 40, doc.y, { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
