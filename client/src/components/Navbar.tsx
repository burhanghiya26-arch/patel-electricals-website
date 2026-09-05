import { useLocation } from "wouter";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCustomer } from "@/contexts/CustomerContext";
import { trpc } from "@/lib/trpc";

export default function Navbar() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const { user, isLoggedIn, refresh } = useCustomer();
const { data: categories } = trpc.products.getCategories.useQuery();

const logoutMutation = trpc.customer.logoutSession.useMutation({
  onSuccess: () => {
    refresh();
    setLocation("/");
  },
});

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
            <details className="relative">
              <summary className="list-none cursor-pointer hover:text-blue-600 font-medium flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                Categories <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute left-0 top-full mt-3 w-56 max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                <button onClick={() => setLocation("/products")} className="block w-full rounded px-3 py-2 text-left text-sm font-medium hover:bg-gray-100">All Products</button>
                {categories?.filter((category) => category.name !== "General").map((category) => (
                  <button key={category.id} onClick={() => setLocation(`/products?category=${encodeURIComponent(category.name)}`)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100">
                    {category.name}
                  </button>
                ))}
              </div>
            </details>
            <button onClick={() => setLocation("/cart")} className="hover:text-blue-600 font-medium">Cart</button>
            <div className="border-l border-gray-300 h-6"></div>
            {isLoggedIn ? (
  <>
    <button
      onClick={() => setLocation("/customer/dashboard")}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
    >
      My Account
    </button>

    <button
      onClick={() => logoutMutation.mutate()}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium"
    >
      Logout
    </button>
  </>
) : (
  <button
    onClick={() => setLocation("/customer/login")}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
  >
    Customer Login
  </button>
)}
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
            <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Categories</p>
            <button onClick={() => { setLocation("/products"); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 hover:bg-gray-200 rounded font-medium">All Products</button>
            {categories?.filter((category) => category.name !== "General").map((category) => (
              <button key={category.id} onClick={() => { setLocation(`/products?category=${encodeURIComponent(category.name)}`); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 hover:bg-gray-200 rounded">
                {category.name}
              </button>
            ))}
            <button 
              onClick={() => { setLocation("/cart"); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 px-3 hover:bg-gray-200 rounded font-medium"
            >
              Cart
            </button>
            <div className="border-t border-gray-300 my-2"></div>
            {isLoggedIn ? (
  <>
    <button
      onClick={() => {
        setLocation("/customer/dashboard");
        setMobileMenuOpen(false);
      }}
      className="block w-full text-left py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
    >
      My Account
    </button>

    <button
      onClick={() => {
        logoutMutation.mutate();
        setMobileMenuOpen(false);
      }}
      className="block w-full text-left py-2 px-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
    >
      Logout
    </button>
  </>
) : (
  <button
    onClick={() => {
      setLocation("/customer/login");
      setMobileMenuOpen(false);
    }}
    className="block w-full text-left py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
  >
    Customer Login
  </button>
)}
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
