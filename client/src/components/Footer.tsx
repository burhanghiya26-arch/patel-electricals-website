import { Zap, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
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
            <p className="text-sm text-white/50 leading-relaxed">
              Your trusted wholesale partner for electrical spare parts since 2010.
            </p>
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
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>8780657095</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>burhanghiya26@gmail.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Udhana Asha Nagar, near Madhi ni Khamni, Surat - 394210</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">&copy; 2026 Patel Electricals. All rights reserved.</p>

        </div>
      </div>
    </footer>
  );
}
