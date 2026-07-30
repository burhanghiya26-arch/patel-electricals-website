import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusIcon: Record<string, LucideIcon> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const formatCurrency = (value: unknown) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

export default function CustomerOrderDetails() {
  const [, params] = useRoute("/customer/orders/:id");
  const orderId = Number(params?.id);

  const { data, isLoading } = trpc.orders.getById.useQuery(orderId, {
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  const generateInvoice = trpc.orders.generateInvoice.useMutation();
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading order...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Order not found.
      </div>
    );
  }

  const { order, items } = data;

  const handleDownloadInvoice = async () => {
  try {
    const result = await generateInvoice.mutateAsync(order.id);

    const invoiceUrl =
      typeof result === "string"
        ? result
        : typeof result === "object" &&
            result !== null &&
            "url" in result
          ? String(result.url)
          : null;

    if (!invoiceUrl) {
      throw new Error("Invoice URL server se nahi mila.");
    }

    window.open(invoiceUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Invoice download failed:", error);
    alert("Invoice download nahi ho saka. Dobara try karein.");
  }
};
  
  const orderStatus = order.orderStatus?.toLowerCase() ?? "pending";
  const StatusIcon = statusIcon[orderStatus] ?? Clock;

  const totalAmount = Number(order.totalAmount ?? 0);
  const shippingCost = Number(order.shippingCost ?? 0);
  const gstAmount = Number(order.gstAmount ?? 0);
  const discountAmount = Number(order.discountAmount ?? 0);
  const subtotal = totalAmount - shippingCost - gstAmount + discountAmount;

  const confirmedStatuses = ["confirmed", "processing", "shipped", "delivered"];
  const shippedStatuses = ["shipped", "delivered"];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/customer/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Orders
          </Button>
        </Link>

        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Order Details</h1>
                <p className="mt-2 text-gray-500">{order.orderNumber}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleString("en-IN")}
                </p>
              </div>

              <Badge className={statusColor[orderStatus] ?? "bg-gray-100 text-gray-800"}>
                <StatusIcon className="mr-2 h-4 w-4" />
                {order.orderStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold">Payment</h2>

              <div className="space-y-2">
                <p>
                  <strong>Method:</strong>{" "}
                  {order.paymentMethod?.toUpperCase() ?? "Not specified"}
                </p>
                <p>
                  <strong>Status:</strong> {order.paymentStatus ?? "Pending"}
                </p>
                <p>
                  <strong>Total:</strong> {formatCurrency(totalAmount)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold">Shipping Address</h2>

              <p className="whitespace-pre-line">
                {order.shippingAddress ?? "Address not available"}
              </p>

              {order.trackingNumber && (
                <div className="mt-4">
                  <strong>Tracking:</strong>
                  <p className="text-blue-600">{order.trackingNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-5 text-xl font-bold">Ordered Products</h2>

                <div className="space-y-5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 rounded-xl border p-4"
                    >
                      <img
                        src={item.product?.imageUrl ?? "/placeholder-product.png"}
                        alt={item.product?.name ?? "Product"}
                        className="h-20 w-20 rounded-lg border object-cover"
                      />

                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {item.product?.name ?? "Product"}
                        </h3>

                        <p className="text-sm text-gray-500">
                          Part No: {item.product?.partNumber ?? "—"}
                        </p>

                        <p className="mt-1 text-sm">Qty: {item.quantity}</p>

                        <p className="text-sm">
                          Price: {formatCurrency(item.unitPrice)}
                        </p>
                      </div>

                      <div className="font-bold">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-5 text-xl font-bold">Bill Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>

                <div className="flex justify-between">
                  <span>GST</span>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>

                <hr />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-6 text-xl font-bold">Order Timeline</h2>

              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Order Placed</span>
                </div>

                <div className="flex items-center gap-3">
                  <Package
                    className={`h-6 w-6 ${
                      confirmedStatuses.includes(orderStatus)
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span>Confirmed</span>
                </div>

                <div className="flex items-center gap-3">
                  <Truck
                    className={`h-6 w-6 ${
                      shippedStatuses.includes(orderStatus)
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span>Shipped</span>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle
                    className={`h-6 w-6 ${
                      orderStatus === "delivered"
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span>Delivered</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-6 text-xl font-bold">Quick Actions</h2>

              <div className="space-y-3">
               <Button
  className="w-full"
  disabled={generateInvoice.isPending}
  onClick={handleDownloadInvoice}
>
  {generateInvoice.isPending
    ? "Invoice prepare ho raha hai..."
    : "📄 Download Invoice"}
</Button> 

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.open("https://wa.me/918780657095", "_blank")
                  }
                >
                  💬 WhatsApp Support
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open("tel:+918780657095")}
                >
                  📞 Call Shop
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
