import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Package, ShoppingBag, Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";


import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { data: cartItems } = trpc.cart.list.useQuery();

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay" | "card" | "upi" | "bank_transfer" | "credit">("cod");
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // Address
  const [address, setAddress] = useState({
    fullName: "", phone: "", addressLine1: "", addressLine2: "",
    city: "Surat", state: "Gujarat", pincode: "",
  });

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      setOrderPlaced(true);
      setOrderNumber(data.orderNumber);
      toast.success("Order placed successfully! Check WhatsApp for order details.");
    },
    onError: (err) => toast.error(err.message),
  });

  // Get shipping configuration
  const { data: shippingConfig } = trpc.admin.getShippingConfig.useQuery();
  const freeShippingThreshold = shippingConfig?.freeShippingThreshold || 1000;

  // Calculate shipping based on distance from warehouse
  const fullAddress = `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.state} - ${address.pincode}`;
  const { data: shippingData } = trpc.admin.calculateShippingByDistance.useQuery(
    { address: fullAddress },
    { enabled: fullAddress.length > 10 && address.pincode.length === 6 }
  );
  const calculatedShipping = shippingData?.shippingCost || 0;

  // Totals
  const subtotal = cartItems?.reduce((sum, item) => sum + Number(item.product?.basePrice || 0) * item.quantity, 0) || 0;
  // Apply free shipping if subtotal >= threshold
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : calculatedShipping;
  const total = subtotal + shippingCost;

  const handlePlaceOrder = () => {
    if (!address.fullName || !address.phone || !address.addressLine1 || !address.city || !address.pincode) {
      toast.error("Please fill all address fields!");
      return;
    }
    const fullAddress = `${address.fullName}, ${address.phone}\n${address.addressLine1}${address.addressLine2 ? ", " + address.addressLine2 : ""}\n${address.city}, ${address.state} - ${address.pincode}`;
    createOrder.mutate({
      shippingAddress: fullAddress,
      paymentMethod: paymentMethod,
      shippingPincode: address.pincode,
      shippingCost: Math.round(shippingCost),
      customerPhone: address.phone,
    });
  };



  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">Add products to checkout</p>
          <Button onClick={() => setLocation("/products")}>Continue Shopping</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
          <p className="text-muted-foreground mb-2">Order Number: <span className="font-mono font-bold text-foreground">{orderNumber}</span></p>
          <p className="text-muted-foreground mb-6">Your order has been created. Admin will review and confirm it soon.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setLocation("/profile")}>View My Orders</Button>
            <Button variant="outline" onClick={() => setLocation("/products")}>Continue Shopping</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col"><Navbar />
      <div className="bg-[oklch(0.22_0.05_260)] py-8">
        <div className="container">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white mb-2" onClick={() => setLocation("/cart")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cart
          </Button>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
        </div>
      </div>

      <div className="container py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Address Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Delivery Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input placeholder="Your name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input placeholder="10-digit phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>Address Line 1 *</Label>
                  <Input placeholder="Street address" value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} />
                </div>

                <div>
                  <Label>Address Line 2 (Optional)</Label>
                  <Input placeholder="Apartment, suite, etc." value={address.addressLine2} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input placeholder="Surat" value={address.city} readOnly disabled className="bg-muted cursor-not-allowed" />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <Input placeholder="State" value={address.state} readOnly disabled className="bg-muted cursor-not-allowed" />
                  </div>
                  <div>
                    <Label>Pincode *</Label>
                    <Input placeholder="6-digit pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader><CardTitle className="text-base">Order Items ({cartItems.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.product?.imageUrl ? <img src={item.product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} x ₹{Number(item.product?.basePrice || 0).toLocaleString()}</p>
                    </div>
                    <p className="font-semibold text-sm">₹{(Number(item.product?.basePrice || 0) * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Method</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted" onClick={() => setPaymentMethod('cod')}>
                  <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                  <div><p className="font-medium">Cash on Delivery (COD)</p><p className="text-xs text-muted-foreground">Pay when order arrives</p></div>
                </label>

              </CardContent>
            </Card>

            {/* Place Order Button */}
            <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={createOrder.isPending}>
              {createOrder.isPending ? "Placing Order..." : `Place Order - ₹${Math.round(total).toLocaleString()}`}
            </Button>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items ({cartItems.length})</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    {shippingCost === 0 && subtotal >= freeShippingThreshold ? (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        FREE DELIVERY
                      </Badge>
                    ) : (
                      <span>₹{Math.round(shippingCost).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{Math.round(total).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
