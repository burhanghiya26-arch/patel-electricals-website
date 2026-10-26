import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AdminNav } from "./AdminDashboard";
import { toast } from "sonner";

type LoginForm = { name: string; email: string; phone: string; password: string };
const emptyLogin: LoginForm = { name: "", email: "", phone: "", password: "" };

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function AdminSalesmen() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [salesmanForm, setSalesmanForm] = useState<LoginForm>(emptyLogin);
  const [deliveryForm, setDeliveryForm] = useState<LoginForm>(emptyLogin);
  const [deliveryByOrder, setDeliveryByOrder] = useState<Record<number, string>>({});
  const [commissionPeriod, setCommissionPeriod] = useState("all");
  const enabled = isAuthenticated && user?.role === "admin";
  const commissionDays = commissionPeriod === "all" ? null : Number(commissionPeriod);

  const salesmen = trpc.salesman.list.useQuery(undefined, { enabled });
  const commissionReport = trpc.salesman.commissionReport.useQuery({ days: commissionDays }, { enabled });
  const commissionOrders = trpc.salesman.commissionOrders.useQuery({ days: commissionDays }, { enabled });
  const deliveryStaff = trpc.delivery.listStaff.useQuery(undefined, { enabled });
  const orders = trpc.orders.getAllOrders.useQuery({ limit: 100, offset: 0 }, { enabled });

  const createSalesman = trpc.salesman.create.useMutation({
    onSuccess: async () => {
      toast.success("Salesman ID created");
      setSalesmanForm(emptyLogin);
      await utils.salesman.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const markCommissionPaid = trpc.salesman.markCommissionPaid.useMutation({
    onSuccess: async () => {
      toast.success("Commission ko paid mark kar diya gaya");
      await Promise.all([
        utils.salesman.commissionReport.invalidate(),
        utils.salesman.commissionOrders.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });

  const createDelivery = trpc.delivery.createStaff.useMutation({
    onSuccess: async () => {
      toast.success("Delivery boy ID created");
      setDeliveryForm(emptyLogin);
      await utils.delivery.listStaff.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const assignDelivery = trpc.delivery.assignOrder.useMutation({
    onSuccess: async () => {
      toast.success("Delivery boy assigned");
      await utils.orders.getAllOrders.invalidate();
      setDeliveryByOrder({});
    },
    onError: error => toast.error(error.message),
  });

  if (!enabled) return null;

  const shippedOrders = (orders.data || []).filter(order => order.orderStatus === "shipped");
  const loginFields = (form: LoginForm, setForm: (value: LoginForm) => void) => <>
    <div><Label>Name</Label><Input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div>
    <div><Label>Phone</Label><Input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></div>
    <div><Label>Email / ID</Label><Input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></div>
    <div><Label>Password</Label><Input type="password" minLength={6} required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></div>
  </>;

  return <div className="min-h-screen bg-background">
    <AdminNav current="/admin/salesmen" />
    <main className="container space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Salesman, delivery staff aur product-wise commission yahin manage karein.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Salesman Login</CardTitle>
            <CardDescription>Link: yourwebsite.com/salesman — shop ka wholesale order book karega.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => {
              event.preventDefault();
              createSalesman.mutate({
                name: salesmanForm.name,
                email: salesmanForm.email,
                password: salesmanForm.password,
                phone: salesmanForm.phone || undefined,
              });
            }}>
              {loginFields(salesmanForm, setSalesmanForm)}
              <div className="sm:col-span-2 rounded-md bg-indigo-50 p-3 text-sm text-indigo-900">
                Commission har product ke andar set hota hai: <b>Admin Products → Salesman Commission (₹ per unit)</b>.
              </div>
              <Button className="sm:w-fit" disabled={createSalesman.isPending}>
                {createSalesman.isPending ? "Creating..." : "Generate Salesman ID"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Delivery Boy Login</CardTitle>
            <CardDescription>Link: yourwebsite.com/delivery — assigned orders deliver karega.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => {
              event.preventDefault();
              createDelivery.mutate({ ...deliveryForm, phone: deliveryForm.phone || undefined });
            }}>
              {loginFields(deliveryForm, setDeliveryForm)}
              <Button className="sm:w-fit" disabled={createDelivery.isPending}>
                {createDelivery.isPending ? "Creating..." : "Generate Delivery ID"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Created Salesmen</CardTitle><CardDescription>Inke product-wise earnings neeche report mein dikhenge.</CardDescription></CardHeader>
          <CardContent>
            {!salesmen.data?.length ? <p className="text-sm text-muted-foreground">No salesman ID created yet.</p> : (
              <div className="space-y-3">
                {salesmen.data.map(person => <div key={person.id} className="rounded-lg border p-3">
                  <p className="font-semibold">{person.name}</p>
                  <p className="text-sm text-muted-foreground">{person.email}{person.phone ? ` · ${person.phone}` : ""}</p>
                </div>)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Created Delivery Boys</CardTitle></CardHeader>
          <CardContent>
            {!deliveryStaff.data?.length ? <p className="text-sm text-muted-foreground">No delivery-boy ID created yet.</p> : (
              <div className="space-y-3">
                {deliveryStaff.data.map(person => <div key={person.id} className="rounded-lg border p-3">
                  <p className="font-semibold">{person.name}</p>
                  <p className="text-sm text-muted-foreground">{person.email}{person.phone ? ` · ${person.phone}` : ""}</p>
                </div>)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Salesman Commission Report</CardTitle>
              <CardDescription>Delivered orders ka product-wise commission. “Mark paid” sirf record banata hai; payment aap UPI/cash/bank se alag se karoge.</CardDescription>
            </div>
            <Select value={commissionPeriod} onValueChange={setCommissionPeriod}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-amber-50 p-4"><p className="text-sm text-amber-800">Payment Pending</p><p className="text-2xl font-bold text-amber-800">{money(Number(commissionReport.data?.totalPayableCommission || 0))}</p></div>
            <div className="rounded-lg bg-emerald-50 p-4"><p className="text-sm text-emerald-800">Paid Marked</p><p className="text-2xl font-bold text-emerald-800">{money(Number(commissionReport.data?.totalPaidCommission || 0))}</p></div>
            <div className="rounded-lg bg-slate-100 p-4"><p className="text-sm text-slate-700">Total Commission</p><p className="text-2xl font-bold text-slate-900">{money(Number(commissionReport.data?.totalCommission || 0))}</p></div>
          </div>

          {!commissionReport.data?.salesmen.length ? <p className="text-sm text-muted-foreground">Is time period mein delivered salesman order nahi hai.</p> : (
            <div className="space-y-3">
              {commissionReport.data.salesmen.map(person => <div key={person.salesmanId} className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                <div><p className="font-semibold">{person.name}</p><p className="text-sm text-muted-foreground">{person.deliveredOrders} delivered orders · Sale {money(Number(person.salesAmount || 0))}</p></div>
                <div className="grid grid-cols-2 gap-4 text-right text-sm"><div><p className="text-muted-foreground">Pending</p><p className="font-bold text-amber-700">{money(Number(person.payableCommission || 0))}</p></div><div><p className="text-muted-foreground">Paid</p><p className="font-bold text-emerald-700">{money(Number(person.paidCommission || 0))}</p></div></div>
              </div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order-wise Product Commission</CardTitle><CardDescription>Har product ka ₹ per unit × quantity = salesman commission.</CardDescription></CardHeader>
        <CardContent>
          {commissionOrders.isLoading && <p className="py-5 text-center text-sm text-muted-foreground">Commission orders load ho rahe hain...</p>}
          {!commissionOrders.isLoading && !commissionOrders.data?.length && <p className="text-sm text-muted-foreground">Abhi salesman ke through koi order book nahi hua.</p>}
          <div className="space-y-3">
            {commissionOrders.data?.map(order => {
              const isPayable = order.commissionStatus === "payable";
              const isPaid = order.commissionStatus === "paid";
              const isCancelled = order.commissionStatus === "cancelled";
              const commission = Number(order.commissionAmount || 0);
              const hasProductBreakdown = order.items?.some(item => item.salesmanCommissionAmount !== null && item.salesmanCommissionAmount !== undefined);

              return <div key={order.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.orderNumber}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">{order.orderStatus}</span></div>
                    <p className="text-sm text-slate-700">{order.salesmanName || "Unknown salesman"} · {order.shopName || order.customerName || "Customer"}</p>
                    <p className="text-xs text-muted-foreground">Order: {money(Number(order.orderAmount || 0))} · {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="shrink-0 md:text-right"><p className="text-lg font-bold">{money(commission)}</p><p className={`text-xs font-medium ${isPayable ? "text-amber-700" : isPaid ? "text-emerald-700" : isCancelled ? "text-red-600" : "text-slate-600"}`}>{isPayable ? "Payment pending" : isPaid ? "Paid marked" : isCancelled ? "Cancelled — not payable" : "Delivery pending"}</p></div>
                </div>

                {hasProductBreakdown ? <div className="mt-3 space-y-1 rounded-md bg-indigo-50 p-3 text-sm text-indigo-950"><p className="font-semibold">Product-wise calculation</p>{order.items.map(item => <p key={item.productId}>{item.productName || item.partNumber || "Product"}: {money(Number(item.salesmanCommissionPerUnit || 0))} × {item.quantity} = <b>{money(Number(item.salesmanCommissionAmount || 0))}</b></p>)}</div> : <p className="mt-3 text-xs text-muted-foreground">Purane order ka product-wise commission snapshot available nahi hai.</p>}

                {isPayable && <div className="mt-3 flex justify-end"><Button size="sm" disabled={markCommissionPaid.isPending} onClick={() => { if (window.confirm(`${order.salesmanName || "Salesman"} ko ${money(commission)} aap manually de chuke ho? Isse sirf record Paid hoga.`)) markCommissionPaid.mutate({ orderId: order.id }); }}>{markCommissionPaid.isPending ? "Saving..." : "Mark Paid"}</Button></div>}
              </div>;
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assign Shipped Orders to Delivery Boy</CardTitle><CardDescription>Admin Delivery page kholne ki zarurat nahi—shipped orders isi screen se assign karein.</CardDescription></CardHeader>
        <CardContent>
          {!shippedOrders.length ? <p className="text-sm text-muted-foreground">Abhi koi shipped order assignment ke liye pending nahi hai.</p> : <div className="space-y-3">{shippedOrders.map(order => <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center"><div className="flex-1"><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-muted-foreground">{order.shopName || order.userName || "Customer"} · {order.shippingAddress}</p></div><Select value={deliveryByOrder[order.id] || ""} onValueChange={value => setDeliveryByOrder(current => ({ ...current, [order.id]: value }))}><SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Select delivery boy" /></SelectTrigger><SelectContent>{deliveryStaff.data?.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name} ({person.email})</SelectItem>)}</SelectContent></Select><Button disabled={assignDelivery.isPending || !deliveryByOrder[order.id]} onClick={() => assignDelivery.mutate({ orderId: order.id, deliveryStaffId: Number(deliveryByOrder[order.id]) })}>Assign</Button></div>)}</div>}
        </CardContent>
      </Card>
    </main>
  </div>;
}
