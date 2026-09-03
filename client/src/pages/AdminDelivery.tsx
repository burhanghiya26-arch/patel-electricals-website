import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AdminNav } from "./AdminDashboard";
import { ShieldCheck, Truck, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function AdminDelivery() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [staffByOrder, setStaffByOrder] = useState<Record<number, string>>({});

  const staff = trpc.delivery.listStaff.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const orders = trpc.orders.getAllOrders.useQuery({ limit: 100, offset: 0 }, { enabled: isAuthenticated && user?.role === "admin" });

  const createStaff = trpc.delivery.createStaff.useMutation({
    onSuccess: async () => {
      toast.success("Delivery staff login created");
      setForm({ name: "", email: "", phone: "", password: "" });
      await utils.delivery.listStaff.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const assignOrder = trpc.delivery.assignOrder.useMutation({
    onSuccess: async () => {
      toast.success("Order assigned. Customer can now see the delivery OTP in My Orders.");
      await utils.orders.getAllOrders.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!isAuthenticated || user?.role !== "admin") return null;
  const shippedOrders = orders.data?.filter((order) => order.orderStatus === "shipped") || [];

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/delivery" />
      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Delivery Staff & OTP</h1>
          <p className="text-muted-foreground">Delivery staff only sees the orders you assign. They cannot access the admin panel.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add delivery person</CardTitle><CardDescription>Create a separate email and password for the delivery portal.</CardDescription></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createStaff.mutate({ ...form, phone: form.phone || undefined }); }}>
              <Input placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              <Input placeholder="Phone number (optional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <Input type="password" minLength={6} placeholder="Password (minimum 6 characters)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <Button className="md:col-span-2 md:w-fit" type="submit" disabled={createStaff.isPending}>{createStaff.isPending ? "Creating..." : "Create delivery login"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Delivery staff</CardTitle></CardHeader>
          <CardContent>
            {!staff.data?.length ? <p className="text-sm text-muted-foreground">No delivery login created yet.</p> : <div className="grid gap-3 md:grid-cols-2">{staff.data.map((member) => <div key={member.id} className="rounded-lg border p-3"><p className="font-medium">{member.name}</p><p className="text-sm text-muted-foreground">{member.email}</p>{member.phone && <p className="text-sm text-muted-foreground">{member.phone}</p>}</div>)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Assign shipped orders</CardTitle><CardDescription>When an order is assigned, its customer gets a 6-digit OTP in the My Orders page.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {!shippedOrders.length ? <p className="text-sm text-muted-foreground">No shipped orders waiting for delivery.</p> : shippedOrders.map((order) => <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center"><div className="flex-1"><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-muted-foreground">{order.userName || "Customer"} · {order.shippingAddress}</p></div><select className="h-10 rounded-md border bg-background px-3" value={staffByOrder[order.id] || ""} onChange={(event) => setStaffByOrder({ ...staffByOrder, [order.id]: event.target.value })}><option value="">Select delivery person</option>{staff.data?.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.email})</option>)}</select><Button disabled={assignOrder.isPending || !staffByOrder[order.id]} onClick={() => assignOrder.mutate({ orderId: order.id, deliveryStaffId: Number(staffByOrder[order.id]) })}><ShieldCheck className="mr-2 h-4 w-4" /> Assign</Button></div>)}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
