import { useLocation } from "wouter";
import { useState } from "react";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, ShoppingBag, ArrowRight, Plus, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function ShoppingCart() {
  const [, setLocation] = useLocation();
  const { data: cartItems, isLoading, refetch } = trpc.cart.list.useQuery();
  const { data: inventoryData } = trpc.products.getInventory.useQuery();

  const removeFromCartMutation = trpc.cart.remove.useMutation({
    onSuccess: () => { refetch(); toast.success("Item removed"); },
  });
  const updateQuantityMutation = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => { refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const clearCartMutation = trpc.cart.clear.useMutation({
    onSuccess: () => { refetch(); toast.success("Cart cleared"); },
  });

  const cartItemsList = cartItems || [];
  let subtotal = 0;
  cartItemsList.forEach((item) => {
    if (item.product) subtotal += Number(item.product.basePrice) * item.quantity;
  });
  const total = subtotal;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-[oklch(0.22_0.05_260)] py-10">
        <div className="container">
          <h1 className="text-3xl font-bold text-white mb-2">Shopping Cart</h1>
          <p className="text-white/60">{cartItemsList.length} item(s) in your cart</p>
        </div>
      </div>

      <div className="container py-8 flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : cartItemsList.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">Add some products to get started</p>
            <Button onClick={() => setLocation("/products")}>Browse Products</Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItemsList.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.product?.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">#{item.product?.partNumber}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 border border-border rounded-md">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateQuantityMutation.mutate({ cartItemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                            disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-medium px-2">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateQuantityMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}
                            disabled={updateQuantityMutation.isPending || (inventoryData?.find(inv => inv.productId === item.productId)?.quantityInStock || 0) <= item.quantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">@ ₹{Number(item.product?.basePrice).toFixed(2)}</span>
                        {(() => {
                          const stock = inventoryData?.find(inv => inv.productId === item.productId)?.quantityInStock || 0;
                          if (stock < item.quantity) {
                            return <span className="text-xs text-destructive font-medium">Only {stock} available</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold">₹{(Number(item.product?.basePrice) * item.quantity).toFixed(2)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive mt-1"
                        onClick={() => removeFromCartMutation.mutate(item.id)}
                        disabled={removeFromCartMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setLocation("/products")}>Continue Shopping</Button>
                <Button variant="outline" className="text-destructive" onClick={() => clearCartMutation.mutate()}>Clear Cart</Button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({cartItemsList.length} items)</span>
                      <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1"></p>
                  </div>

                  <Button className="w-full" size="lg" onClick={() => setLocation("/checkout")}>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-1 pt-2">
                    <p>✓ Secure checkout</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
