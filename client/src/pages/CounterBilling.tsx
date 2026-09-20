import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Eye, FileDown, Minus, Pencil, Plus, Printer, ReceiptText, Search, Trash2, X } from "lucide-react";
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
const indiaDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function CounterBilling() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const enabled = isAuthenticated && user?.role === "admin";
  const products = trpc.counterBilling.products.useQuery(undefined, { enabled });
  const summary = trpc.counterBilling.todaySummary.useQuery(undefined, { enabled });
  const recent = trpc.counterBilling.recent.useQuery({ limit: 20 }, { enabled });
  const [reportDate, setReportDate] = useState(indiaDate);
  const [reportMonth, setReportMonth] = useState(() => indiaDate().slice(0, 7));
  const dateSummary = trpc.counterBilling.dateSummary.useQuery({ date: reportDate }, { enabled });
  const monthSummary = trpc.counterBilling.monthSummary.useQuery({ month: reportMonth }, { enabled });
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const savedBill = trpc.counterBilling.getBill.useQuery({ billId: selectedBillId || 0 }, { enabled: Boolean(selectedBillId && enabled) });
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
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
      setSaleType("counter");
      setPaymentMethod("cash");
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
  const updateBill = trpc.counterBilling.update.useMutation({
    onSuccess: async bill => {
      setLastBill(bill);
      setSelectedBillId(bill.id);
      setEditingBillId(null);
      setLines([]);
      setCustomer({ name: "", phone: "", address: "", workDescription: "", notes: "" });
      setSaleType("counter");
      setPaymentMethod("cash");
      setAmountPaid("0");
      setShowDiscount(false);
      toast.success(`Bill ${bill.billNumber} updated`);
      await Promise.all([
        utils.counterBilling.products.invalidate(),
        utils.counterBilling.todaySummary.invalidate(),
        utils.counterBilling.dateSummary.invalidate(),
        utils.counterBilling.monthSummary.invalidate(),
        utils.counterBilling.recent.invalidate(),
        utils.counterBilling.getBill.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const deleteBill = trpc.counterBilling.delete.useMutation({
    onSuccess: async bill => {
      setEditingBillId(null);
      setSelectedBillId(null);
      setLastBill(null);
      setLines([]);
      setCustomer({ name: "", phone: "", address: "", workDescription: "", notes: "" });
      setSaleType("counter");
      setPaymentMethod("cash");
      setAmountPaid("0");
      setShowDiscount(false);
      toast.success(`Invoice ${bill.billNumber} deleted; shop stock restored.`);
      await Promise.all([
        utils.counterBilling.products.invalidate(),
        utils.counterBilling.todaySummary.invalidate(),
        utils.counterBilling.dateSummary.invalidate(),
        utils.counterBilling.monthSummary.invalidate(),
        utils.counterBilling.recent.invalidate(),
        utils.counterBilling.getBill.invalidate(),
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
  const clearDraft = () => {
    setEditingBillId(null);
    setLines([]);
    setCustomer({ name: "", phone: "", address: "", workDescription: "", notes: "" });
    setSaleType("counter");
    setPaymentMethod("cash");
    setAmountPaid("0");
    setShowDiscount(false);
  };
  const editBill = (bill: any) => {
    const catalog = products.data || [];
    setEditingBillId(bill.id);
    setSelectedBillId(bill.id);
    setLastBill(null);
    setSaleType(bill.saleType as SaleType);
    setCustomer({
      name: bill.customerName || "",
      phone: bill.customerPhone || "",
      address: bill.customerAddress || "",
      workDescription: bill.workDescription || "",
      notes: bill.notes || "",
    });
    setPaymentMethod(bill.paymentMethod as PaymentMethod);
    setAmountPaid(String(Number(bill.amountPaid || 0)));
    setShowDiscount(Boolean(bill.showDiscount));
    setLines((bill.items || []).map((item: any, index: number) => {
      const product = catalog.find(entry => entry.id === item.productId);
      return {
        id: `edit-${bill.id}-${item.id || index}`,
        productId: item.productId || undefined,
        sourceType: item.sourceType as SourceType,
        description: item.description,
        quantity: Number(item.quantity),
        normalRate: Number(item.listedRate || item.unitPrice || 0),
        unitPrice: Number(item.unitPrice || 0),
        purchaseCost: Number(item.purchaseCost || 0),
        // The old billed quantity is available again during a stock-safe edit.
        stock: item.sourceType === "shop_stock" ? Number(product?.quantityInStock || 0) + Number(item.quantity) : undefined,
      };
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveBill = () => {
    if (!lines.length) return toast.error("Bill mein kam se kam ek item add karein.");
    if (lines.some(line => !line.description.trim() || line.quantity < 1 || line.unitPrice < 0)) return toast.error("Har bill line ki details sahi bharein.");
    if (paid > totalAmount) return toast.error("Received amount bill total se zyada nahi ho sakta.");
    const billDetails = {
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
    };
    if (editingBillId) updateBill.mutate({ billId: editingBillId, ...billDetails });
    else createBill.mutate(billDetails);
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
  const downloadBill = async (bill: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const moneyText = (amount: unknown) => `Rs. ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
      let y = 17;
      pdf.setTextColor(20, 62, 105);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("PATEL ELECTRICALS", 14, y);
      pdf.setFontSize(10);
      pdf.setTextColor(80, 88, 105);
      pdf.setFont("helvetica", "normal");
      pdf.text("Electricals | Spare Parts | Repairing | Fitting Service", 14, y + 6);
      pdf.setTextColor(20, 32, 51);
      pdf.setFont("helvetica", "bold");
      pdf.text(bill.saleType === "repair" ? "REPAIR BILL" : bill.saleType === "site_work" ? "SITE WORK BILL" : "COUNTER BILL", pageWidth - 14, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(`Bill No: ${bill.billNumber}`, pageWidth - 14, y + 6, { align: "right" });
      pdf.text(`Date: ${new Date(bill.createdAt).toLocaleDateString("en-IN")}`, pageWidth - 14, y + 11, { align: "right" });
      y += 24;
      pdf.setDrawColor(210, 220, 230);
      pdf.roundedRect(14, y, pageWidth - 28, 21, 2, 2, "S");
      pdf.setFont("helvetica", "bold");
      pdf.text("Customer", 18, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${bill.customerName || "Walk-in Customer"}${bill.customerPhone ? ` | ${bill.customerPhone}` : ""}`, 18, y + 12);
      if (bill.customerAddress) pdf.text(pdf.splitTextToSize(String(bill.customerAddress), pageWidth - 36), 18, y + 17);
      y += 30;
      pdf.setFillColor(20, 62, 105);
      pdf.rect(14, y, pageWidth - 28, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Description", 18, y + 5.3);
      pdf.text("Qty", 125, y + 5.3, { align: "right" });
      pdf.text("Rate", 151, y + 5.3, { align: "right" });
      pdf.text("Amount", pageWidth - 18, y + 5.3, { align: "right" });
      y += 8;
      pdf.setTextColor(20, 32, 51);
      pdf.setFont("helvetica", "normal");
      for (const item of bill.items || []) {
        const description = pdf.splitTextToSize(String(item.description || "Item"), 98);
        const rowHeight = Math.max(8, description.length * 5 + 3);
        if (y + rowHeight > 265) { pdf.addPage(); y = 16; }
        pdf.text(description, 18, y + 5);
        pdf.text(String(item.quantity), 125, y + 5, { align: "right" });
        pdf.text(moneyText(bill.showDiscount ? item.listedRate : item.unitPrice), 151, y + 5, { align: "right" });
        const amount = bill.showDiscount ? Number(item.listedRate || 0) * Number(item.quantity || 0) : Number(item.totalPrice || 0);
        pdf.text(moneyText(amount), pageWidth - 18, y + 5, { align: "right" });
        pdf.setDrawColor(230, 234, 239);
        pdf.line(14, y + rowHeight, pageWidth - 14, y + rowHeight);
        y += rowHeight;
      }
      y += 8;
      const totalRows = bill.showDiscount && Number(bill.discountAmount || 0) > 0
        ? [["Subtotal", moneyText(bill.listedAmount)], ["Discount", `- ${moneyText(bill.discountAmount)}`], ["Total", moneyText(bill.totalAmount)]]
        : [["Total", moneyText(bill.totalAmount)]];
      totalRows.forEach(([label, value], index) => {
        pdf.setFont("helvetica", index === totalRows.length - 1 ? "bold" : "normal");
        pdf.setFontSize(index === totalRows.length - 1 ? 13 : 10);
        pdf.text(label, 135, y, { align: "right" });
        pdf.text(value, pageWidth - 18, y, { align: "right" });
        y += 7;
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(92, 102, 120);
      pdf.text("Thank you for choosing Patel Electricals. Computer-generated bill — no signature required.", 14, 284);
      pdf.save(`${bill.billNumber || "Patel-Electricals-Invoice"}.pdf`);
    } catch (error) {
      console.error("Invoice download failed", error);
      toast.error("Invoice download nahi hua. Print option use karein.");
    }
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

      <Card><CardHeader><CardTitle>Profit Report</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2"><div className="rounded-lg border p-4"><Label>Selected Date</Label><Input className="mt-2" type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} /><div className="mt-4 grid grid-cols-2 gap-3"><ReportValue label="Bills" value={String(dateSummary.data?.billCount || 0)} /><ReportValue label="Sale" value={money(dateSummary.data?.totalSales || 0)} /><ReportValue label="Received" value={money(dateSummary.data?.totalReceived || 0)} /><ReportValue label="Profit" value={money(dateSummary.data?.totalProfit || 0)} /></div></div><div className="rounded-lg border p-4"><Label>Selected Month</Label><Input className="mt-2" type="month" value={reportMonth} onChange={event => setReportMonth(event.target.value)} /><div className="mt-4 grid grid-cols-2 gap-3"><ReportValue label="Bills" value={String(monthSummary.data?.billCount || 0)} /><ReportValue label="Sale" value={money(monthSummary.data?.totalSales || 0)} /><ReportValue label="Received" value={money(monthSummary.data?.totalReceived || 0)} /><ReportValue label="Profit" value={money(monthSummary.data?.totalProfit || 0)} /></div></div></CardContent></Card>

      {selectedBillId && <Card><CardHeader><CardTitle>Open Invoice</CardTitle></CardHeader><CardContent>{savedBill.isLoading && <p className="text-sm text-muted-foreground">Invoice open ho raha hai...</p>}{savedBill.data && <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-lg font-bold">{savedBill.data.billNumber}</p><p className="text-sm text-muted-foreground">{savedBill.data.customerName || "Walk-in Customer"}{savedBill.data.customerPhone ? ` · ${savedBill.data.customerPhone}` : ""} · {new Date(savedBill.data.createdAt).toLocaleString("en-IN")}</p></div><p className="text-xl font-bold">{money(Number(savedBill.data.totalAmount))}</p></div><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[540px] text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{savedBill.data.items.map((item: any) => <tr key={item.id} className="border-t"><td className="p-3">{item.description}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">{money(Number(savedBill.data.showDiscount ? item.listedRate : item.unitPrice))}</td><td className="p-3 text-right font-medium">{money(Number(savedBill.data.showDiscount ? Number(item.listedRate) * Number(item.quantity) : item.totalPrice))}</td></tr>)}</tbody></table></div><div className="grid gap-2 sm:grid-cols-3"><SummaryRow label="Received" value={money(Number(savedBill.data.amountPaid))} /><SummaryRow label="Balance" value={money(Number(savedBill.data.balanceDue))} /><SummaryRow label="Private Profit" value={money(Number(savedBill.data.grossProfit))} /></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => printBill(savedBill.data)}><Printer className="mr-2 h-4 w-4" /> Print</Button><Button type="button" variant="outline" onClick={() => downloadBill(savedBill.data)}><FileDown className="mr-2 h-4 w-4" /> Download PDF</Button><Button type="button" variant="outline" onClick={() => editBill(savedBill.data)}><Pencil className="mr-2 h-4 w-4" /> Edit Bill</Button><Button type="button" variant="destructive" disabled={deleteBill.isPending} onClick={() => { if (window.confirm(`Delete invoice ${savedBill.data.billNumber}? Shop-stock items will be returned to inventory.`)) deleteBill.mutate({ billId: savedBill.data.id }); }}><Trash2 className="mr-2 h-4 w-4" /> {deleteBill.isPending ? "Deleting..." : "Delete Invoice"}</Button></div></div>}</CardContent></Card>}

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

        <div className="space-y-6"><Card className="xl:sticky xl:top-4"><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" /> {editingBillId ? "Edit Bill" : "Bill Summary"}</CardTitle></CardHeader><CardContent className="space-y-3">{editingBillId && <div className="flex items-center justify-between rounded-md bg-amber-50 p-3 text-sm text-amber-800"><span>Editing saved invoice. Stock will update safely.</span><Button type="button" variant="ghost" size="sm" onClick={clearDraft}><X className="mr-1 h-4 w-4" /> Cancel</Button></div>}<SummaryRow label="Normal counter value" value={money(listedAmount)} />{listedAmount > totalAmount && <SummaryRow label="Negotiated discount" value={`− ${money(listedAmount - totalAmount)}`} tone="text-orange-600" />}<SummaryRow label="Bill total" value={money(totalAmount)} bold /><div className="border-t pt-3"><Label>Amount Received</Label><Input type="number" min="0" max={totalAmount} step="0.01" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} /><Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={() => setAmountPaid(String(totalAmount))}>Mark full payment</Button></div><SummaryRow label="Balance due" value={money(balance)} tone={balance > 0 ? "text-orange-600" : "text-emerald-700"} bold /><div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-medium text-slate-700">Private Profit</p><p className={`text-lg font-bold ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(profit)}</p><p className="text-xs text-muted-foreground">Customer invoice mein cost/profit nahi dikhega.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDiscount} onChange={event => setShowDiscount(event.target.checked)} /> Customer bill par discount dikhayein</label><div><Label>Private Note</Label><Textarea placeholder="Customer ko print bill mein nahi dikhega" value={customer.notes} onChange={event => setCustomer(current => ({ ...current, notes: event.target.value }))} /></div><Button className="min-h-12 w-full text-base" disabled={createBill.isPending || updateBill.isPending || !lines.length} onClick={saveBill}>{editingBillId ? (updateBill.isPending ? "Updating Bill..." : "Update Bill & Stock") : (createBill.isPending ? "Saving Bill..." : "Save Bill & Update Stock")}</Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Recent Bills</CardTitle></CardHeader><CardContent className="space-y-2">{!recent.data?.length && <p className="text-sm text-muted-foreground">Abhi counter bill nahi bana.</p>}{recent.data?.map(bill => <div key={bill.id} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${selectedBillId === bill.id ? "border-primary bg-primary/5" : ""}`}><button type="button" onClick={() => { setSelectedBillId(bill.id); setLastBill(null); }} className="min-w-0 flex-1 text-left"><span className="block truncate font-medium">{bill.billNumber}</span><span className="block truncate text-xs text-muted-foreground">{bill.customerName || "Walk-in Customer"} · {new Date(bill.createdAt).toLocaleDateString("en-IN")}</span><span className="font-semibold">{money(Number(bill.totalAmount))}</span></button><Button type="button" size="sm" variant="outline" onClick={() => { setSelectedBillId(bill.id); setLastBill(null); }}><Eye className="mr-1 h-4 w-4" /> Open</Button></div>)}</CardContent></Card>
        </div>
      </div>
    </main>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>;
}

function ReportValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function SummaryRow({ label, value, tone = "", bold = false }: { label: string; value: string; tone?: string; bold?: boolean }) {
  return <div className={`flex items-center justify-between text-sm ${bold ? "font-bold" : ""} ${tone}`}><span>{label}</span><span>{value}</span></div>;
}
