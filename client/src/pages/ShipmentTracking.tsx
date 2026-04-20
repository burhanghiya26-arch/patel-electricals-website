import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Package, Truck, MapPin, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const statusSteps = [
  { status: "pending", label: "Order Placed", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: MapPin },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ShipmentTracking() {
  const { user, isAuthenticated } = useAuth();
  const [searchOrderId, setSearchOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const { data: myOrders } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: trackingOrder, isLoading: trackingLoading } = trpc.orders.getById.useQuery(
    selectedOrder ? parseInt(selectedOrder) : 0,
    { enabled: !!selectedOrder }
  );

  const handleSearchOrder = (orderId: string) => {
    if (!orderId.trim()) {
      toast.error("Please enter an order ID");
      return;
    }
    setSelectedOrder(orderId);
  };

  const displayOrder = trackingOrder?.order || (selectedOrder ? null : myOrders?.[0]);
  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex((s) => s.status === status);
  };
  const currentStatusIndex = displayOrder ? getStatusIndex(displayOrder.orderStatus) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Track Your Shipment</h1>
          <p className="text-slate-600">Monitor your order status in real-time</p>
        </div>

        {/* Search Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Search Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Order ID"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearchOrder(searchOrderId);
                  }
                }}
              />
              <Button onClick={() => handleSearchOrder(searchOrderId)}>Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* My Orders List */}
        {!selectedOrder && isAuthenticated && myOrders && myOrders.length > 0 && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle>Your Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myOrders.slice(0, 5).map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(String(order.id))}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-900">{order.orderNumber || order.id}</p>
                        <p className="text-sm text-slate-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={statusColors[order.orderStatus] || "bg-gray-100"}>
                        {order.orderStatus}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tracking Timeline */}
        {(displayOrder || trackingLoading) && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Order {displayOrder?.orderNumber || displayOrder?.id}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Placed on {displayOrder && new Date(displayOrder.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {displayOrder && (
                  <Badge className={statusColors[displayOrder.orderStatus] || "bg-gray-100"}>
                    {displayOrder.orderStatus.charAt(0).toUpperCase() + displayOrder.orderStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {trackingLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Loading tracking information...</p>
                </div>
              ) : displayOrder ? (
                <div className="space-y-8">
                  {/* Timeline */}
                  <div className="relative">
                    <div className="space-y-6">
                      {statusSteps.map((step: any, index: number) => {
                        const isCompleted = index <= currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;
                        const Icon = step.icon;

                        return (
                          <div key={step.status} className="flex gap-4">
                            {/* Timeline dot and line */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                  isCompleted
                                    ? "bg-green-500 text-white"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div
                                  className={`w-1 h-12 mt-2 transition-colors ${
                                    isCompleted ? "bg-green-500" : "bg-slate-200"
                                  }`}
                                />
                              )}
                            </div>

                            {/* Status info */}
                            <div className="pt-1 pb-6">
                              <p
                                className={`font-semibold ${
                                  isCompleted ? "text-slate-900" : "text-slate-600"
                                }`}
                              >
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="text-sm text-blue-600 mt-1">Current Status</p>
                              )}
                              {isCompleted && !isCurrent && (
                                <p className="text-sm text-slate-600 mt-1">Completed</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Order Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Total Amount</p>
                        <p className="font-semibold text-slate-900">
                          ₹{parseFloat(displayOrder.totalAmount || "0").toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Items</p>
                        <p className="font-semibold text-slate-900">
                          {trackingOrder?.items?.length || 0} item(s)
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-slate-600">Shipping Address</p>
                        <p className="font-semibold text-slate-900">
                          {displayOrder.shippingAddress || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600">Order not found</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedOrder && (!isAuthenticated || !myOrders || myOrders.length === 0) && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                {isAuthenticated
                  ? "You don't have any orders yet"
                  : "Please log in to track your orders"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
