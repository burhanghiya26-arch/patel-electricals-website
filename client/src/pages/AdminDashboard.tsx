import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Package, ShoppingCart, Users, FileText, TrendingUp, AlertCircle,
  Zap, LogOut, AlertTriangle, RotateCcw, X
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

function AdminNav({ current }: { current: string }) {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();
  
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }
  
  const navItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Products", path: "/admin/products" },
    { label: "Categories", path: "/admin/categories" },
    { label: "Inventory", path: "/admin/inventory" },
    { label: "Orders", path: "/admin/orders" },
    { label: "Customers", path: "/admin/customers" },
    { label: "Quotations", path: "/admin/quotations" },
    { label: "Dealers", path: "/admin/dealers" },
    { label: "Shipping", path: "/admin/shipping" },
    { label: "Reviews", path: "/admin/reviews" },
  ];
  
  return (
    <div className="bg-[oklch(0.22_0.05_260)] text-white">
      <div className="container py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/admin")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[oklch(0.65_0.15_85)]">
            <Zap className="h-5 w-5 text-[oklch(0.15_0.04_260)]" />
          </div>
          <div>
            <span className="text-lg font-bold">Admin Panel</span>
            <span className="block text-xs text-white/60">Patel Electricals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={() => setLocation("/")}>View Website</Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={() => { logout(); setLocation("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </div>
      <div className="container flex gap-1 pb-0 overflow-x-auto">
        {navItems.map((item) => (
          <Button key={item.path} variant="ghost" size="sm"
            className={`text-white/70 hover:text-white rounded-b-none border-b-2 ${
              current === item.path ? "border-[oklch(0.65_0.15_85)] text-white" : "border-transparent"
            }`}
            onClick={() => setLocation(item.path)}>{item.label}</Button>
        ))}
      </div>
    </div>
  );
}

export { AdminNav };

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    resetOrders: false,
    resetQuotations: false,
    resetReviews: false,
    resetCartItems: false,
    resetInventory: false,
  });

  // Fetch orders to calculate stats
  const { data: orders = [], refetch: refetchOrders } = trpc.orders.getAllOrders.useQuery({ limit: 1000, offset: 0 }, { 
    enabled: isAuthenticated && user?.role === 'admin' 
  });
  
  // Fetch products
  const { data: products = [] } = trpc.products.adminList.useQuery({ limit: 1000, offset: 0 }, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  // Fetch quotations
  const { data: quotations = [], refetch: refetchQuotations } = trpc.quotations.getAllQuotations.useQuery({ limit: 1000, offset: 0 }, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  // Fetch customers/users
  const { data: customersData } = trpc.adminDashboard.customers.useQuery({ limit: 1000, offset: 0 }, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  const resetSelectedMutation = trpc.adminDashboard.resetSelected.useMutation({
    onSuccess: () => {
      toast.success("Selected data reset successfully");
      setShowResetDialog(false);
      setResetOptions({ resetOrders: false, resetQuotations: false, resetReviews: false, resetCartItems: false, resetInventory: false });
      refetchOrders();
      refetchQuotations();
    },
    onError: () => toast.error("Failed to reset selected data"),
  });

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats from fetched data
  const totalProducts = products.length;
  const totalOrders = orders.length;
  // Only count delivered orders for revenue
  const totalRevenue = orders
    .filter((o: any) => o.orderStatus === 'delivered')
    .reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.orderStatus === 'pending').length;
  const totalUsers = customersData?.length || 0;
  const pendingQuotes = (quotations as any[]).filter((q: any) => q.status === 'pending').length;

  const statCards = [
    { label: "Total Products", value: totalProducts, icon: Package, color: "text-blue-600", bg: "bg-blue-50", link: "/admin/products" },
    { label: "Total Orders", value: totalOrders, icon: ShoppingCart, color: "text-green-600", bg: "bg-green-50", link: "/admin/orders" },
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", link: "/admin/orders" },
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-purple-600", bg: "bg-purple-50", link: "/admin/customers" },
    { label: "Pending Orders", value: pendingOrders, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", link: "/admin/orders" },
    { label: "Pending Quotes", value: pendingQuotes, icon: FileText, color: "text-orange-600", bg: "bg-orange-50", link: "/admin/quotations" },
  ];

  const quickLinks = [
    { label: "Add New Product", desc: "Add a new spare part to catalog", icon: Package, link: "/admin/products" },
    { label: "Manage Orders", desc: "View and update order statuses", icon: ShoppingCart, link: "/admin/orders" },
    { label: "Manage Categories", desc: "Add or edit product categories", icon: FileText, link: "/admin/categories" },
    { label: "View Customers", desc: "See all registered customers", icon: Users, link: "/admin/customers" },
  ];

  const resetOptionsList = [
    { key: "resetOrders", label: "Orders", desc: "Delete all orders and order items" },
    { key: "resetQuotations", label: "Quotations", desc: "Delete all quotation requests" },
    { key: "resetReviews", label: "Reviews", desc: "Delete all product reviews" },
    { key: "resetCartItems", label: "Cart Items", desc: "Clear all customer carts" },
    { key: "resetInventory", label: "Inventory", desc: "Reset stock to 100 units each" },
  ];

  const anySelected = Object.values(resetOptions).some(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin" />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name || user?.email || "Admin"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Stats
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(stat.link)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {quickLinks.map((link) => (
                  <Button
                    key={link.link}
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => setLocation(link.link)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <link.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-semibold">{link.label}</p>
                        <p className="text-xs text-muted-foreground">{link.desc}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
            <div className="space-y-2">
              {orders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">₹{Number(order.totalAmount || 0).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.orderStatus === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    order.orderStatus === 'shipped' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.orderStatus}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Stats Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">Reset Stats</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">Select which data you want to reset. This action cannot be undone.</p>
              <div className="space-y-3">
                {resetOptionsList.map((opt) => (
                  <label key={opt.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={resetOptions[opt.key as keyof typeof resetOptions]}
                      onChange={(e) => setResetOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                    />
                    <div>
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowResetDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!anySelected || resetSelectedMutation.isPending}
                onClick={() => resetSelectedMutation.mutate(resetOptions)}
              >
                {resetSelectedMutation.isPending ? "Resetting..." : "Reset Selected"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
