type WhatsAppApiError = {
  error?: {
    message?: string;
    error_user_msg?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  id?: string;
  messages?: Array<{ id?: string }>;
};

type WhatsAppInvoiceResult =
  | { sent: true; messageId?: string }
  | { sent: false; reason: string };

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v26.0";
const INVOICE_TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_INVOICE_TEMPLATE_LANGUAGE || "en_US";

function getWhatsAppConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    invoiceTemplateName:
      process.env.WHATSAPP_INVOICE_TEMPLATE_NAME?.trim() || "",
  };
}

function normalizeRecipientPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    throw new Error("Customer phone number must include a valid country code.");
  }

  return digits;
}

async function readApiResponse(
  response: Response,
): Promise<WhatsAppApiError> {
  const body = await response.text();

  try {
    return JSON.parse(body) as WhatsAppApiError;
  } catch {
    return {};
  }
}

function explainApiFailure(
  data: WhatsAppApiError,
  fallback: string,
  stage: "PDF upload" | "invoice message send",
  httpStatus: number,
): string {
  const metaError = data.error;
  const message =
    metaError?.error_user_msg || metaError?.message || fallback;

  const details = [
    `stage=${stage}`,
    `http=${httpStatus}`,
    metaError?.code !== undefined
      ? `meta_code=${metaError.code}`
      : null,
    metaError?.error_subcode !== undefined
      ? `meta_subcode=${metaError.error_subcode}`
      : null,
    metaError?.fbtrace_id
      ? `meta_trace=${metaError.fbtrace_id}`
      : null,
  ].filter(Boolean);

  return `${message} [${details.join(", ")}]`;
}

async function uploadInvoicePdf(
  phoneNumberId: string,
  accessToken: string,
  pdf: Buffer,
  filename: string,
): Promise<string> {
  const form = new FormData();

  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append(
    "file",
    new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    filename,
  );

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(
      phoneNumberId,
    )}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    },
  );

  const result = await readApiResponse(response);

  if (!response.ok || !result.id) {
    throw new Error(
      explainApiFailure(
        result,
        "Meta could not upload the invoice PDF.",
        "PDF upload",
        response.status,
      ),
    );
  }

  return result.id;
}

export async function sendWhatsAppInvoice(data: {
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  pdf: Buffer;
}): Promise<WhatsAppInvoiceResult> {
  const { accessToken, phoneNumberId, invoiceTemplateName } =
    getWhatsAppConfig();

  if (!accessToken || !phoneNumberId || !invoiceTemplateName) {
    return {
      sent: false,
      reason:
        "WhatsApp setup is incomplete. Add the Meta access token, phone number ID, and approved invoice template name in Railway Variables.",
    };
  }

  try {
    const recipient = normalizeRecipientPhone(data.customerPhone);
    const filename = `${data.invoiceNumber.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    )}.pdf`;

    const mediaId = await uploadInvoicePdf(
      phoneNumberId,
      accessToken,
      data.pdf,
      filename,
    );

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(
        phoneNumberId,
      )}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: invoiceTemplateName,
            language: {
              code: INVOICE_TEMPLATE_LANGUAGE,
            },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      id: mediaId,
                      filename,
                    },
                  },
                ],
              },
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: data.customerName || "Customer",
                  },
                  {
                    type: "text",
                    text: data.invoiceNumber,
                  },
                  {
                    type: "text",
                    text: `₹${Number(data.totalAmount).toLocaleString(
                      "en-IN",
                    )}`,
                  },
                ],
              },
            ],
          },
        }),
      },
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
      return {
        sent: false,
        reason: explainApiFailure(
          result,
          "Meta could not send the WhatsApp invoice.",
          "invoice message send",
          response.status,
        ),
      };
    }

    return {
      sent: true,
      messageId: result.messages?.[0]?.id || result.id,
    };
  } catch (error) {
    return {
      sent: false,
      reason:
        error instanceof Error
          ? error.message
          : "WhatsApp invoice could not be sent.",
    };
  }
}

export async function sendOrderConfirmationWhatsApp(
  _data: unknown,
): Promise<boolean> {
  return false;
}

export async function sendOrderTrackingWhatsApp(
  _data: unknown,
): Promise<boolean> {
  return false;
}

export function getWhatsAppLink(
  message: string,
  phoneNumber = "918780657095",
): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
