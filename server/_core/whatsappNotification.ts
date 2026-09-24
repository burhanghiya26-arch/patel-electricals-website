const WHATSAPP_NUMBER = "918780657095";

interface OrderNotificationData {
  customerPhone: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress?: string;
}

interface OrderTrackingNotificationData {
  customerPhone: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

/**
 * Send WhatsApp order confirmation notification to customer
 * Note: This uses a template-based approach. In production, integrate with WhatsApp Business API
 */
export async function sendOrderConfirmationWhatsApp(data: OrderNotificationData): Promise<boolean> {
  try {
    const itemsList = data.items
      .map((item) => `• ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`)
      .join("\n");

    const message = `Hi ${data.customerName},

Thank you for your order! 🎉

Order Details:
Order ID: ${data.orderId}
Order Number: #${data.orderNumber}
Total Amount: ₹${data.totalAmount.toFixed(2)}

Items:
${itemsList}

${data.shippingAddress ? `Shipping Address:\n${data.shippingAddress}\n` : ""}
We'll send you tracking updates soon!

Patel Electricals
Wholesale Spare Parts
📞 8780657095`;

    // Log the message for now - in production, integrate with WhatsApp Business API
    console.log(`[WhatsApp Notification] Order confirmation sent to ${data.customerPhone}:\n${message}`);

    // Notify owner about the order
    // Disabled: Manus notification service
    // await notifyOwner({
    //   title: `New Order #${data.orderNumber}`,
    //   content: `${data.customerName} placed an order for ₹${data.totalAmount.toFixed(2)}. Order ID: ${data.orderId}`,
    // });

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp order confirmation:", error);
    return false;
  }
}

/**
 * Send WhatsApp order tracking update notification to customer
 */
export async function sendOrderTrackingWhatsApp(data: OrderTrackingNotificationData): Promise<boolean> {
  try {
    const statusEmoji: Record<string, string> = {
      pending: "⏳",
      confirmed: "✅",
      shipped: "📦",
      delivered: "🎉",
      cancelled: "❌",
    };

    const emoji = statusEmoji[data.status.toLowerCase()] || "📍";

    let message = `Hi ${data.customerName},

Your order status has been updated! ${emoji}

Order Number: #${data.orderNumber}
Order ID: ${data.orderId}
Status: ${data.status.toUpperCase()}`;

    if (data.trackingNumber) {
      message += `\nTracking Number: ${data.trackingNumber}`;
    }

    if (data.estimatedDelivery) {
      message += `\nEstimated Delivery: ${data.estimatedDelivery}`;
    }

    message += `\n\nTrack your order: ${typeof window !== "undefined" ? window.location.origin : "https://patel-electricals.com"}/my-orders/${data.orderId}

Thank you for shopping with us!
Patel Electricals
📞 8780657095`;

    // Log the message for now - in production, integrate with WhatsApp Business API
    console.log(`[WhatsApp Notification] Tracking update sent to ${data.customerPhone}:\n${message}`);

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp tracking update:", error);
    return false;
  }
}

/**
 * Get WhatsApp link for manual messaging (fallback)
 */
export function getWhatsAppLink(message: string, phoneNumber: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

type WhatsAppInvoiceData = {
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  pdf: Buffer;
};

function getCloudApiConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return {
    accessToken,
    phoneNumberId,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v23.0",
    templateName: process.env.WHATSAPP_INVOICE_TEMPLATE_NAME?.trim() || "patel_invoice",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en_US",
  };
}

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Sends one approved Utility template containing the invoice PDF. It is
 * deliberately disabled until the Meta Cloud API variables are added in
 * Railway, so an incomplete setup can never block a paid order.
 */
export async function sendWhatsAppInvoice(data: WhatsAppInvoiceData) {
  const config = getCloudApiConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return { sent: false, reason: "WhatsApp API is not configured yet." };
  }

  const phone = normalizeWhatsAppPhone(data.customerPhone);
  if (phone.length < 10) return { sent: false, reason: "Customer WhatsApp number is missing or invalid." };

  const apiUrl = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}`;
  const headers = { Authorization: `Bearer ${config.accessToken}` };
  const fileName = `${data.invoiceNumber}.pdf`;

  try {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("file", new Blob([new Uint8Array(data.pdf)], { type: "application/pdf" }), fileName);

    const uploadResponse = await fetch(`${apiUrl}/media`, { method: "POST", headers, body: form });
    const uploadJson = await uploadResponse.json() as { id?: string; error?: { message?: string } };
    if (!uploadResponse.ok || !uploadJson.id) {
      throw new Error(uploadJson.error?.message || "Invoice PDF could not be uploaded to WhatsApp.");
    }

    const sendResponse = await fetch(`${apiUrl}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [
            { type: "header", parameters: [{ type: "document", document: { id: uploadJson.id, filename: fileName } }] },
            { type: "body", parameters: [
              { type: "text", text: data.customerName || "Customer" },
              { type: "text", text: data.invoiceNumber },
              { type: "text", text: `₹${Number(data.totalAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` },
            ] },
          ],
        },
      }),
    });
    const sendJson = await sendResponse.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
    if (!sendResponse.ok || !sendJson.messages?.[0]?.id) {
      throw new Error(sendJson.error?.message || "WhatsApp did not accept the invoice message.");
    }
    return { sent: true, messageId: sendJson.messages[0].id };
  } catch (error: any) {
    console.error("WhatsApp invoice send failed:", error);
    return { sent: false, reason: error?.message || "WhatsApp invoice could not be sent." };
  }
}
