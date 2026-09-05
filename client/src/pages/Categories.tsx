import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Package } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Categories() {
  const [, setLocation] = useLocation();
  const { data: categories, isLoading } = trpc.products.getCategories.useQuery();
  const visibleCategories = categories?.filter(category => category.name !== "General") || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-[oklch(0.22_0.05_260)] py-10">
        <div className="container text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Shop by Category</h1>
          <p className="text-white/70">Choose a category to see matching electrical spare parts</p>
        </div>
      </div>

      <main className="container py-10 flex-1">
        <Button variant="outline" className="mb-7" onClick={() => setLocation("/products")}>
          <Package className="h-4 w-4 mr-2" /> View All Products
        </Button>

        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : visibleCategories.length > 0 ? (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCategories.map(category => (
              <Card
                key={category.id}
                className="group cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                onClick={() => setLocation(`/products?category=${encodeURIComponent(category.name)}`)}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">📦</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-lg">{category.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{category.description || "Browse products in this category"}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">No categories available yet.</div>
        )}
      </main>

      <Footer />
    </div>
  );
}
