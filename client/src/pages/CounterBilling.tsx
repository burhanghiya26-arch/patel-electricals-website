import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Eye, FileDown, MessageCircle, Minus, Pencil, Plus, Printer, ReceiptText, Search, Smartphone, Trash2, X } from "lucide-react";
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
type ItemUnit = "piece" | "meter" | "roll" | "box";
type BillLine = {
  id: string;
  productId?: number;
  sourceType: SourceType;
  description: string;
  unit: ItemUnit;
  quantity: number;
  normalRate: number;
  unitPrice: number;
  purchaseCost: number;
  stock?: number;
};

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const rounded = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const SHOP_UPI_ID = "burhanghiya26-1@oksbi";
const SHOP_UPI_NAME = "Patel Electricals";
const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const sourceLabel: Record<SourceType, string> = {
  shop_stock: "Shop product",
  outside_material: "Outside material — private",
  repair_labour: "Repair labour",
  fitting_charge: "Fitting / installation",
};
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => htmlEntities[char] || char);
const indiaDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};
const upiPaymentLink = (bill: any) => {
  const pendingAmount = Math.max(0, Number(bill.balanceDue || 0));
  const params = new URLSearchParams({ pa: SHOP_UPI_ID, pn: SHOP_UPI_NAME, cu: "INR", tn: `Bill ${bill.billNumber || ""}`.trim() });
  if (pendingAmount > 0) params.set("am", pendingAmount.toFixed(2));
  return `upi://pay?${params.toString()}`;
};
const qrImageUrl = (paymentLink: string) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data=${encodeURIComponent(paymentLink)}`;
const loadImageDataUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("QR image could not be loaded");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

export default function CounterBilling() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const enabled = isAuthenticated && user?.role === "admin";
  const products = trpc.counterBilling.products.useQuery(undefined, { enabled });
  const recent = trpc.counterBilling.recent.useQuery({ limit: 20 }, { enabled });
  const duePayments = trpc.counterBilling.duePayments.useQuery({ limit: 100 }, { enabled });
  const [reportDate, setReportDate] = useState(indiaDate);
  const [reportMonth, setReportMonth] = useState(() => indiaDate().slice(0, 7));
  const dateSummary = trpc.counterBilling.dateSummary.useQuery({ date: reportDate }, { enabled });
  const monthSummary = trpc.counterBilling.monthSummary.useQuery({ month: reportMonth }, { enabled });
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const savedBill = trpc.counterBilling.getBill.useQuery({ billId: selectedBillId || 0 }, { enabled: Boolean(selectedBillId && enabled) });
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
  const [saleType, setSaleType] = useState<SaleType>("counter");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", email: "", deliveryDate: "", quotationNumber: "", workDescription: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [showDiscount, setShowDiscount] = useState(false);
  const [isQuickSale, setIsQuickSale] = useState(false);
  const [lines, setLines] = useState<BillLine[]>([]);
  const [search, setSearch] = useState("");
  const [outsideMaterialRows, setOutsideMaterialRows] = useState("1");
  // Keep what the user is typing separate from the saved numeric quantity.
  // This allows them to erase "1" first and enter any quantity they need.
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [lastBill, setLastBill] = useState<any | null>(null);
  const [receiveAmounts, setReceiveAmounts] = useState<Record<number, string>>({});
  const [receiveMethods, setReceiveMethods] = useState<Record<number, PaymentMethod>>({});

  const visibleProducts = useMemo(() => (products.data || []).filter(product =>
    `${product.name} ${product.partNumber}`.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 12), [products.data, search]);
  const totalDueAmount = useMemo(() => (duePayments.data || []).reduce((sum, bill) => sum + Number(bill.balanceDue || 0), 0), [duePayments.data]);
  const listedAmount = rounded(lines.reduce((sum, line) => sum + line.normalRate * line.quantity, 0));
  const totalAmount = rounded(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const totalCost = rounded(lines.reduce((sum, line) => sum + line.purchaseCost * line.quantity, 0));
  const profit = rounded(totalAmount - totalCost);
  const paid = Math.max(0, Number(amountPaid) || 0);
  const balance = rounded(Math.max(0, totalAmount - paid));

  const createBill = trpc.counterBilling.create.useMutation({
    onSuccess: async bill => {
      if (isQuickSale) {
        setLastBill(null);
        setSelectedBillId(null);
        toast.success(`Quick sale ${bill.billNumber} saved. Stock and profit updated.`);
      } else {
        setLastBill(bill);
        setSelectedBillId(bill.id);
        toast.success(`Bill ${bill.billNumber} saved`);
      }
      setLines([]);
      setCustomer({ name: "", phone: "", address: "", email: "", deliveryDate: "", quotationNumber: "", workDescription: "", notes: "" });
      setSaleType("counter");
      setPaymentMethod("cash");
      setAmountPaid("0");
      setShowDiscount(false);
      setIsQuickSale(false);
      await Promise.all([
        utils.counterBilling.products.invalidate(),
        utils.counterBilling.dateSummary.invalidate(),
        utils.counterBilling.monthSummary.invalidate(),
        utils.counterBilling.duePayments.invalidate(),
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
      setCustomer({ name: "", phone: "", address: "", email: "", deliveryDate: "", quotationNumber: "", workDescription: "", notes: "" });
      setSaleType("counter");
      setPaymentMethod("cash");
      setAmountPaid("0");
      setShowDiscount(false);
      setIsQuickSale(false);
      toast.success(`Bill ${bill.billNumber} updated`);
      await Promise.all([
        utils.counterBilling.products.invalidate(),
        utils.counterBilling.dateSummary.invalidate(),
        utils.counterBilling.monthSummary.invalidate(),
        utils.counterBilling.duePayments.invalidate(),
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
      setCustomer({ name: "", phone: "", address: "", email: "", deliveryDate: "", quotationNumber: "", workDescription: "", notes: "" });
      setSaleType("counter");
      setPaymentMethod("cash");
      setAmountPaid("0");
      setShowDiscount(false);
      setIsQuickSale(false);
      toast.success(`Invoice ${bill.billNumber} deleted; shop stock restored.`);
      await Promise.all([
        utils.counterBilling.products.invalidate(),
        utils.counterBilling.dateSummary.invalidate(),
        utils.counterBilling.monthSummary.invalidate(),
        utils.counterBilling.duePayments.invalidate(),
        utils.counterBilling.recent.invalidate(),
        utils.counterBilling.getBill.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const receivePayment = trpc.counterBilling.receivePayment.useMutation({
    onSuccess: async bill => {
      setReceiveAmounts(current => ({ ...current, [bill.id]: "" }));
      toast.success(`${bill.billNumber}: payment saved. Remaining due ${money(Number(bill.balanceDue))}`);
      setSelectedBillId(bill.id);
      setLastBill(bill);
      await Promise.all([
        utils.counterBilling.duePayments.invalidate(),
        utils.counterBilling.dateSummary.invalidate(),
        utils.counterBilling.monthSummary.invalidate(),
        utils.counterBilling.recent.invalidate(),
        utils.counterBilling.getBill.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const sendWhatsAppInvoice = trpc.counterBilling.sendWhatsAppInvoice.useMutation({
    onSuccess: () => toast.success("Invoice WhatsApp par bhej diya gaya."),
    onError: error => toast.error(error.message),
  });

  if (!enabled) return <div className="min-h-screen grid place-items-center p-4"><Card className="max-w-md text-center"><CardContent className="space-y-4 pt-6"><h1 className="text-xl font-bold">Admin access required</h1><Button onClick={() => setLocation("/admin/login")}>Admin Login</Button></CardContent></Card></div>;

  const updateLine = (id: string, patch: Partial<BillLine>) => setLines(current => current.map(line => line.id === id ? { ...line, ...patch } : line));
  const commitQuantity = (line: BillLine) => {
    const typedQuantity = quantityDrafts[line.id];
    if (typedQuantity === undefined) return;
    const requestedQuantity = Number(typedQuantity);
    const maxQuantity = line.stock || Infinity;
    const quantity = Number.isFinite(requestedQuantity) && requestedQuantity >= 1
      ? Math.min(maxQuantity, Math.floor(requestedQuantity))
      : 1;
    updateLine(line.id, { quantity });
    setQuantityDrafts(current => {
      const next = { ...current };
      delete next[line.id];
      return next;
    });
  };
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
        unit: (["piece", "meter", "roll", "box"].includes(product.defaultUnit) ? product.defaultUnit : "piece") as ItemUnit,
        quantity: 1,
        normalRate,
        unitPrice: normalRate,
        purchaseCost: Number(product.purchaseCost || 0),
        stock: Number(product.quantityInStock || 0),
      }];
    });
  };
  const addCustomLine = (sourceType: Exclude<SourceType, "shop_stock">, count = 1) => setLines(current => {
    const totalRows = Math.max(1, Math.min(50, Math.floor(count) || 1));
    const timestamp = Date.now();
    return [...current, ...Array.from({ length: totalRows }, (_, index) => ({
      id: `${sourceType}-${timestamp}-${current.length + index}`,
      sourceType,
      description: sourceType === "repair_labour" ? "Repair Labour Charge" : sourceType === "fitting_charge" ? "Fitting / Installation Charge" : "",
      unit: "piece" as ItemUnit,
      quantity: 1,
      normalRate: 0,
      unitPrice: 0,
      purchaseCost: 0,
    }))];
  });
  const addOutsideMaterialRows = () => {
    const count = Math.max(1, Math.min(50, Math.floor(Number(outsideMaterialRows)) || 1));
    addCustomLine("outside_material", count);
    setOutsideMaterialRows("1");
  };
  const clearDraft = () => {
    setEditingBillId(null);
    setLines([]);
    setCustomer({ name: "", phone: "", address: "", email: "", deliveryDate: "", quotationNumber: "", workDescription: "", notes: "" });
    setSaleType("counter");
    setPaymentMethod("cash");
    setAmountPaid("0");
    setShowDiscount(false);
    setIsQuickSale(false);
  };
  const editBill = (bill: any) => {
    const catalog = products.data || [];
    setEditingBillId(bill.id);
    setSelectedBillId(bill.id);
    setLastBill(null);
    setSaleType(bill.saleType as SaleType);
    setIsQuickSale(String(bill.notes || "").includes("[quick-stock-sale]"));
    setCustomer({
      name: bill.customerName || "",
      phone: bill.customerPhone || "",
      address: bill.customerAddress || "",
      email: bill.customerEmail || "",
      deliveryDate: bill.deliveryDate || "",
      quotationNumber: bill.quotationNumber || "",
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
        unit: (item.unit || "piece") as ItemUnit,
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
  const receiveDuePayment = (bill: any) => {
    const entered = receiveAmounts[bill.id];
    const amount = Number(entered === undefined || entered === "" ? bill.balanceDue : entered);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Received amount enter karein.");
    receivePayment.mutate({
      billId: bill.id,
      amount,
      paymentMethod: receiveMethods[bill.id] || "cash",
    });
  };
  const saveBill = () => {
    if (!lines.length) return toast.error("Bill mein kam se kam ek item add karein.");
    if (lines.some(line => !line.description.trim() || line.quantity < 1 || line.unitPrice < 0)) return toast.error("Har bill line ki details sahi bharein.");
    if (paid > totalAmount) return toast.error("Received amount bill total se zyada nahi ho sakta.");
    const billDetails = {
      saleType: isQuickSale ? "counter" as const : saleType,
      customerName: isQuickSale ? "Quick Stock Sale" : customer.name.trim() || undefined,
      customerPhone: isQuickSale ? undefined : customer.phone.trim() || undefined,
      customerAddress: isQuickSale ? undefined : customer.address.trim() || undefined,
      customerEmail: isQuickSale ? undefined : customer.email.trim() || undefined,
      workDescription: isQuickSale ? undefined : customer.workDescription.trim() || undefined,
      deliveryDate: isQuickSale ? undefined : customer.deliveryDate || undefined,
      quotationNumber: isQuickSale ? undefined : customer.quotationNumber.trim() || undefined,
      paymentMethod: isQuickSale && paymentMethod === "credit" ? "cash" : paymentMethod,
      amountPaid: isQuickSale ? totalAmount : paid,
      showDiscount,
      notes: isQuickSale ? `[quick-stock-sale] ${customer.notes.trim()}`.trim() : customer.notes.trim() || undefined,
      items: lines.map(line => ({
        productId: line.productId || null,
        sourceType: line.sourceType,
        description: line.description.trim() || undefined,
        unit: line.unit,
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
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.unit || "piece")}</td><td>${item.quantity}</td><td>${money(rate)}</td><td>${money(amount)}</td></tr>`;
    }).join("");
    const discountRows = bill.showDiscount && discount > 0
      ? `<div class="row"><span>Subtotal</span><span>${money(Number(bill.listedAmount))}</span></div><div class="row"><span>Discount</span><span>− ${money(discount)}</span></div>`
      : "";
    const pendingAmount = Math.max(0, Number(bill.balanceDue || 0));
    const paymentQr = pendingAmount > 0
      ? `<div class="qr"><img src="${qrImageUrl(upiPaymentLink(bill))}" alt="UPI payment QR"><span><b>Scan & Pay by UPI</b><br><small>UPI ID: ${SHOP_UPI_ID}<br>Payable: ${money(pendingAmount)}</small></span></div>`
      : `<p class="paid">Payment received in full</p>`;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(bill.billNumber)}</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:32px;max-width:760px}header{border-bottom:4px solid #d59c25;padding-bottom:15px}h1{margin:0;color:#143e69;font-size:28px}.muted{color:#667085;font-size:13px}.row{display:flex;justify-content:space-between;gap:20px}.box{border:1px solid #d8e0e8;border-radius:8px;padding:13px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:22px}th{background:#143e69;color:white;text-align:left;padding:10px;font-size:13px}td{padding:10px;border-bottom:1px solid #e4e7ec;font-size:14px}th:last-child,td:last-child{text-align:right}.total{margin-left:auto;width:320px;margin-top:20px}.total .row{padding:7px 0}.grand{border-top:2px solid #143e69;color:#143e69;font-size:20px;font-weight:bold;padding-top:10px!important}.qr{display:flex;align-items:center;gap:12px;margin-top:20px}.qr img{width:100px;height:100px}.paid{color:#047857;font-weight:bold;margin-top:20px}@media print{body{margin:18px}}</style></head><body><header><div class="row"><div><h1>PATEL ELECTRICALS</h1><p class="muted">Electricals • Spare Parts • Repairing • Fitting Service<br>Udhana Meera Nagar, Surat, Gujarat - 394210<br>Phone / WhatsApp: +91 8780657095 · www.patelspares.com</p></div><div style="text-align:right"><b>${escapeHtml(bill.saleType === "repair" ? "REPAIR BILL" : bill.saleType === "site_work" ? "SITE WORK BILL" : "COUNTER BILL")}</b><br><span class="muted">Bill No: ${escapeHtml(bill.billNumber)}<br>Date: ${new Date(bill.createdAt).toLocaleDateString("en-IN")}</span></div></div></header><div class="box"><b>Customer:</b> ${escapeHtml(bill.customerName || "Walk-in Customer")} ${bill.customerPhone ? `· ${escapeHtml(bill.customerPhone)}` : ""}${bill.customerEmail ? `<br><span class="muted">Email: ${escapeHtml(bill.customerEmail)}</span>` : ""}${bill.customerAddress ? `<br><span class="muted">Address: ${escapeHtml(bill.customerAddress)}</span>` : ""}${bill.deliveryDate ? `<br><span class="muted">Delivery Date: ${escapeHtml(bill.deliveryDate)}</span>` : ""}${bill.quotationNumber ? `<br><span class="muted">Quotation No: ${escapeHtml(bill.quotationNumber)}</span>` : ""}${bill.workDescription ? `<br><br><b>Work:</b> ${escapeHtml(bill.workDescription)}` : ""}</div><table><thead><tr><th>#</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${invoiceItemRows}</tbody></table>${paymentQr}<div class="total">${discountRows}<div class="row"><span>Amount Received</span><span>${money(Number(bill.amountPaid))}</span></div><div class="row"><span>Balance Due</span><span>${money(Number(bill.balanceDue))}</span></div><div class="row grand"><span>Total</span><span>${money(Number(bill.totalAmount))}</span></div></div><p class="muted" style="margin-top:50px">Thank you for choosing Patel Electricals.<br>WhatsApp: +91 8780657095 · www.patelspares.com<br>Computer-generated bill — no signature required.</p><script>window.onload=()=>{const image=document.querySelector('.qr img');if(image&&!image.complete){image.onload=()=>window.print();image.onerror=()=>window.print();setTimeout(()=>window.print(),2500)}else window.print()}</script></body></html>`);
    popup.document.close();
  };
  const buildBillPdf = async (bill: any) => {
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
      pdf.setFontSize(8);
      pdf.text("Udhana Meera Nagar, Surat, Gujarat - 394210", 14, y + 10);
      pdf.text("Phone / WhatsApp: +91 8780657095 | www.patelspares.com", 14, y + 14);
      pdf.setTextColor(20, 32, 51);
      pdf.setFont("helvetica", "bold");
      pdf.text(bill.saleType === "repair" ? "REPAIR BILL" : bill.saleType === "site_work" ? "SITE WORK BILL" : "COUNTER BILL", pageWidth - 14, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(`Bill No: ${bill.billNumber}`, pageWidth - 14, y + 6, { align: "right" });
      pdf.text(`Date: ${new Date(bill.createdAt).toLocaleDateString("en-IN")}`, pageWidth - 14, y + 11, { align: "right" });
      y += 29;
      const customerLines = [
        `${bill.customerName || "Walk-in Customer"}${bill.customerPhone ? ` | ${bill.customerPhone}` : ""}`,
        ...(bill.customerEmail ? [`Email: ${bill.customerEmail}`] : []),
        ...(bill.customerAddress ? pdf.splitTextToSize(`Address: ${String(bill.customerAddress)}`, pageWidth - 36) : []),
        ...(bill.deliveryDate ? [`Delivery Date: ${bill.deliveryDate}`] : []),
        ...(bill.quotationNumber ? [`Quotation No: ${bill.quotationNumber}`] : []),
        ...(bill.workDescription ? pdf.splitTextToSize(`Work: ${String(bill.workDescription)}`, pageWidth - 36) : []),
      ];
      const customerBoxHeight = Math.max(21, 10 + customerLines.length * 5);
      pdf.setDrawColor(210, 220, 230);
      pdf.roundedRect(14, y, pageWidth - 28, customerBoxHeight, 2, 2, "S");
      pdf.setFont("helvetica", "bold");
      pdf.text("Customer", 18, y + 6);
      pdf.setFont("helvetica", "normal");
      customerLines.forEach((line: string, index: number) => pdf.text(line, 18, y + 12 + index * 5));
      y += customerBoxHeight + 9;
      pdf.setFillColor(20, 62, 105);
      pdf.rect(14, y, pageWidth - 28, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("#", 18, y + 5.3);
      pdf.text("Description", 26, y + 5.3);
      pdf.text("Unit", 110, y + 5.3, { align: "right" });
      pdf.text("Qty", 130, y + 5.3, { align: "right" });
      pdf.text("Rate", 153, y + 5.3, { align: "right" });
      pdf.text("Amount", pageWidth - 18, y + 5.3, { align: "right" });
      y += 8;
      pdf.setTextColor(20, 32, 51);
      pdf.setFont("helvetica", "normal");
      for (const [itemIndex, item] of (bill.items || []).entries()) {
        const description = pdf.splitTextToSize(String(item.description || "Item"), 76);
        const rowHeight = Math.max(8, description.length * 5 + 3);
        if (y + rowHeight > 265) { pdf.addPage(); y = 16; }
        pdf.text(String(itemIndex + 1), 18, y + 5);
        pdf.text(description, 26, y + 5);
        pdf.text(String(item.unit || "piece"), 110, y + 5, { align: "right" });
        pdf.text(String(item.quantity), 130, y + 5, { align: "right" });
        pdf.text(moneyText(bill.showDiscount ? item.listedRate : item.unitPrice), 153, y + 5, { align: "right" });
        const amount = bill.showDiscount ? Number(item.listedRate || 0) * Number(item.quantity || 0) : Number(item.totalPrice || 0);
        pdf.text(moneyText(amount), pageWidth - 18, y + 5, { align: "right" });
        pdf.setDrawColor(230, 234, 239);
        pdf.line(14, y + rowHeight, pageWidth - 14, y + rowHeight);
        y += rowHeight;
      }
      y += 8;
      const totalRows = [
        ...(bill.showDiscount && Number(bill.discountAmount || 0) > 0 ? [["Subtotal", moneyText(bill.listedAmount)], ["Discount", `- ${moneyText(bill.discountAmount)}`]] : []),
        ["Amount Received", moneyText(bill.amountPaid)],
        ["Balance Due", moneyText(bill.balanceDue)],
        ["Total", moneyText(bill.totalAmount)],
      ];
      totalRows.forEach(([label, value], index) => {
        pdf.setFont("helvetica", index === totalRows.length - 1 ? "bold" : "normal");
        pdf.setFontSize(index === totalRows.length - 1 ? 13 : 10);
        pdf.text(label, 135, y, { align: "right" });
        pdf.text(value, pageWidth - 18, y, { align: "right" });
        y += 7;
      });
      const pendingAmount = Math.max(0, Number(bill.balanceDue || 0));
      if (pendingAmount > 0) {
        if (y + 35 > 274) { pdf.addPage(); y = 20; }
        try {
          const qrDataUrl = await loadImageDataUrl(qrImageUrl(upiPaymentLink(bill)));
          pdf.addImage(qrDataUrl, "PNG", 14, y, 30, 30);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.text("Scan & Pay by UPI", 50, y + 9);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text(`UPI ID: ${SHOP_UPI_ID}`, 50, y + 15);
          pdf.text(`Payable: ${moneyText(pendingAmount)}`, 50, y + 20);
        } catch {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text(`UPI: ${SHOP_UPI_ID} | Payable: ${moneyText(pendingAmount)}`, 14, y + 8);
        }
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(4, 120, 87);
        pdf.text("Payment received in full", 14, y + 7);
      }
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(92, 102, 120);
      pdf.text("Thank you for choosing Patel Electricals | WhatsApp: +91 8780657095 | www.patelspares.com", 14, 280);
      pdf.text("Computer-generated bill — no signature required.", 14, 284);
      return pdf;
  };
  const downloadBill = async (bill: any) => {
    try {
      const pdf = await buildBillPdf(bill);
      pdf.save(`${bill.billNumber || "Patel-Electricals-Invoice"}.pdf`);
    } catch (error) {
      console.error("Invoice download failed", error);
      toast.error("Invoice download nahi hua. Print option use karein.");
    }
  };
  const shareBillOnWhatsApp = async (bill: any) => {
    const rawPhone = String(bill.customerPhone || "").replace(/\D/g, "");
    if (!rawPhone) return toast.error("WhatsApp bhejne ke liye customer mobile number zaroori hai.");
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const message = `Patel Electricals\nBill No: ${bill.billNumber}\nTotal: ${money(Number(bill.totalAmount))}\nReceived: ${money(Number(bill.amountPaid))}\nBalance Due: ${money(Number(bill.balanceDue))}\nDhanyavaad.`;
    // Open WhatsApp immediately from the button click. Some Android browsers
    // reject an async file-share and WhatsApp then shows an empty-message error.
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!whatsappWindow) window.location.assign(whatsappUrl);
    toast.message("WhatsApp message ready hai. PDF bhejne ke liye Download PDF karke attachment se select karein.");
  };
  const openMobileBill = (bill: any) => {
    const popup = window.open("", "_blank", "width=430,height=760");
    if (!popup) return toast.error("Mobile bill window open nahi hui. Browser popup allow karein.");
    const rows = (bill.items || []).map((item: any, index: number) => `<div class="item"><span><b>${index + 1}. ${escapeHtml(item.description)}</b><small>${item.quantity} ${escapeHtml(item.unit || "piece")} × ${money(Number(bill.showDiscount ? item.listedRate : item.unitPrice))}</small></span><b>${money(Number(bill.showDiscount ? Number(item.listedRate) * Number(item.quantity) : item.totalPrice))}</b></div>`).join("");
    const pendingAmount = Math.max(0, Number(bill.balanceDue || 0));
    const paymentQr = pendingAmount > 0 ? `<div class="qr"><img src="${qrImageUrl(upiPaymentLink(bill))}" alt="UPI payment QR"><b>Scan & Pay ₹${pendingAmount.toLocaleString("en-IN")}</b><small>${SHOP_UPI_ID}</small></div>` : `<p class="paid">Payment received in full</p>`;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(bill.billNumber)}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#edf1f5;color:#172033;margin:0}.bill{max-width:430px;margin:auto;background:white;min-height:100vh}.head{background:#143e69;color:white;padding:24px 20px}.head h1{font-size:20px;margin:0}.head p{margin:6px 0 0;font-size:12px;opacity:.85}.content{padding:18px}.muted{color:#667085;font-size:13px}.item{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #e6eaf0;font-size:14px}.item small{display:block;color:#667085;margin-top:4px}.total{display:flex;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:2px solid #143e69;color:#143e69;font-size:21px;font-weight:bold}.payment{background:#f5f8fb;border-radius:10px;padding:12px;margin-top:16px;font-size:14px;line-height:1.7}.qr{margin-top:18px;text-align:center;border:1px solid #dbe5ee;border-radius:10px;padding:12px}.qr img{display:block;width:150px;height:150px;margin:0 auto 8px}.qr small{display:block;color:#667085;margin-top:4px}.paid{text-align:center;color:#047857;font-weight:bold;margin-top:18px}</style></head><body><div class="bill"><div class="head"><h1>PATEL ELECTRICALS</h1><p>${escapeHtml(bill.saleType === "repair" ? "REPAIR BILL" : bill.saleType === "site_work" ? "SITE WORK BILL" : "COUNTER BILL")} · ${escapeHtml(bill.billNumber)}</p></div><div class="content"><b>${escapeHtml(bill.customerName || "Walk-in Customer")}</b>${bill.customerPhone ? `<p class="muted">${escapeHtml(bill.customerPhone)}</p>` : ""}${bill.customerEmail ? `<p class="muted">${escapeHtml(bill.customerEmail)}</p>` : ""}${bill.customerAddress ? `<p class="muted">${escapeHtml(bill.customerAddress)}</p>` : ""}${bill.deliveryDate ? `<p class="muted">Delivery: ${escapeHtml(bill.deliveryDate)}</p>` : ""}${bill.quotationNumber ? `<p class="muted">Quotation: ${escapeHtml(bill.quotationNumber)}</p>` : ""}<p class="muted">${new Date(bill.createdAt).toLocaleString("en-IN")}</p>${rows}<div class="payment">Received: <b>${money(Number(bill.amountPaid))}</b><br>Balance Due: <b>${money(Number(bill.balanceDue))}</b></div>${paymentQr}<div class="total"><span>Total</span><span>${money(Number(bill.totalAmount))}</span></div><p class="muted" style="text-align:center;margin-top:35px">Thank you for choosing Patel Electricals<br>WhatsApp: +91 8780657095 · www.patelspares.com</p></div></div></body></html>`);
    popup.document.close();
  };
  const billToPrint = lastBill || savedBill.data;

  return <div className="min-h-screen bg-muted/30">
    <AdminNav current="/admin/billing" />
    <main className="container space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h1 className="text-2xl font-bold">Counter, Repair & Site Billing</h1><p className="text-sm text-muted-foreground">Customer bill par sirf final item/rate dikhega. Outside material aur cost/profit private rahenge.</p></div>{billToPrint && <Button variant="outline" onClick={() => printBill(billToPrint)}><Printer className="mr-2 h-4 w-4" /> Print Last Bill</Button>}</div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label={reportDate === indiaDate() ? "Today's Bills" : "Selected Date Bills"} value={String(dateSummary.data?.billCount || 0)} />
        <Stat label={reportDate === indiaDate() ? "Today's Sale" : "Selected Date Sale"} value={money(dateSummary.data?.totalSales || 0)} />
        <Stat label="Received" value={money(dateSummary.data?.totalReceived || 0)} />
        <Stat label="Balance Due" value={money(dateSummary.data?.totalDue || 0)} />
        <Stat label="Private Profit" value={money(dateSummary.data?.totalProfit || 0)} />
      </div>

      <Card><CardHeader><CardTitle>Profit Report</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2"><div className="rounded-lg border p-4"><Label>Selected Date</Label><Input className="mt-2" type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} /><div className="mt-4 grid grid-cols-2 gap-3"><ReportValue label="Bills" value={String(dateSummary.data?.billCount || 0)} /><ReportValue label="Sale" value={money(dateSummary.data?.totalSales || 0)} /><ReportValue label="Received" value={money(dateSummary.data?.totalReceived || 0)} /><ReportValue label="Profit" value={money(dateSummary.data?.totalProfit || 0)} /></div></div><div className="rounded-lg border p-4"><Label>Selected Month</Label><Input className="mt-2" type="month" value={reportMonth} onChange={event => setReportMonth(event.target.value)} /><div className="mt-4 grid grid-cols-2 gap-3"><ReportValue label="Bills" value={String(monthSummary.data?.billCount || 0)} /><ReportValue label="Sale" value={money(monthSummary.data?.totalSales || 0)} /><ReportValue label="Received" value={money(monthSummary.data?.totalReceived || 0)} /><ReportValue label="Profit" value={money(monthSummary.data?.totalProfit || 0)} /></div></div></CardContent></Card>

      {selectedBillId && <Card><CardHeader><CardTitle>Open Invoice</CardTitle></CardHeader><CardContent>{savedBill.isLoading && <p className="text-sm text-muted-foreground">Invoice open ho raha hai...</p>}{savedBill.data && <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-lg font-bold">{savedBill.data.billNumber}</p><p className="text-sm text-muted-foreground">{savedBill.data.customerName || "Walk-in Customer"}{savedBill.data.customerPhone ? ` · ${savedBill.data.customerPhone}` : ""} · {new Date(savedBill.data.createdAt).toLocaleString("en-IN")}</p></div><p className="text-xl font-bold">{money(Number(savedBill.data.totalAmount))}</p></div><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">#</th><th className="p-3">Item</th><th className="p-3">Unit</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{savedBill.data.items.map((item: any, index: number) => <tr key={item.id} className="border-t"><td className="p-3">{index + 1}</td><td className="p-3">{item.description}</td><td className="p-3 capitalize">{item.unit || "piece"}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">{money(Number(savedBill.data.showDiscount ? item.listedRate : item.unitPrice))}</td><td className="p-3 text-right font-medium">{money(Number(savedBill.data.showDiscount ? Number(item.listedRate) * Number(item.quantity) : item.totalPrice))}</td></tr>)}</tbody></table></div><div className="grid gap-2 sm:grid-cols-3"><SummaryRow label="Received" value={money(Number(savedBill.data.amountPaid))} /><SummaryRow label="Balance" value={money(Number(savedBill.data.balanceDue))} /><SummaryRow label="Private Profit" value={money(Number(savedBill.data.grossProfit))} /></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => printBill(savedBill.data)}><Printer className="mr-2 h-4 w-4" /> Print A4</Button><Button type="button" variant="outline" onClick={() => downloadBill(savedBill.data)}><FileDown className="mr-2 h-4 w-4" /> Download PDF</Button>{savedBill.data.customerPhone && <Button type="button" disabled={sendWhatsAppInvoice.isPending} onClick={() => sendWhatsAppInvoice.mutate({ billId: savedBill.data.id })}><MessageCircle className="mr-2 h-4 w-4" /> {sendWhatsAppInvoice.isPending ? "Sending..." : "Send WhatsApp Invoice"}</Button>}<Button type="button" variant="outline" onClick={() => shareBillOnWhatsApp(savedBill.data)}><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Bill (Manual)</Button><Button type="button" variant="outline" onClick={() => openMobileBill(savedBill.data)}><Smartphone className="mr-2 h-4 w-4" /> Mobile Bill</Button><Button type="button" variant="outline" onClick={() => editBill(savedBill.data)}><Pencil className="mr-2 h-4 w-4" /> Edit Bill</Button><Button type="button" variant="destructive" disabled={deleteBill.isPending} onClick={() => { if (window.confirm(`Delete invoice ${savedBill.data.billNumber}? Shop-stock items will be returned to inventory.`)) deleteBill.mutate({ billId: savedBill.data.id }); }}><Trash2 className="mr-2 h-4 w-4" /> {deleteBill.isPending ? "Deleting..." : "Delete Invoice"}</Button></div></div>}</CardContent></Card>}

      <Card><CardHeader><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Pending / Due Payments</CardTitle><p className="font-bold text-orange-700">Total Due: {money(totalDueAmount)}</p></div></CardHeader><CardContent className="space-y-3">{duePayments.isLoading && <p className="text-sm text-muted-foreground">Due payments load ho rahe hain...</p>}{!duePayments.isLoading && !duePayments.data?.length && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Koi pending payment nahi hai.</p>}{duePayments.data?.map(bill => <div key={bill.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_auto]"><button type="button" className="min-w-0 text-left" onClick={() => { setSelectedBillId(bill.id); setLastBill(null); }}><p className="font-bold">{bill.customerName || "Walk-in Customer"}</p><p className="text-sm text-muted-foreground">{bill.billNumber} · {bill.customerPhone || "No mobile"} · {new Date(bill.createdAt).toLocaleDateString("en-IN")}</p><p className="mt-1 text-sm">Bill: {money(Number(bill.totalAmount))} · Received: {money(Number(bill.amountPaid))}</p><p className="mt-1 font-bold text-orange-700">Due: {money(Number(bill.balanceDue))}</p></button><div><Label>Received Now</Label><Input className="mt-1" type="number" min="0.01" max={Number(bill.balanceDue)} step="0.01" placeholder={String(bill.balanceDue)} value={receiveAmounts[bill.id] ?? ""} onChange={event => setReceiveAmounts(current => ({ ...current, [bill.id]: event.target.value }))} /></div><div><Label>Payment Method</Label><Select value={receiveMethods[bill.id] || "cash"} onValueChange={value => setReceiveMethods(current => ({ ...current, [bill.id]: value as PaymentMethod }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem></SelectContent></Select></div><Button type="button" className="self-end" disabled={receivePayment.isPending} onClick={() => receiveDuePayment(bill)}>{receivePayment.isPending ? "Saving..." : "Receive Payment"}</Button></div>)}</CardContent></Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>{isQuickSale ? "Quick Stock Sale" : "Customer Invoice Details"}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            {!editingBillId && <div className="md:col-span-2 grid grid-cols-2 gap-2 rounded-lg bg-muted p-2"><Button type="button" variant={!isQuickSale ? "default" : "outline"} onClick={() => setIsQuickSale(false)}>Customer Invoice</Button><Button type="button" variant={isQuickSale ? "default" : "outline"} onClick={() => { setIsQuickSale(true); setCustomer({ name: "", phone: "", address: "", email: "", deliveryDate: "", quotationNumber: "", workDescription: "", notes: "" }); setSaleType("counter"); setAmountPaid(String(totalAmount)); }}>Quick Stock Sale</Button></div>}
            {isQuickSale ? <><div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Customer details aur customer invoice ki zaroorat nahi. Product add karo, final rate bharo aur save karo — stock kam hoga aur profit report update hogi.</div><div><Label>Payment Method</Label><Select value={paymentMethod === "credit" ? "cash" : paymentMethod} onValueChange={value => setPaymentMethod(value as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem></SelectContent></Select></div></> : <>
              <div><Label>Bill Type</Label><Select value={saleType} onValueChange={value => setSaleType(value as SaleType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="counter">Counter Sale</SelectItem><SelectItem value="repair">Repair Bill</SelectItem><SelectItem value="site_work">Site Work Bill</SelectItem></SelectContent></Select></div>
              <div><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={value => setPaymentMethod(value as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="credit">Credit / Due</SelectItem></SelectContent></Select></div>
              <div><Label>Customer Name</Label><Input placeholder="Walk-in customer ke liye blank rakhein" value={customer.name} onChange={event => setCustomer(current => ({ ...current, name: event.target.value }))} /></div>
              <div><Label>Mobile Number</Label><Input inputMode="tel" value={customer.phone} onChange={event => setCustomer(current => ({ ...current, phone: event.target.value }))} /></div>
              <div><Label>Customer Email</Label><Input type="email" placeholder="Optional" value={customer.email} onChange={event => setCustomer(current => ({ ...current, email: event.target.value }))} /></div>
              <div><Label>Delivery Date</Label><Input type="date" value={customer.deliveryDate} onChange={event => setCustomer(current => ({ ...current, deliveryDate: event.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Full Site / Customer Address</Label><Textarea placeholder="House/shop no., area, city, pincode" value={customer.address} onChange={event => setCustomer(current => ({ ...current, address: event.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Quotation Number</Label><Input placeholder="Example: QT-001 (optional)" value={customer.quotationNumber} onChange={event => setCustomer(current => ({ ...current, quotationNumber: event.target.value }))} /></div>
              {(saleType === "repair" || saleType === "site_work") && <div className="md:col-span-2"><Label>Work Description</Label><Textarea placeholder="Example: Mixer repair and fitting" value={customer.workDescription} onChange={event => setCustomer(current => ({ ...current, workDescription: event.target.value }))} /></div>}
            </>}
            {isQuickSale && <div className="md:col-span-2"><Label>Private Note (optional)</Label><Input placeholder="Example: Counter par 2 switch sale" value={customer.notes} onChange={event => setCustomer(current => ({ ...current, notes: event.target.value }))} /></div>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Add Shop Product</CardTitle></CardHeader><CardContent className="space-y-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Product ya part number search karein" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="grid gap-2 sm:grid-cols-2">{visibleProducts.map(product => <button key={product.id} type="button" className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted disabled:opacity-50" disabled={Number(product.quantityInStock || 0) < 1} onClick={() => addProduct(product)}><span><span className="block font-medium">{product.name}</span><span className="text-xs text-muted-foreground">#{product.partNumber} · Stock: {product.quantityInStock || 0}</span></span><span className="font-semibold text-emerald-700">{money(Number(product.counterPrice ?? product.basePrice))}</span></button>)}</div>{search && !visibleProducts.length && <p className="text-sm text-muted-foreground">Product nahi mila.</p>}<div className="flex flex-wrap gap-2 border-t pt-3"><div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2"><div><Label className="text-xs">Outside material rows</Label><Input className="mt-1 h-9 w-20" type="number" min="1" max="50" value={outsideMaterialRows} onChange={event => setOutsideMaterialRows(event.target.value)} /></div><Button type="button" variant="outline" className="h-9" onClick={addOutsideMaterialRows}>+ Add Outside Material</Button></div><Button type="button" variant="outline" onClick={() => addCustomLine("repair_labour")}>+ Repair Labour</Button><Button type="button" variant="outline" onClick={() => addCustomLine("fitting_charge")}>+ Fitting Charge</Button></div></CardContent></Card>

          <Card><CardHeader><CardTitle>Bill Items</CardTitle></CardHeader><CardContent className="space-y-3">{!lines.length && <p className="py-5 text-center text-sm text-muted-foreground">Product ya work charge add karke bill banayein.</p>}{lines.map((line, index) => { const lineTotal = rounded(line.unitPrice * line.quantity); const belowCost = line.unitPrice < line.purchaseCost; return <div key={line.id} className="rounded-lg border p-3"><div className="mb-3 flex items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">#{index + 1} · {sourceLabel[line.sourceType]}</p>{line.sourceType === "shop_stock" && <p className="text-xs text-muted-foreground">Normal counter rate: {money(line.normalRate)} · Available stock: {line.stock}</p>}</div><Button type="button" variant="ghost" size="icon" onClick={() => setLines(current => current.filter(item => item.id !== line.id))} aria-label="Remove item"><Trash2 className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-12"><div className="col-span-2 lg:col-span-3"><Label>Description</Label><Input disabled={line.sourceType === "shop_stock"} value={line.description} onChange={event => updateLine(line.id, { description: event.target.value })} /></div><div className="lg:col-span-2"><Label>Unit</Label><Select value={line.unit} onValueChange={value => updateLine(line.id, { unit: value as ItemUnit })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="piece">Piece</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="roll">Roll</SelectItem><SelectItem value="box">Box</SelectItem></SelectContent></Select></div><div className="lg:col-span-2"><Label>Qty</Label><div className="grid grid-cols-[2.5rem_minmax(3.5rem,1fr)_2.5rem]"><Button type="button" variant="outline" size="icon" className="h-10 rounded-r-none" onClick={() => updateLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}><Minus className="h-4 w-4" /></Button><Input aria-label="Quantity" className="h-10 min-w-0 rounded-none px-1 text-center font-semibold" type="number" min="1" max={line.stock || undefined} value={quantityDrafts[line.id] ?? String(line.quantity)} onFocus={event => { setQuantityDrafts(current => ({ ...current, [line.id]: String(line.quantity) })); event.currentTarget.select(); }} onChange={event => setQuantityDrafts(current => ({ ...current, [line.id]: event.target.value }))} onBlur={() => commitQuantity(line)} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><Button type="button" variant="outline" size="icon" className="h-10 rounded-l-none" disabled={line.stock !== undefined && line.quantity >= line.stock} onClick={() => updateLine(line.id, { quantity: line.quantity + 1 })}><Plus className="h-4 w-4" /></Button></div></div><div className="lg:col-span-2"><Label>Final Rate</Label><Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={event => updateLine(line.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="lg:col-span-2"><Label>Cost (private)</Label><Input type="number" min="0" step="0.01" value={line.purchaseCost} onChange={event => updateLine(line.id, { purchaseCost: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="lg:col-span-1"><Label>Total</Label><p className={`mt-2 text-lg font-bold ${belowCost ? "text-red-600" : ""}`}>{money(lineTotal)}</p>{belowCost && <p className="text-xs text-red-600">Loss</p>}</div></div></div>;})}</CardContent></Card>
        </div>

        <div className="space-y-6"><Card className="xl:sticky xl:top-4"><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" /> {editingBillId ? "Edit Bill" : isQuickSale ? "Quick Sale Summary" : "Bill Summary"}</CardTitle></CardHeader><CardContent className="space-y-3">{editingBillId && <div className="flex items-center justify-between rounded-md bg-amber-50 p-3 text-sm text-amber-800"><span>Editing saved invoice. Stock will update safely.</span><Button type="button" variant="ghost" size="sm" onClick={clearDraft}><X className="mr-1 h-4 w-4" /> Cancel</Button></div>}<SummaryRow label="Normal counter value" value={money(listedAmount)} />{listedAmount > totalAmount && <SummaryRow label="Negotiated discount" value={`− ${money(listedAmount - totalAmount)}`} tone="text-orange-600" />}<SummaryRow label="Bill total" value={money(totalAmount)} bold />{isQuickSale ? <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Quick sale is fully paid automatically. Customer invoice nahi banega.</div> : <><div className="border-t pt-3"><Label>Amount Received</Label><Input type="number" min="0" max={totalAmount} step="0.01" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} /><Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={() => setAmountPaid(String(totalAmount))}>Mark full payment</Button></div><SummaryRow label="Balance due" value={money(balance)} tone={balance > 0 ? "text-orange-600" : "text-emerald-700"} bold /></>}<div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-medium text-slate-700">Private Profit</p><p className={`text-lg font-bold ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(profit)}</p><p className="text-xs text-muted-foreground">Customer invoice mein cost/profit nahi dikhega.</p></div>{!isQuickSale && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDiscount} onChange={event => setShowDiscount(event.target.checked)} /> Customer bill par discount dikhayein</label><div><Label>Private Note</Label><Textarea placeholder="Customer ko print bill mein nahi dikhega" value={customer.notes} onChange={event => setCustomer(current => ({ ...current, notes: event.target.value }))} /></div></>}<Button className="min-h-12 w-full text-base" disabled={createBill.isPending || updateBill.isPending || !lines.length} onClick={saveBill}>{editingBillId ? (updateBill.isPending ? "Updating Bill..." : "Update Bill & Stock") : (createBill.isPending ? "Saving..." : isQuickSale ? "Save Quick Sale & Update Stock" : "Save Bill & Update Stock")}</Button></CardContent></Card>
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
