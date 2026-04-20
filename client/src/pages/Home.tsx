import { Button } from "@/components/ui/button";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Zap, ShoppingCart, Search, Package, Truck, Shield, Phone, Mail, MapPin, ArrowRight, TrendingUp, Clock, MessageCircle, Loader2, Filter, Sliders } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WhatsAppButton, WhatsAppFloatingButton } from "@/components/WhatsAppButton";
import SearchSuggestions from "@/components/SearchSuggestions";

const WHATSAPP_NUMBER = "918780657095";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Patel%20Electricals%2C%20I%20need%20help%20with%20spare%20parts`;

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const { data: categories, isLoading: catsLoading } = trpc.products.getCategories.useQuery();
  const { data: generalProducts, isLoading: generalLoading } = trpc.products.getCategories.useQuery();
  const generalCategoryId = React.useMemo(() => categories?.find((c: any) => c.name === "General")?.id, [categories]);
  const { data: generalCategoryProducts } = trpc.products.getByCategory.useQuery(generalCategoryId || 0, { enabled: !!generalCategoryId });

  // Fallback stats
  const displayStats = [
    { label: "Products", value: "5000+", icon: Package },
    { label: "Dealers", value: "500+", icon: Truck },
    { label: "Orders", value: "10000+", icon: ShoppingCart },
    { label: "Years", value: "15+", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-[oklch(0.22_0.05_260)] text-white text-sm">
        <div className="container flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> 8780657095</span>
            <span className="hidden sm:flex items-center gap-1"><Mail className="h-3 w-3" /> burhanghiya26@gmail.com</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="hidden sm:inline">Udhana, Surat - 394210</span>
            <span className="sm:hidden">Surat</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[oklch(0.22_0.05_260)]">
              <Zap className="h-5 w-5 text-[oklch(0.65_0.15_85)]" />
            </div>
            <div>
              <span className="text-lg font-bold leading-none">Patel Electricals</span>
              <span className="block text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Wholesale Spare Parts</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <button className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors" onClick={() => setLocation("/")}>Home</button>
            <button className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors" onClick={() => setLocation("/products")}>Products</button>
            <button className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors flex items-center gap-1.5" onClick={() => setLocation("/cart")}><ShoppingCart className="h-4 w-4" />Cart</button>
          </div>

          <div className="flex items-center gap-2"></div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.05_260)] via-[oklch(0.28_0.06_260)] to-[oklch(0.22_0.05_260)]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 25% 25%, oklch(0.65 0.15 85) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="container relative py-20 md:py-28">
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Wholesale <span className="text-[oklch(0.65_0.15_85)]">Electrical</span> Spare Parts
              </h1>

              <div className="mb-6 max-w-md">
                <SearchSuggestions
                  placeholder="Search parts..."
                  onSelect={(productId, productName) => {
                    setLocation(`/products/${productId}`);
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <WhatsAppButton
                  message="Hi Patel Electricals, I need help with spare parts"
                  showText={true}
                />
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Shop by Category</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Browse our extensive range of electrical spare parts organized by category</p>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {catsLoading ? (
              <div className="col-span-full flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : categories && categories.length > 0 ? (
              categories.filter((cat: any) => cat.name !== "General").map((cat: any) => (
                <Card key={cat.id} className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300" onClick={() => setLocation(`/products?category=${encodeURIComponent(cat.name)}`)}>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">📦</div>
                    <h3 className="font-semibold text-sm mb-1">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground">{cat.description || "Parts"}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground">No categories available</div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products from General Category */}
      {generalCategoryProducts && generalCategoryProducts.length > 0 && (
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Featured Products</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Our most popular electrical spare parts available for immediate delivery</p>
            </div>
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {generalCategoryProducts.slice(0, 8).map((product: any) => (
                <Card key={product.id} className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer" onClick={() => setLocation(`/products/${product.id}`)}>
                  <CardContent className="p-4">
                    {product.image && (
                      <div className="mb-3 h-32 bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">Part: {product.partNumber}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[oklch(0.65_0.15_85)]">₹{product.basePrice}</span>
                      <Badge variant="outline" className="text-xs">MOQ: {product.minOrderQty}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shipping Location Banner */}
      <section className="bg-[oklch(0.65_0.15_85)]/10 border-b border-[oklch(0.65_0.15_85)]/30 py-4">
        <div className="container">
          <div className="flex items-center justify-center gap-2 text-center">
            <MapPin className="h-5 w-5 text-[oklch(0.65_0.15_85)] flex-shrink-0" />
            <p className="text-sm font-semibold text-[oklch(0.65_0.15_85)]">Shipping Available Only in Surat, Gujarat</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-secondary/50">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Why Dealers Choose Us</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Everything you need for your wholesale electrical parts business</p>
          </div>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Search, title: "Smart Part Search", desc: "Find parts by number, model, or brand. Instant live search results." },
              { icon: Shield, title: "100% Genuine Parts", desc: "All products sourced directly from authorized manufacturers and distributors." },
              { icon: Truck, title: "Fast Delivery", desc: "Quick dispatch for in-stock items. Real-time order tracking available." },
              { icon: MessageCircle, title: "WhatsApp Support", desc: "Quick assistance via WhatsApp. Get quotes, track orders, and resolve issues." },
              { icon: Package, title: "Bulk Order Management", desc: "Easy bulk ordering system with quotation requests and order history." },
              { icon: Sliders, title: "Advanced Filters", desc: "Filter by category, price range, and specifications. Clear filters with one click." },
            ].map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => feature.title === "Advanced Filters" ? setLocation("/search") : null}>
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Grid Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayStats.map((stat: any) => (
              <div key={stat.label} className="bg-secondary/50 rounded-xl p-6 border border-border text-center">
                <stat.icon className="h-8 w-8 text-[oklch(0.65_0.15_85)] mb-3 mx-auto" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-16 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.22_0.05_260)] to-[oklch(0.30_0.06_260)]" />
        <div className="container relative text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Start Ordering?</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">Register as a dealer today and get access to wholesale prices, bulk discounts, and fast delivery.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-[oklch(0.65_0.15_85)] text-[oklch(0.15_0.04_260)] hover:bg-[oklch(0.70_0.15_85)] font-semibold px-8" onClick={() => setLocation("/products")}>
              Browse Products <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <WhatsAppButton
              message="Hi Patel Electricals, I'm interested in your products"
              showText={true}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[oklch(0.18_0.04_260)] text-white pt-12 pb-6">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[oklch(0.65_0.15_85)]">
                  <Zap className="h-4 w-4 text-[oklch(0.15_0.04_260)]" />
                </div>
                <span className="font-bold">Patel Electricals</span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">Your trusted wholesale partner for electrical spare parts since 2010.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[oklch(0.65_0.15_85)]">Quick Links</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="/products" className="hover:text-white transition-colors">All Products</a></li>
                <li><a href="/products" className="hover:text-white transition-colors">New Arrivals</a></li>
                <li><a href="/products" className="hover:text-white transition-colors">Best Sellers</a></li>
                <li><a href="/products" className="hover:text-white transition-colors">Bulk Orders</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[oklch(0.65_0.15_85)]">Support</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Shipping Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Return Policy</a></li>

                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[oklch(0.65_0.15_85)]">Contact Us</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>8780657095</span></li>
                <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>burhanghiya26@gmail.com</span></li>
                <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Udhana Asha Nagar, near Madhi ni Khamni, Surat - 394210</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/40">&copy; 2026 Patel Electricals. All rights reserved.</p>

          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <WhatsAppFloatingButton message="Hi Patel Electricals, I need help with spare parts" />
    </div>
  );
}
