import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Minus, Plus, Printer, ReceiptText, Search, Trash2 } from "lucide-react";
import { AdminNav } from "./AdminDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SourceType = "shop_stock" | "outside_material" | "repair_labour" | "fitting_charge";
type SaleType = "counter" | "repair" | "site_work";
type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "credit";
type BillLine = {
  id: string;
  productId?: number;
  sourceType: SourceType;
  description: string;
  quantity: number;
  normalRate: number;
  unitPrice: number;
  purchaseCost: number;
  stock?: number;
};

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const rounded = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const sourceLabel: Record<SourceType, string> = {
  shop_stock: "Shop product",
  outside_material: "Outside material — private",
  repair_labour: "Repair labour",
  fitting_charge: "Fitting / installation",
};
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => htmlEntities[char] || char);

export default function CounterBilling() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const enabled = isAuthenticated && user?.role === "admin";
  const products = trpc.counterBilling.products.useQuery(undefined, { enabled });
  const summary = trpc.counterBilling.todaySummary.useQuery(undefined, { enabled });
  const recent = trpc.counterBilling.recent.useQuery({ limit: 20 }, { enabled });
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const savedBill = trpc.counterBilling.getBill.useQuery({ billId: selectedBillId || 0 }, { enabled: Boolean(selectedBillId && enabled) });
  const [saleType, setSaleType] = useState<SaleType>("counter");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", workDescription: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [showDiscount, setShowDiscount] = useState(false);
  const [lines, setLines] = useState<BillLine[]>([]);
  const [search, setSearch] = useState("");
  const [lastBill, setLastBill] = useState<any | null>(null);

  const visibleProducts = useMemo(() => (products.data || []).filter(product =>
    `${product.name} ${product.partNumber}`.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 12), [products.data, search]);
  const listedAmount = rounded(lines.reduce((sum, line) => sum + line.normalRate * line.quantity, 0));
  const totalAmount = rounded(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const totalCost = rounded(lines.reduce((sum, line) => sum + line.purchaseCost * line.quantity, 0));
  const profit = rounded(totalAmount - totalCost);
  const paid = Math.max(0, Number(amountPaid) || 0);
  const balance = rounded(Math.max(0, totalAmount - paid));

  const createBill = trpc.counterBilling.create.useMutation({
    onSuccess: async bill => {
      setLastBill(bill);
      setSelectedBillId(bill.id);
      toast.success(`Bill ${bill.billNumber} saved`);
      setLines([]);
      setCustomer({ name: "", phone: "", address: "", workDescription: "", notes: "" });
      setAmountPaid("0");
      setShowDiscount(false);
      await Promise.all([
        utils.counterBilling.products.invalidate(),
        utils.counterBilling.todaySummary.invalidate(),
        utils.counterBilling.recent.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });

  if (!enabled) return <div className="min-h-screen grid place-items-center p-4"><Card className="max-w-md text-center"><CardContent className="space-y-4 pt-6"><h1 className="text-xl font-bold">Admin access required</h1><Button onClick={() => setLocation("/admin/login")}>Admin Login</Button></CardContent></Card></div>;

  const updateLine = (id: string, patch: Partial<BillLine>) => setLines(current => current.map(line => line.id === id ? { ...line, ...patch } : line));
  const addProduct = (product: NonNullable<typeof products.data>[number]) => {
    const normalRate = Number(product.counterPrice ?? product.basePrice);
    setLines(current => {
      const existing = current.find(line => line.productId === product.id && line.sourceType === "shop_stock");
      if (existing) return current.map(line => line.id === existing.id ? { ...line, quantity: Math.min((line.stock || 0), line.quantity + 1) } : line);
      return [...current, {
        id: `product-${product.id}`,
        productId: product.id,
        sourceType: "shop_stock",
        description: product.name,
        quantity: 1,
        normalRate,
        unitPrice: normalRate,
        purchaseCost: Number(product.purchaseCost || 0),
        stock: Number(product.quantityInStock || 0),
      }];
    });
  };
  const addCustomLine = (sourceType: Exclude<SourceType, "shop_stock">) => setLines(current => [...current, {
    id: `${sourceType}-${Date.now()}-${current.length}`,
    sourceType,
    description: sourceType === "repair_labour" ? "Repair Labour Charge" : sourceType === "fitting_charge" ? "Fitting / Installation Charge" : "",
    quantity: 1,
    normalRate: 0,
    unitPrice: 0,
    purchaseCost: 0,
  }]);
  const saveBill = () => {
    if (!lines.length) return toast.error("Bill mein kam se kam ek item add karein.");
    if (lines.some(line => !line.description.trim() || line.quantity < 1 || line.unitPrice < 0)) return toast.error("Har bill line ki details sahi bharein.");
    if (paid > totalAmount) return toast.error("Received amount bill total se zyada nahi ho sakta.");
    createBill.mutate({
      saleType,
      customerName: customer.name.trim() || undefined,
      customerPhone: customer.phone.trim() || undefined,
      customerAddress: customer.address.trim() || undefined,
      workDescription: customer.workDescription.trim() || undefined,
      paymentMethod,
      amountPaid: paid,
      showDiscount,
      notes: customer.notes.trim() || undefined,
      items: lines.map(line => ({
        productId: line.productId || null,
        sourceType: line.sourceType,
        description: line.description.trim() || undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        listedRate: line.normalRate,
        purchaseCost: line.purchaseCost,
      })),
    });
  };
  const printBill = (bill: any) => {
    const popup = window.open("", "_blank", "width=850,height=900");
    if (!popup) return toast.error("Print window open nahi hui. Browser popup allow karein.");
    const billItems = bill.items || [];
    const discount = Math.max(0, Number(bill.discountAmount || 0));
    const invoiceItemRows = billItems.map((item: any, index: number) => {
      const rate = bill.showDiscount ? Number(item.listedRate) : Number(item.unitPrice);
      const amount = bill.showDiscount ? rate * Number(item.quantity) : Number(item.totalPrice);
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money(rate)}</td><td>${money(amount)}</td></tr>`;
    }).join("");
    const discountRows = bill.showDiscount && discount > 0
      ? `<div class="row"><span>Subtotal</span><span>${money(Number(bill.listedAmount))}</span></div><div class="row"><span>Discount</span><span>− ${money(discount)}</span></div>`
      : "";
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(bill.billNumber)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:32px;max-width:760px}header{border-bottom:4px solid #d59c25;padding-bottom:15px}h1{margin:0;color:#143e69;font-size:28px}.muted{color:#667085;font-size:13px}.row{display:flex;justify-content:space-between;gap:20px}.box{border:1px solid #d8e0e8;border-radius:8px;padding:13px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:22px}th{background:#143e69;color:white;text-align:left;padding:10px;font-size:13px}td{padding:10px;border-bottom:1px solid #e4e7ec;font-size:14px}th:last-child,td:last-child{text-align:right}.total{margin-left:auto;width:320px;margin-top:20px}.total .row{padding:7px 0}.grand{border-top:2px solid #143e69;color:#143e69;font-size:20px;font-weight:bold;padding-top:10px!important}@media print{body{margin:18px}}</style></head><body><header><div class="row"><div><h1>PATEL ELECTRICALS</h1><p class="muted">Electricals • Spare Parts • Repairing • Fitting Service</p></div><div style="text-align:right"><b>${escapeHtml(bill.saleType === "repair" ? "REPAIR BILL" : bill.saleType === "site_work" ? "SITE WORK BILL" : "COUNTER BILL")}</b><br><span class="muted">Bill No: ${escapeHtml(bill.billNumber)}<br>Date: ${new Date(bill.createdAt).toLocaleDateString("en-IN")}</span></div></div></header><div class="box"><b>Customer:</b> ${escapeHtml(bill.customerName || "Walk-in Customer")} ${bill.customerPhone ? `· ${escapeHtml(bill.customerPhone)}` : ""}${bill.customerAddress ? `<br><span class="muted">${escapeHtml(bill.customerAddress)}</span>` : ""}${bill.workDescription ? `<br><br><b>Work:</b> ${escapeHtml(bill.workDescription)}` : ""}</div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${invoiceItemRows}</tbody></table><div class="total">${discountRows}<div class="row"><span>Amount Received</span><span>${money(Number(bill.amountPaid))}</span></div><div class="row"><span>Balance Due</span><span>${money(Number(bill.balanceDue))}</span></div><div class="row grand"><span>Total</span><span>${money(Number(bill.totalAmount))}</span></div></div><p class="muted" style="margin-top:50px">Thank you for choosing Patel Electricals.<br>Computer-generated bill — no signature required.</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };
  const billToPrint = lastBill || savedBill.data;

  return <div className="min-h-screen bg-muted/30">
    <AdminNav current="/admin/billing" />
    <main className="container space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h1 className="text-2xl font-bold">Counter, Repair & Site Billing</h1><p className="text-sm text-muted-foreground">Customer bill par sirf final item/rate dikhega. Outside material aur cost/profit private rahenge.</p></div>{billToPrint && <Button variant="outline" onClick={() => printBill(billToPrint)}><Printer className="mr-2 h-4 w-4" /> Print Last Bill</Button>}</div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Today's Bills" value={String(summary.data?.billCount || 0)} />
        <Stat label="Today's Sale" value={money(summary.data?.totalSales || 0)} />
        <Stat label="Received" value={money(summary.data?.totalReceived || 0)} />
        <Stat label="Balance Due" value={money(summary.data?.totalDue || 0)} />
        <Stat label="Private Profit" value={money(summary.data?.totalProfit || 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Bill Details</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Bill Type</Label><Select value={saleType} onValueChange={value => setSaleType(value as SaleType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="counter">Counter Sale</SelectItem><SelectItem value="repair">Repair Bill</SelectItem><SelectItem value="site_work">Site Work Bill</SelectItem></SelectContent></Select></div>
            <div><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={value => setPaymentMethod(value as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="credit">Credit / Due</SelectItem></SelectContent></Select></div>
            <div><Label>Customer Name</Label><Input placeholder="Walk-in customer ke liye blank rakhein" value={customer.name} onChange={event => setCustomer(current => ({ ...current, name: event.target.value }))} /></div>
            <div><Label>Mobile Number</Label><Input inputMode="tel" value={customer.phone} onChange={event => setCustomer(current => ({ ...current, phone: event.target.value }))} /></div>
            <div className="md:col-span-2"><Label>Site / Customer Address</Label><Input value={customer.address} onChange={event => setCustomer(current => ({ ...current, address: event.target.value }))} /></div>
            {(saleType === "repair" || saleType === "site_work") && <div className="md:col-span-2"><Label>Work Description</Label><Textarea placeholder="Example: Mixer repair and fitting" value={customer.workDescription} onChange={event => setCustomer(current => ({ ...current, workDescription: event.target.value }))} /></div>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Add Shop Product</CardTitle></CardHeader><CardContent className="space-y-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Product ya part number search karein" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="grid gap-2 sm:grid-cols-2">{visibleProducts.map(product => <button key={product.id} type="button" className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted disabled:opacity-50" disabled={Number(product.quantityInStock || 0) < 1} onClick={() => addProduct(product)}><span><span className="block font-medium">{product.name}</span><span className="text-xs text-muted-foreground">#{product.partNumber} · Stock: {product.quantityInStock || 0}</span></span><span className="font-semibold text-emerald-700">{money(Number(product.counterPrice ?? product.basePrice))}</span></button>)}</div>{search && !visibleProducts.length && <p className="text-sm text-muted-foreground">Product nahi mila.</p>}<div className="flex flex-wrap gap-2 border-t pt-3"><Button type="button" variant="outline" onClick={() => addCustomLine("outside_material")}>+ Outside Material</Button><Button type="button" variant="outline" onClick={() => addCustomLine("repair_labour")}>+ Repair Labour</Button><Button type="button" variant="outline" onClick={() => addCustomLine("fitting_charge")}>+ Fitting Charge</Button></div></CardContent></Card>

          <Card><CardHeader><CardTitle>Bill Items</CardTitle></CardHeader><CardContent className="space-y-3">{!lines.length && <p className="py-5 text-center text-sm text-muted-foreground">Product ya work charge add karke bill banayein.</p>}{lines.map(line => { const lineTotal = rounded(line.unitPrice * line.quantity); const belowCost = line.unitPrice < line.purchaseCost; return <div key={line.id} className="rounded-lg border p-3"><div className="mb-3 flex items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{sourceLabel[line.sourceType]}</p>{line.sourceType === "shop_stock" && <p className="text-xs text-muted-foreground">Normal counter rate: {money(line.normalRate)} · Available stock: {line.stock}</p>}</div><Button type="button" variant="ghost" size="icon" onClick={() => setLines(current => current.filter(item => item.id !== line.id))} aria-label="Remove item"><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-12"><div className="sm:col-span-4"><Label>Description</Label><Input disabled={line.sourceType === "shop_stock"} value={line.description} onChange={event => updateLine(line.id, { description: event.target.value })} /></div><div className="sm:col-span-2"><Label>Qty</Label><div className="flex"><Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => updateLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}><Minus className="h-4 w-4" /></Button><Input className="rounded-none text-center" type="number" min="1" max={line.stock || undefined} value={line.quantity} onChange={event => updateLine(line.id, { quantity: Math.max(1, Math.min(line.stock || Infinity, Number(event.target.value) || 1)) })} /><Button type="button" variant="outline" size="icon" className="shrink-0" disabled={line.stock !== undefined && line.quantity >= line.stock} onClick={() => updateLine(line.id, { quantity: line.quantity + 1 })}><Plus className="h-4 w-4" /></Button></div></div><div className="sm:col-span-2"><Label>Final Rate</Label><Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={event => updateLine(line.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="sm:col-span-2"><Label>Cost (private)</Label><Input type="number" min="0" step="0.01" value={line.purchaseCost} onChange={event => updateLine(line.id, { purchaseCost: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="sm:col-span-2"><Label>Total</Label><p className={`mt-2 text-lg font-bold ${belowCost ? "text-red-600" : ""}`}>{money(lineTotal)}</p>{belowCost && <p className="text-xs text-red-600">Loss warning</p>}</div></div></div>;})}</CardContent></Card>
        </div>

        <div className="space-y-6"><Card className="xl:sticky xl:top-4"><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" /> Bill Summary</CardTitle></CardHeader><CardContent className="space-y-3"><SummaryRow label="Normal counter value" value={money(listedAmount)} />{listedAmount > totalAmount && <SummaryRow label="Negotiated discount" value={`− ${money(listedAmount - totalAmount)}`} tone="text-orange-600" />}<SummaryRow label="Bill total" value={money(totalAmount)} bold /><div className="border-t pt-3"><Label>Amount Received</Label><Input type="number" min="0" max={totalAmount} step="0.01" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} /><Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={() => setAmountPaid(String(totalAmount))}>Mark full payment</Button></div><SummaryRow label="Balance due" value={money(balance)} tone={balance > 0 ? "text-orange-600" : "text-emerald-700"} bold /><div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-medium text-slate-700">Private Profit</p><p className={`text-lg font-bold ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(profit)}</p><p className="text-xs text-muted-foreground">Customer invoice mein cost/profit nahi dikhega.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDiscount} onChange={event => setShowDiscount(event.target.checked)} /> Customer bill par discount dikhayein</label><div><Label>Private Note</Label><Textarea placeholder="Customer ko print bill mein nahi dikhega" value={customer.notes} onChange={event => setCustomer(current => ({ ...current, notes: event.target.value }))} /></div><Button className="min-h-12 w-full text-base" disabled={createBill.isPending || !lines.length} onClick={saveBill}>{createBill.isPending ? "Saving Bill..." : "Save Bill & Update Stock"}</Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Recent Bills</CardTitle></CardHeader><CardContent className="space-y-2">{!recent.data?.length && <p className="text-sm text-muted-foreground">Abhi counter bill nahi bana.</p>}{recent.data?.map(bill => <button key={bill.id} type="button" onClick={() => { setSelectedBillId(bill.id); setLastBill(null); }} className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted"><span><span className="block font-medium">{bill.billNumber}</span><span className="text-xs text-muted-foreground">{bill.customerName || "Walk-in Customer"} · {new Date(bill.createdAt).toLocaleDateString("en-IN")}</span></span><span className="font-semibold">{money(Number(bill.totalAmount))}</span></button>)}</CardContent></Card>
        </div>
      </div>
    </main>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>;
}

function SummaryRow({ label, value, tone = "", bold = false }: { label: string; value: string; tone?: string; bold?: boolean }) {
  return <div className={`flex items-center justify-between text-sm ${bold ? "font-bold" : ""} ${tone}`}><span>{label}</span><span>{value}</span></div>;
}
