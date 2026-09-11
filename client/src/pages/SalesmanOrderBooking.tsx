import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Minus, Plus, Search, ShoppingBag } from "lucide-react";

type CartLine = { productId: number; quantity: number };

export default function SalesmanOrderBooking() {
  const utils = trpc.useUtils();
  const staff = trpc.salesman.me.useQuery(undefined, { retry: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const products = trpc.salesmanOrders.products.useQuery(undefined, { enabled: Boolean(staff.data) });
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shop, setShop] = useState({ shopName: "", customerName: "", customerPhone: "", shippingAddress: "", paymentMethod: "credit" as "upi" | "bank_transfer" | "card" | "cod" | "credit", paymentStatus: "pending" as "pending" | "completed", notes: "" });
  const placeOrder = trpc.salesmanOrders.create.useMutation({
    onSuccess: async (result) => {
      toast.success(`Wholesale order ${result.orderNumber} saved`);
      setCart([]); setShop({ shopName: "", customerName: "", customerPhone: "", shippingAddress: "", paymentMethod: "credit", paymentStatus: "pending", notes: "" });
      await utils.salesmanOrders.products.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const login = trpc.salesman.login.useMutation({
    onSuccess: async () => {
      toast.success("Salesman login successful");
      await utils.salesman.me.invalidate();
      await utils.salesmanOrders.products.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const visibleProducts = useMemo(() => (products.data || []).filter(product => `${product.name} ${product.partNumber}`.toLowerCase().includes(search.toLowerCase())), [products.data, search]);
  const lines = cart.map(line => ({ ...line, product: products.data?.find(product => product.id === line.productId) })).filter(line => line.product);
  const total = lines.reduce((sum, line) => sum + Number(line.product!.wholesalePrice) * line.quantity, 0);
  const setQuantity = (productId: number, quantity: number) => setCart(current => quantity <= 0 ? current.filter(line => line.productId !== productId) : current.some(line => line.productId === productId) ? current.map(line => line.productId === productId ? { ...line, quantity } : line) : [...current, { productId, quantity }]);
  if (staff.isLoading) return <div className="min-h-screen grid place-items-center">Loading salesman panel...</div>;
  if (!staff.data) return <div className="min-h-screen grid place-items-center bg-slate-950 p-6 text-center"><Card className="w-full max-w-md"><CardHeader><CardTitle>Salesman App Login</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">Apni salesman ID se login karke shop ka wholesale order book karein.</p><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); login.mutate({ email, password }); }}><Input type="email" placeholder="Salesman email" value={email} onChange={event => setEmail(event.target.value)} required /><Input type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} required /><Button className="w-full" type="submit" disabled={login.isPending}>{login.isPending ? "Logging in..." : "Login to Salesman App"}</Button></form></CardContent></Card></div>;
  return <div className="min-h-screen bg-slate-50 p-4 pb-28"><div className="mx-auto max-w-6xl space-y-5"><div><p className="text-sm text-slate-500">Logged in: {staff.data.name}</p><h1 className="text-2xl font-bold">Salesman Order Booking</h1><p className="text-sm text-slate-600">Shop account ki zarurat nahi. Wholesale rate par order book karein.</p></div><Card><CardHeader><CardTitle>Shop Details</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div><Label>Shop Name *</Label><Input value={shop.shopName} onChange={e => setShop(s => ({ ...s, shopName: e.target.value }))} /></div><div><Label>Owner / Customer Name *</Label><Input value={shop.customerName} onChange={e => setShop(s => ({ ...s, customerName: e.target.value }))} /></div><div><Label>Mobile Number *</Label><Input inputMode="tel" value={shop.customerPhone} onChange={e => setShop(s => ({ ...s, customerPhone: e.target.value }))} /></div><div><Label>Payment</Label><Select value={shop.paymentMethod} onValueChange={value => setShop(s => ({ ...s, paymentMethod: value as typeof shop.paymentMethod }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credit / Pending</SelectItem><SelectItem value="cod">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem></SelectContent></Select></div><div className="md:col-span-2"><Label>Shop Address *</Label><Input value={shop.shippingAddress} onChange={e => setShop(s => ({ ...s, shippingAddress: e.target.value }))} /></div><div className="md:col-span-2"><Label>Note (optional)</Label><Input value={shop.notes} onChange={e => setShop(s => ({ ...s, notes: e.target.value }))} /></div></CardContent></Card><div className="grid gap-5 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Wholesale Products</CardTitle><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search product or part number" value={search} onChange={e => setSearch(e.target.value)} /></div></CardHeader><CardContent className="space-y-3">{visibleProducts.map(product => { const line = cart.find(item => item.productId === product.id); const qty = line?.quantity || 0; return <div key={product.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1"><p className="font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">#{product.partNumber} · Stock: {product.quantityInStock} · Min qty: {product.wholesaleMinQty}</p><p className="font-bold text-green-700">Wholesale ₹{Number(product.wholesalePrice).toLocaleString()}</p></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" disabled={!qty} onClick={() => setQuantity(product.id, qty - 1)}><Minus className="h-4 w-4" /></Button><span className="w-8 text-center font-semibold">{qty}</span><Button size="icon" disabled={qty >= product.quantityInStock} onClick={() => setQuantity(product.id, qty ? qty + 1 : product.wholesaleMinQty)}><Plus className="h-4 w-4" /></Button></div></div>; })}{!products.isLoading && !visibleProducts.length && <p className="py-8 text-center text-muted-foreground">Wholesale price set kiye hue products nahi mile.</p>}</CardContent></Card><Card className="h-fit lg:sticky lg:top-4"><CardHeader><CardTitle className="flex gap-2"><ShoppingBag /> Order Summary</CardTitle></CardHeader><CardContent className="space-y-3">{lines.map(line => <div key={line.productId} className="flex justify-between text-sm"><span>{line.product!.name} × {line.quantity}</span><span>₹{(Number(line.product!.wholesalePrice) * line.quantity).toLocaleString()}</span></div>)}<div className="border-t pt-3 flex justify-between text-lg font-bold"><span>Total</span><span>₹{total.toLocaleString()}</span></div><Button className="min-h-12 w-full text-base" disabled={placeOrder.isPending || !lines.length || !shop.shopName || !shop.customerName || !shop.customerPhone || !shop.shippingAddress} onClick={() => placeOrder.mutate({ ...shop, items: cart })}>{placeOrder.isPending ? "Saving..." : "Place Wholesale Order"}</Button><p className="text-xs text-muted-foreground">Order admin panel mein shop aur salesman ke naam ke saath dikhega.</p></CardContent></Card></div></div></div>;
}
