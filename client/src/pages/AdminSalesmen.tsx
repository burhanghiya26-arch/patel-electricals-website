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
type SalesmanForm = LoginForm & { commissionRate: string };
const emptyLogin: LoginForm = { name: "", email: "", phone: "", password: "" };
const emptySalesman: SalesmanForm = { ...emptyLogin, commissionRate: "0" };

export default function AdminSalesmen() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [salesmanForm, setSalesmanForm] = useState<SalesmanForm>(emptySalesman);
  const [deliveryForm, setDeliveryForm] = useState<LoginForm>(emptyLogin);
  const [deliveryByOrder, setDeliveryByOrder] = useState<Record<number, string>>({});
  const [commissionDraft, setCommissionDraft] = useState<Record<number, string>>({});
  const enabled = isAuthenticated && user?.role === "admin";
  const salesmen = trpc.salesman.list.useQuery(undefined, { enabled });
  const deliveryStaff = trpc.delivery.listStaff.useQuery(undefined, { enabled });
  const orders = trpc.orders.getAllOrders.useQuery({ limit: 100, offset: 0 }, { enabled });
  const createSalesman = trpc.salesman.create.useMutation({
    onSuccess: async () => { toast.success("Salesman ID created"); setSalesmanForm(emptySalesman); await utils.salesman.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const updateCommission = trpc.salesman.updateCommissionRate.useMutation({
    onSuccess: async () => { toast.success("Commission rate saved"); await utils.salesman.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const createDelivery = trpc.delivery.createStaff.useMutation({
    onSuccess: async () => { toast.success("Delivery boy ID created"); setDeliveryForm(emptyLogin); await utils.delivery.listStaff.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const assignDelivery = trpc.delivery.assignOrder.useMutation({
    onSuccess: async () => { toast.success("Delivery boy assigned"); await utils.orders.getAllOrders.invalidate(); setDeliveryByOrder({}); },
    onError: error => toast.error(error.message),
  });

  if (!enabled) return null;
  const shippedOrders = (orders.data || []).filter(order => order.orderStatus === "shipped");
  const validRate = (value: string) => { const rate = Number(value); return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null; };
  const loginFields = (form: LoginForm, setForm: (value: LoginForm) => void) => <>
    <div><Label>Name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
    <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
    <div><Label>Email / ID</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
    <div><Label>Password</Label><Input type="password" minLength={6} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
  </>;

  return <div className="min-h-screen bg-background">
    <AdminNav current="/admin/salesmen" />
    <main className="container space-y-6 py-8">
      <div><h1 className="text-2xl font-bold">Staff Management</h1><p className="text-muted-foreground">Salesman aur delivery boy IDs, commission aur delivery assignment yahin se manage karein.</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Create Salesman Login</CardTitle><CardDescription>Link: yourwebsite.com/salesman — shop ka wholesale order book karega.</CardDescription></CardHeader><CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const commissionRate = validRate(salesmanForm.commissionRate); if (commissionRate === null) return toast.error("Commission rate 0 se 100 ke beech rakhein."); createSalesman.mutate({ name: salesmanForm.name, email: salesmanForm.email, password: salesmanForm.password, phone: salesmanForm.phone || undefined, commissionRate }); }}>
            {loginFields(salesmanForm, value => setSalesmanForm({ ...salesmanForm, ...value }))}
            <div><Label>Commission Rate (%)</Label><Input type="number" min="0" max="100" step="0.01" value={salesmanForm.commissionRate} onChange={e => setSalesmanForm({ ...salesmanForm, commissionRate: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">Delivered order amount ka percentage.</p></div>
            <Button className="sm:w-fit" disabled={createSalesman.isPending}>{createSalesman.isPending ? "Creating..." : "Generate Salesman ID"}</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Create Delivery Boy Login</CardTitle><CardDescription>Link: yourwebsite.com/delivery — assigned orders deliver karega.</CardDescription></CardHeader><CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); createDelivery.mutate({ ...deliveryForm, phone: deliveryForm.phone || undefined }); }}>
            {loginFields(deliveryForm, setDeliveryForm)}
            <Button className="sm:w-fit" disabled={createDelivery.isPending}>{createDelivery.isPending ? "Creating..." : "Generate Delivery ID"}</Button>
          </form>
        </CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Created Salesmen & Commission</CardTitle><CardDescription>Rate badalne se sirf naye orders par effect hoga.</CardDescription></CardHeader><CardContent>
          {!salesmen.data?.length ? <p className="text-sm text-muted-foreground">No salesman ID created yet.</p> : <div className="space-y-3">{salesmen.data.map(person => {
            const rate = commissionDraft[person.id] ?? String(Number(person.commissionRate || 0));
            return <div key={person.id} className="rounded-lg border p-3"><p className="font-semibold">{person.name}</p><p className="text-sm text-muted-foreground">{person.email}{person.phone ? ` · ${person.phone}` : ""}</p><div className="mt-3 flex max-w-sm items-end gap-2"><div className="flex-1"><Label className="text-xs">Commission Rate (%)</Label><Input type="number" min="0" max="100" step="0.01" value={rate} onChange={e => setCommissionDraft(current => ({ ...current, [person.id]: e.target.value }))} /></div><Button size="sm" disabled={updateCommission.isPending} onClick={() => { const commissionRate = validRate(rate); if (commissionRate === null) return toast.error("Rate 0 se 100 ke beech rakhein."); updateCommission.mutate({ salesmanId: person.id, commissionRate }); }}>Save</Button></div></div>;
          })}</div>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Created Delivery Boys</CardTitle></CardHeader><CardContent>
          {!deliveryStaff.data?.length ? <p className="text-sm text-muted-foreground">No delivery-boy ID created yet.</p> : <div className="space-y-3">{deliveryStaff.data.map(person => <div key={person.id} className="rounded-lg border p-3"><p className="font-semibold">{person.name}</p><p className="text-sm text-muted-foreground">{person.email}{person.phone ? ` · ${person.phone}` : ""}</p></div>)}</div>}
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Assign Shipped Orders to Delivery Boy</CardTitle><CardDescription>Admin Delivery page kholne ki zarurat nahi—shipped orders isi screen se assign karein.</CardDescription></CardHeader><CardContent>
        {!shippedOrders.length ? <p className="text-sm text-muted-foreground">Abhi koi shipped order assignment ke liye pending nahi hai.</p> : <div className="space-y-3">{shippedOrders.map(order => <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center"><div className="flex-1"><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-muted-foreground">{order.shopName || order.userName || "Customer"} · {order.shippingAddress}</p></div><Select value={deliveryByOrder[order.id] || ""} onValueChange={value => setDeliveryByOrder(current => ({ ...current, [order.id]: value }))}><SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Select delivery boy" /></SelectTrigger><SelectContent>{deliveryStaff.data?.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name} ({person.email})</SelectItem>)}</SelectContent></Select><Button disabled={assignDelivery.isPending || !deliveryByOrder[order.id]} onClick={() => assignDelivery.mutate({ orderId: order.id, deliveryStaffId: Number(deliveryByOrder[order.id]) })}>Assign</Button></div>)}</div>}
      </CardContent></Card>
    </main>
  </div>;
}
