import { useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Info Bar */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex justify-between">
          <span>📞 8780657095</span>
          <span>📍 Surat, Gujarat</span>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer font-bold text-lg"
            onClick={() => setLocation("/")}
          >
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-yellow-500 font-bold">⚡</div>
            <span className="hidden sm:inline">Patel Electricals</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setLocation("/")} className="hover:text-blue-600 font-medium">Home</button>
            <button onClick={() => setLocation("/products")} className="hover:text-blue-600 font-medium">Products</button>
            <button onClick={() => setLocation("/cart")} className="hover:text-blue-600 font-medium">Cart</button>
            <div className="border-l border-gray-300 h-6"></div>
            <button onClick={() => setLocation("/customer/login")} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">
              Customer Login
            </button>
            <button onClick={() => setLocation("/admin/login")} className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-black font-medium">
              Admin
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-50 border-t border-gray-200 p-4 space-y-2">
            <button 
              onClick={() => { setLocation("/"); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 px-3 hover:bg-gray-200 rounded font-medium"
            >
              Home
            </button>
            <button 
              onClick={() => { setLocation("/products"); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 px-3 hover:bg-gray-200 rounded font-medium"
            >
              Products
            </button>
            <button 
              onClick={() => { setLocation("/cart"); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 px-3 hover:bg-gray-200 rounded font-medium"
            >
              Cart
            </button>
            <div className="border-t border-gray-300 my-2"></div>
            <button 
              onClick={() => { setLocation("/customer/login"); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Customer Login
            </button>
            <button 
              onClick={() => { setLocation("/admin/login"); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 px-3 bg-slate-900 text-white rounded hover:bg-black font-medium"
            >
              Admin Login
            </button>
          </div>
        )}
      </nav>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/918780657095"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl hover:bg-green-600 shadow-lg"
      >
        💬
      </a>
    </>
  );
}
