import { Link, useRoute } from "wouter";
import { ArrowLeft, Clock, CheckCircle, Package, Truck, XCircle } from "lucide-react";
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

const statusIcon: Record<string, any> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

export default function CustomerOrderDetails() {
  const [, params] = useRoute("/customer/orders/:id");

  const orderId = Number(params?.id);

  const { data, isLoading } = trpc.orders.getById.useQuery(orderId, {
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Order...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Order not found.
      </div>
    );
  }

  const { order, items } = data;
  const StatusIcon = statusIcon[order.orderStatus] || Clock;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">

      <div className="max-w-6xl mx-auto">

        <Link href="/customer/dashboard">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2"/>
            Back to My Orders
          </Button>
        </Link>

        <Card className="mt-6">
          <CardContent className="p-6">

            <div className="flex justify-between items-start">

              <div>

                <h1 className="text-3xl font-bold">
                  Order Details
                </h1>

                <p className="text-gray-500 mt-2">
                  {order.orderNumber}
                </p>

                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>

              </div>

              <Badge
                className={
                  statusColor[order.orderStatus] ||
                  "bg-gray-100"
                }
              >
                <StatusIcon className="w-4 h-4 mr-2"/>

                {order.orderStatus}
              </Badge>

            </div>

          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mt-6">

          <Card>
            <CardContent className="p-6">

              <h2 className="font-bold text-lg mb-4">
                Payment
              </h2>

              <div className="space-y-2">

                <p>
                  <strong>Method :</strong>
                  {" "}
                  {order.paymentMethod?.toUpperCase()}
                </p>

                <p>
                  <strong>Status :</strong>
                  {" "}
                  {order.paymentStatus}
                </p>

                <p>
                  <strong>Total :</strong>
                  {" "}
                  ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                </p>

              </div>

            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">

              <h2 className="font-bold text-lg mb-4">
                Shipping Address
              </h2>

              <p className="whitespace-pre-line">
                {order.shippingAddress}
              </p>

              {order.trackingNumber && (
                <div className="mt-4">

                  <strong>Tracking :</strong>

                  <p className="text-blue-600">
                    {order.trackingNumber}
                  </p>

                </div>
              )}

            </CardContent>
          </Card>

        </div>
<div className="grid lg:grid-cols-3 gap-6 mt-6">

  {/* Products */}

  <div className="lg:col-span-2">

    <Card>

      <CardContent className="p-6">

        <h2 className="text-xl font-bold mb-5">
          Ordered Products
        </h2>

        <div className="space-y-5">

          {items.map((item: any) => (

            <div
              key={item.id}
              className="flex gap-4 border rounded-xl p-4"
            >

              <img
                src={
                  item.product?.imageUrl ||
                  "/placeholder-product.png"
                }
                className="w-20 h-20 rounded-lg border object-cover"
              />

              <div className="flex-1">

                <h3 className="font-semibold">
                  {item.product?.name}
                </h3>

                <p className="text-sm text-gray-500">
                  Part No :
                  {" "}
                  {item.product?.partNumber}
                </p>

                <p className="text-sm mt-1">
                  Qty :
                  {" "}
                  {item.quantity}
                </p>

                <p className="text-sm">
                  Price :
                  {" "}
                  ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                </p>

              </div>

              <div className="font-bold">

                ₹{Number(item.totalPrice).toLocaleString("en-IN")}

              </div>

            </div>

          ))}

        </div>

      </CardContent>

    </Card>

  </div>

  {/* Bill */}

  <div>

    <Card>

      <CardContent className="p-6">

        <h2 className="text-xl font-bold mb-5">
          Bill Summary
        </h2>

        <div className="space-y-3">

          <div className="flex justify-between">

            <span>Subtotal</span>

            <span>

              ₹
              {(
                Number(order.totalAmount)
                -
                Number(order.shippingCost)
              ).toLocaleString("en-IN")}

            </span>

          </div>

          <div className="flex justify-between">

            <span>Shipping</span>

            <span>

              ₹
              {Number(order.shippingCost).toLocaleString("en-IN")}

            </span>

          </div>

          <div className="flex justify-between">

            <span>GST</span>

            <span>

              ₹
              {Number(order.gstAmount).toLocaleString("en-IN")}

            </span>

          </div>

          <div className="flex justify-between">

            <span>Discount</span>

            <span>

              ₹
              {Number(order.discountAmount|| 0).toLocaleString("en-IN")}

            </span>

          </div>

          <hr />

          <div className="flex justify-between text-lg font-bold">

            <span>Total</span>

            <span>

              ₹
              {Number(order.totalAmount).toLocaleString("en-IN")}

            </span>

          </div>

        </div>

      </CardContent>

    </Card>

  </div>

  </div>
        
<div className="mt-8 grid lg:grid-cols-2 gap-6">

  {/* Order Timeline */}

  <Card>
    <CardContent className="p-6">

      <h2 className="text-xl font-bold mb-6">
        Order Timeline
      </h2>

      <div className="space-y-5">

        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600 w-6 h-6" />
          <span>Order Placed</span>
        </div>

        <div className="flex items-center gap-3">
          <Package
            className={`w-6 h-6 ${
              ["confirmed","processing","shipped","delivered"].includes(order.orderStatus)
                ? "text-green-600"
                : "text-gray-400"
            }`}
          />
          <span>Confirmed</span>
        </div>

        <div className="flex items-center gap-3">
          <Truck
            className={`w-6 h-6 ${
              ["shipped","delivered"].includes(order.orderStatus)
                ? "text-green-600"
                : "text-gray-400"
            }`}
          />
          <span>Shipped</span>
        </div>

        <div className="flex items-center gap-3">
          <CheckCircle
            className={`w-6 h-6 ${
              order.orderStatus === "delivered"
                ? "text-green-600"
                : "text-gray-400"
            }`}
          />
          <span>Delivered</span>
        </div>

      </div>

    </CardContent>
  </Card>

  {/* Actions */}

  <Card>

    <CardContent className="p-6">

      <h2 className="text-xl font-bold mb-6">
        Quick Actions
      </h2>

      <div className="space-y-3">

        <Button
          className="w-full"
          onClick={() =>
            window.open(`/api/trpc/orders.generateInvoice?input=${order.id}`)
          }
        >
          📄 Download Invoice
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            window.open(
              "https://wa.me/918780657095",
              "_blank"
            )
          }
        >
          💬 WhatsApp Support
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            window.open(
              "tel:+918780657095"
            )
          }
        >
          📞 Call Shop
        </Button>

      </div>

    </CardContent>

  </Card>

</div>
</div>
      </div>

    </div>
  );
}
