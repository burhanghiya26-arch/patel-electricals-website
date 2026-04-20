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
