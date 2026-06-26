import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ShoppingCart, FileText, LogOut, Package, Clock, CheckCircle, Truck, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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

const quotationStatusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  quoted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

export default function CustomerDashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.customer.getMyData.useQuery(undefined, {
    retry: false,
  });

  const logoutMutation = trpc.customer.logoutSession.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      setLocation("/customer/login");
    },
  });

  useEffect(() => {
    if (!isLoading && !data) {
      setLocation("/customer/login");
    }
  }, [isLoading, data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, orders, quotations } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">My Account</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Shop
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-lg font-bold text-slate-900">Welcome, {user.name || (user.email ? user.email.split("@")[0] : "Customer")}!</p>
          <p className="text-sm text-gray-600 mt-1">{user.email} {user.phone ? `• ${user.phone}` : ""}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quotations.length}</p>
                <p className="text-xs text-gray-500">Quotations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> My Orders
          </h2>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No orders yet</p>
                <Link href="/products">
                  <Button className="mt-3 bg-amber-500 hover:bg-amber-600 text-white" size="sm">Browse Products</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => {
                const StatusIcon = statusIcon[order.orderStatus] || Clock;
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${statusColor[order.orderStatus] || "bg-gray-100 text-gray-800"}`}>
                          <StatusIcon className="w-3 h-3" />
                          {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Payment: {order.paymentMethod?.toUpperCase()} • {order.paymentStatus}</p>
                        <p className="font-bold text-slate-900">₹{Number(order.totalAmount).toLocaleString("en-IN")}</p>
                      </div>
                      {order.shippingAddress && (
                        <p className="text-xs text-gray-500 mt-1 truncate">📍 {order.shippingAddress}</p>
                      )}
                      {order.trackingNumber && (
                        <p className="text-xs text-blue-600 mt-1">🚚 Tracking: {order.trackingNumber}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quotations */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> My Quotations
          </h2>
          {quotations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No quotations yet</p>
                <Link href="/products">
                  <Button className="mt-3 bg-amber-500 hover:bg-amber-600 text-white" size="sm">Request a Quote</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {quotations.map((q: any) => (
                <Card key={q.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{q.quotationNumber}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${quotationStatusColor[q.status] || "bg-gray-100 text-gray-800"}`}>
                        {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Amount: ₹{Number(q.totalAmount).toLocaleString("en-IN")}</p>
                      {q.quotedPrice && (
                        <p className="text-sm font-bold text-green-700">Quoted: ₹{Number(q.quotedPrice).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                    {q.adminNotes && (
                      <p className="text-xs text-blue-700 mt-1 bg-blue-50 px-2 py-1 rounded">Note: {q.adminNotes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
