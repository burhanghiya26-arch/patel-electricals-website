import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Zap, ShoppingCart, Phone, Mail, MapPin, Menu, X, MessageCircle } from "lucide-react";
import { useState } from "react";

const WHATSAPP_NUMBER = "918780657095";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Patel%20Electricals%2C%20I%20need%20help%20with%20spare%20parts`;

export default function Navbar() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-[oklch(0.22_0.05_260)] text-white text-sm">
        <div className="container flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> 8780657095
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="h-3 w-3" /> burhanghiya26@gmail.com
            </span>
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

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" className="font-medium" onClick={() => setLocation("/")}>Home</Button>
            <Button variant="ghost" className="font-medium" onClick={() => setLocation("/products")}>Products</Button>
            <Button variant="ghost" className="font-medium relative" onClick={() => setLocation("/cart")}>
              <ShoppingCart className="h-4 w-4 mr-1.5" /> Cart
            </Button>
          </div>

          <div className="flex items-center gap-2">

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start font-medium" onClick={() => { setLocation("/"); setMobileMenuOpen(false); }}>Home</Button>
            <Button variant="ghost" className="w-full justify-start font-medium" onClick={() => { setLocation("/products"); setMobileMenuOpen(false); }}>Products</Button>
            <Button variant="ghost" className="w-full justify-start font-medium" onClick={() => { setLocation("/cart"); setMobileMenuOpen(false); }}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Cart
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open(WHATSAPP_URL, "_blank")}>
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Support
            </Button>
          </div>
        )}
      </nav>

      {/* WhatsApp Floating Button */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-all hover:scale-110"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </>
  );
}
