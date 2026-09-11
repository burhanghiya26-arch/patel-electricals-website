import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, CreditCard, Package, RefreshCw, ShoppingBag, TrendingUp, Truck } from "lucide-react";
import { AdminNav } from "./AdminDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatMoney = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ProfitDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("30");
  const days = period === "all" ? null : Number(period);
  const { data, isLoading, refetch, isFetching } = trpc.adminDashboard.profit.useQuery(
    { days },
    { enabled: isAuthenticated && user?.role === "admin" },
  );

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md text-center"><CardContent className="pt-6 space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="text-xl font-bold">Admin access required</h1>
          <Button onClick={() => setLocation("/admin/login")}>Admin Login</Button>
        </CardContent></Card>
      </div>
    );
  }

  const stats = data || {
    totalRevenue: 0, productRevenue: 0, retailRevenue: 0, wholesaleRevenue: 0,
    costOfGoods: 0, shippingExpense: 0, razorpayFees: 0, deliveredOrders: 0,
    missingPurchaseCostItems: 0, missingRazorpayFeeOrders: 0, grossProfit: 0, netProfit: 0, topProducts: [],
  };
  const profitMargin = stats.totalRevenue > 0 ? (stats.netProfit / stats.totalRevenue) * 100 : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNav current="/admin/profit" />
      <main className="container py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profit Dashboard</h1>
            <p className="text-sm text-muted-foreground">Sirf delivered orders ka actual profit.</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh profit data">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Net Profit" value={formatMoney(stats.netProfit)} detail={`${profitMargin.toFixed(1)}% margin`} icon={<TrendingUp className="h-5 w-5" />} tone="text-emerald-700" />
          <StatCard title="Total Revenue" value={formatMoney(stats.totalRevenue)} detail={`${stats.deliveredOrders} delivered orders`} icon={<ShoppingBag className="h-5 w-5" />} tone="text-blue-700" />
          <StatCard title="Purchase Cost" value={formatMoney(stats.costOfGoods)} detail="Sold items ki buying cost" icon={<Package className="h-5 w-5" />} tone="text-orange-700" />
          <StatCard title="Gross Product Profit" value={formatMoney(stats.grossProfit)} detail="Before shipping and payment fee" icon={<TrendingUp className="h-5 w-5" />} tone="text-violet-700" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Profit Calculation</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Retail product sale" value={formatMoney(stats.retailRevenue)} />
              <Row label="Wholesale / salesman product sale" value={formatMoney(stats.wholesaleRevenue)} />
              <Row label="Shipping amount collected" value={formatMoney(Math.max(0, stats.totalRevenue - stats.productRevenue))} />
              <Row label="Less: Purchase cost" value={`− ${formatMoney(stats.costOfGoods)}`} negative />
              <Row label="Less: Shipping expense" value={`− ${formatMoney(stats.shippingExpense)}`} negative />
              <Row label="Less: Razorpay fee" value={`− ${formatMoney(stats.razorpayFees)}`} negative />
              <div className="border-t pt-3 flex items-center justify-between text-base font-bold"><span>Net Profit</span><span className={stats.netProfit >= 0 ? "text-emerald-700" : "text-red-600"}>{formatMoney(stats.netProfit)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3"><div className="rounded-full bg-blue-50 p-2 text-blue-700"><Truck className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Shipping expense</p><p className="font-bold">{formatMoney(stats.shippingExpense)}</p></div></div>
              <div className="flex items-center gap-3"><div className="rounded-full bg-violet-50 p-2 text-violet-700"><CreditCard className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Razorpay fees</p><p className="font-bold">{formatMoney(stats.razorpayFees)}</p></div></div>
            </CardContent>
          </Card>
        </div>

        {(stats.missingPurchaseCostItems > 0 || stats.missingRazorpayFeeOrders > 0) && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex gap-3 pt-5 text-sm text-amber-950">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Kuch purane orders ka data adhura hai</p>
                {stats.missingPurchaseCostItems > 0 && <p>{stats.missingPurchaseCostItems} sold item(s) mein Purchase Cost nahi mila. Product edit karke cost bhar dein.</p>}
                {stats.missingRazorpayFeeOrders > 0 && <p>{stats.missingRazorpayFeeOrders} purane Razorpay order(s) ka actual fee save nahi hua tha.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Most Profitable Products</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="py-8 text-center text-muted-foreground">Loading profit data...</p> : stats.topProducts.length === 0 ? <p className="py-8 text-center text-muted-foreground">Selected period mein delivered orders nahi mile.</p> : (
              <div className="space-y-3">
                {stats.topProducts.map((product) => <div key={product.name} className="grid grid-cols-[1fr_auto] gap-3 border-b pb-3 last:border-0 last:pb-0 text-sm">
                  <div><p className="font-medium">{product.name}</p><p className="text-muted-foreground">{product.quantity} sold · Sale {formatMoney(product.revenue)} · Cost {formatMoney(product.cost)}</p></div>
                  <p className={product.profit >= 0 ? "font-bold text-emerald-700" : "font-bold text-red-600"}>{formatMoney(product.profit)}</p>
                </div>)}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ title, value, detail, icon, tone }: { title: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return <Card><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{title}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className={`rounded-lg bg-muted p-2 ${tone}`}>{icon}</div></div></CardContent></Card>;
}

function Row({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className={negative ? "text-red-600" : "font-medium"}>{value}</span></div>;
}
