import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, LogOut, MapPin, Package, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryPortal() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpByOrder, setOtpByOrder] = useState<Record<number, string>>({});

  const staffQuery = trpc.delivery.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const assignedOrders = trpc.delivery.assignedOrders.useQuery(undefined, { enabled: Boolean(staffQuery.data) });

  const login = trpc.delivery.login.useMutation({
    onSuccess: async () => {
      toast.success("Delivery login successful");
      await utils.delivery.me.invalidate();
      await utils.delivery.assignedOrders.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const logout = trpc.delivery.logout.useMutation({
    onSuccess: async () => {
      await utils.delivery.me.invalidate();
      utils.delivery.assignedOrders.setData(undefined, undefined);
    },
  });

  const confirmOtp = trpc.delivery.confirmOtp.useMutation({
    onSuccess: async (data) => {
      toast.success(data.message);
      await utils.delivery.assignedOrders.invalidate();
      setOtpByOrder({});
    },
    onError: (error) => toast.error(error.message),
  });

  if (staffQuery.isLoading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">Loading delivery portal...</div>;
  }

  if (!staffQuery.data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Delivery Portal</CardTitle>
            <CardDescription>Only assigned delivery orders are visible here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                login.mutate({ email, password });
              }}
            >
              <Input type="email" placeholder="Delivery email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <Button className="w-full" type="submit" disabled={login.isPending}>
                {login.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold">Delivery Portal</p>
            <p className="text-sm text-white/60">Welcome, {staffQuery.data.name || "Delivery staff"}</p>
          </div>
          <Button variant="ghost" className="text-white hover:text-white" onClick={() => logout.mutate()}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 py-8">
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <ShieldCheck className="mr-2 inline h-5 w-5" />
          Ask the customer for their 6-digit delivery OTP. Only a correct OTP can mark an order as delivered.
        </div>

        {assignedOrders.isLoading ? (
          <p className="text-center text-slate-600">Loading assigned orders...</p>
        ) : !assignedOrders.data?.length ? (
          <Card><CardContent className="py-12 text-center text-slate-600"><Package className="mx-auto mb-3 h-10 w-10" />No delivery orders assigned right now.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {assignedOrders.data.map(({ order, customerName, customerPhone }) => (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-amber-600" /><p className="font-bold">{order.orderNumber}</p></div>
                      <p className="font-medium">{customerName || "Customer"}</p>
                      {customerPhone && <a className="block text-sm text-blue-700 underline" href={`tel:${customerPhone}`}>{customerPhone}</a>}
                      <p className="flex max-w-xl gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{order.shippingAddress}</p>
                    </div>
                    <div className="w-full space-y-2 sm:w-64">
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Customer OTP"
                        value={otpByOrder[order.id] || ""}
                        onChange={(event) => setOtpByOrder((current) => ({ ...current, [order.id]: event.target.value.replace(/\D/g, "") }))}
                      />
                      <Button
                        className="w-full"
                        disabled={confirmOtp.isPending || (otpByOrder[order.id] || "").length !== 6}
                        onClick={() => confirmOtp.mutate({ orderId: order.id, otp: otpByOrder[order.id] || "" })}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Delivery
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
