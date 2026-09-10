import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  MapPin,
  Package,
  ShoppingBag,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, callback: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadRazorpayCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.getElementById(
      "razorpay-checkout-script",
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener(
        "load",
        () => resolve(Boolean(window.Razorpay)),
        { once: true },
      );
      existing.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const { data: cartItems } = trpc.cart.list.useQuery();

  const subtotal =
    cartItems?.reduce(
      (sum, item) =>
        sum + Number(item.product?.basePrice || 0) * item.quantity,
      0,
    ) || 0;

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "razorpay" | "card" | "upi" | "bank_transfer" | "credit"
  >("cod");
  const [isOpeningPayment, setIsOpeningPayment] = useState(false);

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "Surat",
    state: "Gujarat",
    pincode: "",
  });

  const hasValidPincode = /^\d{6}$/.test(address.pincode);

  const shippingQuote = trpc.shipping.quote.useQuery(
    { pincode: address.pincode },
    { enabled: hasValidPincode, retry: false },
  );

  const isLocalSuratDelivery =
    shippingQuote.data?.deliveryMethod === "local_delivery";

  useEffect(() => {
    if (
      shippingQuote.data &&
      !isLocalSuratDelivery &&
      paymentMethod === "cod"
    ) {
      setPaymentMethod("razorpay");
    }
  }, [shippingQuote.data, isLocalSuratDelivery, paymentMethod]);

  const finishOrder = async (data: {
    orderNumber: string;
    totalAmount: number;
    orderId: number;
  }) => {
    await utils.customer.getMyData.invalidate();
    await utils.orders.list.invalidate();
    await utils.cart.list.invalidate();

    setOrderPlaced(true);
    setOrderNumber(data.orderNumber);

    trackEvent("purchase", {
      transaction_id: data.orderNumber,
      currency: "INR",
      value: Number(data.totalAmount),
      shipping: Number(shippingQuote.data?.shippingCost || 0),
      payment_type: paymentMethod,
      items: (cartItems || []).map((item) => ({
        item_id: String(item.productId),
        item_name: item.product?.name || "Product",
        price: Number(item.product?.basePrice || 0),
        quantity: item.quantity,
      })),
    });

    toast.success("Order placed successfully! Check WhatsApp for order details.");
  };

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: finishOrder,
    onError: (err) => toast.error(err.message),
  });

  const startRazorpay = trpc.payments.startRazorpay.useMutation();
  const verifyRazorpay = trpc.payments.verifyRazorpay.useMutation();

  const shippingCost = shippingQuote.data?.shippingCost ?? 0;
  const total = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    if (
      !address.fullName ||
      !address.phone ||
      !address.addressLine1 ||
      !address.city ||
      !address.pincode
    ) {
      toast.error("Please fill all address fields!");
      return;
    }

    if (!/^\d{6}$/.test(address.pincode)) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }

    if (!shippingQuote.data) {
      toast.error("Please wait for the delivery charge to be calculated.");
      return;
    }

    if (!shippingQuote.data.available) {
      toast.error(
        shippingQuote.data.message ||
          "Delivery is not available for this pincode.",
      );
      return;
    }

    const fullAddress = `${address.fullName}, ${address.phone}\n${address.addressLine1}${
      address.addressLine2 ? ", " + address.addressLine2 : ""
    }\n${address.city}, ${address.state} - ${address.pincode}`;

    trackEvent("begin_checkout", {
      currency: "INR",
      value: total,
      item_count: cartItems?.length || 0,
      payment_type: paymentMethod,
    });

    if (paymentMethod === "cod") {
      createOrder.mutate({
        shippingAddress: fullAddress,
        paymentMethod: "cod",
        shippingPincode: address.pincode,
        shippingCost: Math.round(shippingCost),
        customerPhone: address.phone,
      });
      return;
    }

    setIsOpeningPayment(true);

    try {
      const checkoutLoaded = await loadRazorpayCheckout();

      if (!checkoutLoaded || !window.Razorpay) {
        throw new Error(
          "Online payment could not load. Please check your internet and try again.",
        );
      }

      const paymentOrder = await startRazorpay.mutateAsync({
        shippingAddress: fullAddress,
        shippingPincode: address.pincode,
        customerPhone: address.phone,
      });

      const razorpay = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Patel Electricals",
        description: `Order ${paymentOrder.orderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        webview_intent: true,
        prefill: {
          name: address.fullName,
          contact: address.phone,
        },
        notes: {
          order_number: paymentOrder.orderNumber,
        },
        theme: {
          color: "#243b5a",
        },

        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },

        handler: async (response: RazorpayPaymentResponse) => {
          try {
            const completedOrder = await verifyRazorpay.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              shippingAddress: fullAddress,
              shippingPincode: address.pincode,
            });

            await finishOrder(completedOrder);
          } catch (error: any) {
            toast.error(
              error?.message ||
                "Payment received but verification is pending. Please contact us with your payment ID.",
            );
          } finally {
            setIsOpeningPayment(false);
          }
        },

        modal: {
          ondismiss: () => setIsOpeningPayment(false),
        },
      });

      razorpay.on("payment.failed", () => {
        setIsOpeningPayment(false);
        toast.error(
          "Payment was not completed. No online order has been confirmed.",
        );
      });

      razorpay.open();
    } catch (error: any) {
      setIsOpeningPayment(false);
      toast.error(
        error?.message ||
          "Online payment could not be started. Please try again.",
      );
    }
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">
            Add products to checkout
          </p>
          <Button onClick={() => setLocation("/products")}>
            Continue Shopping
          </Button>
        </div>

        <Footer />
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            Order Placed Successfully!
          </h2>

          <p className="text-muted-foreground mb-2">
            Order Number:{" "}
            <span className="font-mono font-bold text-foreground">
              {orderNumber}
            </span>
          </p>

          <p className="text-muted-foreground mb-6">
            Your order has been created. Admin will review and confirm it soon.
          </p>

          <div className="flex gap-3 justify-center">
            <Button onClick={() => setLocation("/customer/dashboard")}>
              View My Orders
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation("/products")}
            >
              Continue Shopping
            </Button>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-[oklch(0.22_0.05_260)] py-8">
        <div className="container">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white mb-2"
            onClick={() => setLocation("/cart")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>

          <h1 className="text-2xl font-bold text-white">Checkout</h1>
        </div>
      </div>

      <div className="container py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="Your name"
                      value={address.fullName}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          fullName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      placeholder="10-digit phone"
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Address Line 1 *</Label>
                  <Input
                    placeholder="Street address"
                    value={address.addressLine1}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        addressLine1: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Address Line 2 (Optional)</Label>
                  <Input
                    placeholder="Apartment, suite, etc."
                    value={address.addressLine2}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        addressLine2: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      placeholder="e.g. Surat"
                      value={address.city}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>State *</Label>
                    <Input
                      placeholder="e.g. Gujarat"
                      value={address.state}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          state: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Pincode *</Label>
                    <Input
                      placeholder="6-digit pincode"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          pincode: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Order Items ({cartItems.length})
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-white border border-border rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt=""
                          className="h-full w-full object-contain object-center p-1"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product?.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity} × ₹
                        {Number(item.product?.basePrice || 0).toLocaleString()}
                      </p>
                    </div>

                    <p className="font-semibold text-sm">
                      ₹
                      {(
                        Number(item.product?.basePrice || 0) * item.quantity
                      ).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {isLocalSuratDelivery && (
                  <label
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />

                    <div>
                      <p className="font-medium">Cash on Delivery (COD)</p>
                      <p className="text-xs text-muted-foreground">
                        Available with local Surat delivery
                      </p>
                    </div>
                  </label>
                )}

                <label
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => setPaymentMethod("razorpay")}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                  />

                  <div>
                    <p className="font-medium">Pay Online</p>
                    <p className="text-xs text-muted-foreground">
                      UPI, Google Pay, PhonePe, cards and net-banking
                    </p>
                  </div>
                </label>

                {!isLocalSuratDelivery &&
                  hasValidPincode &&
                  shippingQuote.data?.available && (
                    <p className="text-xs text-muted-foreground">
                      For deliveries outside Surat, payment is online only.
                    </p>
                  )}
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={
                createOrder.isPending ||
                startRazorpay.isPending ||
                verifyRazorpay.isPending ||
                isOpeningPayment
              }
            >
              {createOrder.isPending ||
              startRazorpay.isPending ||
              verifyRazorpay.isPending ||
              isOpeningPayment
                ? "Processing..."
                : paymentMethod === "razorpay"
                  ? `Pay Online - ₹${Math.round(total).toLocaleString()}`
                  : `Place Order - ₹${Math.round(total).toLocaleString()}`}
            </Button>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Items ({cartItems.length})
                  </span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Shipping</span>

                    {!hasValidPincode ? (
                      <span className="text-muted-foreground">
                        Enter a 6-digit pincode
                      </span>
                    ) : shippingQuote.isFetching ? (
                      <span className="text-muted-foreground">
                        Calculating...
                      </span>
                    ) : shippingQuote.isError ? (
                      <span className="text-destructive">
                        Unable to check delivery
                      </span>
                    ) : !shippingQuote.data?.available ? (
                      <span className="text-destructive">
                        {shippingQuote.data?.message ||
                          "Delivery unavailable"}
                      </span>
                    ) : shippingQuote.data?.isFreeShipping ? (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        FREE DELIVERY
                      </Badge>
                    ) : (
                      <span>₹{Math.round(shippingCost).toLocaleString()}</span>
                    )}
                  </div>

                  {shippingQuote.data?.available && (
                    <p className="text-xs text-muted-foreground">
                      {shippingQuote.data.deliveryMethod === "local_delivery"
                        ? "Local Surat delivery - delivered by our team"
                        : `${shippingQuote.data.courierName || "Courier"} delivery${
                            shippingQuote.data.estimatedDelivery
                              ? ` · Estimated: ${shippingQuote.data.estimatedDelivery}`
                              : ""
                          }`}
                    </p>
                  )}

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
