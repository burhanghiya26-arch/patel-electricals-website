import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, XCircle, Loader2, MessageCircle, ShoppingBag, Star, FileText, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const statusSteps = [
  { key: "pending", label: "Order Placed", desc: "Waiting for admin review", icon: Clock, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30" },
  { key: "confirmed", label: "Confirmed", desc: "Order has been confirmed", icon: CheckCircle2, color: "bg-green-100 text-green-600 dark:bg-green-900/30" },
  { key: "processing", label: "Processing", desc: "Order is being prepared", icon: Package, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30" },
  { key: "shipped", label: "Shipped", desc: "Order is on the way", icon: Truck, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30" },
  { key: "delivered", label: "Delivered", desc: "Order has been delivered", icon: CheckCircle2, color: "bg-green-100 text-green-600 dark:bg-green-900/30" },
];

function getStatusIndex(status: string) {
  if (status === "cancelled") return -1;
  return statusSteps.findIndex((s) => s.key === status);
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    confirmed: { label: "Confirmed", variant: "default" },
    processing: { label: "Processing", variant: "default" },
    shipped: { label: "Shipped", variant: "default" },
    delivered: { label: "Delivered", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };
  const s = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function OrderTracking() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { isAuthenticated, user } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");

  const { data, isLoading, error } = trpc.orders.getById.useQuery(orderId, {
    enabled: isAuthenticated && !!orderId,
  });

  const createReviewMutation = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setShowReviewForm(false);
      setSelectedProductId(null);
      setRating(5);
      setReviewTitle("");
      setReviewContent("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });
  const generateInvoiceMutation = trpc.orders.generateInvoice.useMutation({
    onSuccess: (data) => {
      const downloadUrl = `/api/download-invoice/${orderId}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = data.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Invoice downloaded successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate invoice");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-4 text-muted-foreground">Loading order details...</p></div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">This order does not exist or you don't have access.</p>
          <Button onClick={() => setLocation("/profile")}>Go to My Orders</Button>
        </div><Footer />
      </div>
    );
  }

  const { order, items } = data;
  const currentIdx = getStatusIndex(order.orderStatus);
  const isCancelled = order.orderStatus === "cancelled";
  const isDelivered = order.orderStatus === "delivered";

  return (
    <div className="min-h-screen bg-background flex flex-col"><Navbar />
      <div className="bg-[oklch(0.22_0.05_260)] py-8">
        <div className="container">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white mb-2" onClick={() => setLocation("/profile")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Orders
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Order #{order.orderNumber}</h1>
            {getStatusBadge(order.orderStatus)}
          </div>
          <p className="text-white/60 text-sm mt-1">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div className="container py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader><CardTitle className="text-base">Order Status</CardTitle></CardHeader>
              <CardContent>
                {isCancelled ? (
                  <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">Order Cancelled</p>
                      <p className="text-sm text-muted-foreground">This order has been cancelled.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {statusSteps.map((step, idx) => {
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      
                      // Get timestamp for this status
                      let timestamp: Date | null = null;
                      if (step.key === 'confirmed' && order.confirmedAt) timestamp = new Date(order.confirmedAt);
                      else if (step.key === 'processing' && order.processingAt) timestamp = new Date(order.processingAt);
                      else if (step.key === 'shipped' && order.shippedAt) timestamp = new Date(order.shippedAt);
                      else if (step.key === 'delivered' && order.deliveredAt) timestamp = new Date(order.deliveredAt);
                      else if (step.key === 'pending') timestamp = new Date(order.createdAt);
                      
                      const timeStr = timestamp ? timestamp.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
                      
                      return (
                        <div key={step.key} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted ? step.color : "bg-muted text-muted-foreground"
                            } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                              <step.icon className="h-5 w-5" />
                            </div>
                            {idx < statusSteps.length - 1 && (
                              <div className={`w-0.5 h-8 ${isCompleted && idx < currentIdx ? "bg-green-400" : "bg-muted"}`} />
                            )}
                          </div>
                          <div className="pb-6">
                            <p className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                            {timeStr && isCompleted && (
                              <p className="text-xs text-green-600 dark:text-green-400 font-medium">{timeStr}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{isCurrent ? "Current status" : isCompleted ? "Completed" : step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tracking Details */}
            {order.trackingNumber && (
              <Card>
                <CardHeader><CardTitle className="text-base">Tracking Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Tracking Number:</span><span className="font-mono font-medium">{order.trackingNumber}</span></div>
                </CardContent>
              </Card>
            )}

            {/* Invoice Download */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Invoice & Documents</CardTitle>
                  <Button
                    onClick={() => generateInvoiceMutation.mutate(order.id)}
                    disabled={generateInvoiceMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {generateInvoiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {generateInvoiceMutation.isPending ? "Generating..." : "Download Invoice"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Download your invoice with product details and labels for delivery verification.</p>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader><CardTitle className="text-base">Order Items ({items.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.product?.imageUrl ? <img src={item.product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product?.name || "Product"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} x ₹{Number(item.unitPrice).toLocaleString()}</p>
                    </div>
                    <p className="font-semibold text-sm">₹{Number(item.totalPrice).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Review Form - Show only for delivered orders */}
            {isDelivered && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    Share Your Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showReviewForm ? (
                    <Button 
                      onClick={() => setShowReviewForm(true)}
                      className="w-full"
                    >
                      Write a Review
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      {/* Select Product */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Product to Review</label>
                        <select
                          value={selectedProductId || ""}
                          onChange={(e) => setSelectedProductId(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                        >
                          <option value="">Choose a product...</option>
                          {items.map((item) => (
                            <option key={item.productId} value={item.productId}>
                              {item.product?.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Star Rating */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`h-8 w-8 ${
                                  star <= rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Review Title */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Review Title</label>
                        <Input
                          placeholder="e.g., Great quality product"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                        />
                      </div>

                      {/* Review Content */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Your Review</label>
                        <Textarea
                          placeholder="Share your experience with this product..."
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          rows={4}
                        />
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (!selectedProductId) {
                              toast.error("Please select a product");
                              return;
                            }
                            if (!reviewTitle.trim()) {
                              toast.error("Please enter a review title");
                              return;
                            }
                            if (!reviewContent.trim()) {
                              toast.error("Please enter your review");
                              return;
                            }
                            createReviewMutation.mutate({
                              productId: selectedProductId,
                              orderId,
                              rating,
                              title: reviewTitle,
                              content: reviewContent,
                            });
                          }}
                          disabled={createReviewMutation.isPending}
                          className="flex-1"
                        >
                          {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewForm(false);
                            setSelectedProductId(null);
                            setRating(5);
                            setReviewTitle("");
                            setReviewContent("");
                          }}
                          disabled={createReviewMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Amount</span><span className="font-bold">₹{Number(order.totalAmount).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Order Status</span><Badge variant={order.orderStatus === "delivered" ? "default" : "secondary"} className="text-xs">{order.orderStatus}</Badge></div>
                <Separator />
                <Button 
                  onClick={() => generateInvoiceMutation.mutate(orderId)}
                  disabled={generateInvoiceMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {generateInvoiceMutation.isPending ? "Generating..." : "Download Invoice"}
                </Button>
              </CardContent>
            </Card>

            {order.shippingAddress && (
              <Card>
                <CardHeader><CardTitle className="text-base">Shipping Address</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-line">{order.shippingAddress}</p></CardContent>
              </Card>
            )}

            <Button className="w-full" variant="outline" onClick={() => window.open(`https://wa.me/918780657095?text=Hi, I need help with order ${order.orderNumber}`, "_blank")}>
              <MessageCircle className="h-4 w-4 mr-2" /> Contact Support on WhatsApp
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
