import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, ShoppingCart, Grid3X3, List, Package, FileText, Sliders } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ProductCatalog() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [quotationProduct, setQuotationProduct] = useState<any>(null);
  const [quotationQty, setQuotationQty] = useState(1);
  
  const { data: productsData, isLoading } = trpc.products.list.useQuery({ limit: 100, offset: 0 });
  const { data: categoriesData } = trpc.products.getCategories.useQuery();
  const createQuotation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      toast.success("Quotation request sent!");
      setQuotationOpen(false);
      setQuotationProduct(null);
      setQuotationQty(1);
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Check if search query exists in URL
  const hasUrlSearch = location.includes("search=");

  // Get search query and category from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get('search');
    const urlCategory = params.get('category');
    
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    
    if (urlCategory && categoriesData) {
      // Find category by name and set its ID
      const categoryName = decodeURIComponent(urlCategory);
      const foundCat = categoriesData.find((c) => c.name === categoryName);
      if (foundCat) {
        setSelectedCategory(foundCat.id.toString());
      }
    }
  }, [location, categoriesData]);
  
  // Debounce search
  useEffect(() => {
    if (!hasUrlSearch) {
      const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, hasUrlSearch]);
  const { data: searchResults } = trpc.products.search.useQuery(
    { query: debouncedSearch, categoryId: selectedCategory !== "all" ? parseInt(selectedCategory) : undefined },
    { enabled: debouncedSearch.length > 0 }
  );

  const displayProducts = useMemo(() => {
    let products = debouncedSearch.length > 0 && searchResults ? searchResults : productsData;
    if (!products) return [];
    if (selectedCategory && selectedCategory !== "all") {
      products = products.filter((p) => String(p.categoryId) === selectedCategory);
    }
    switch (sortBy) {
      case "price-low": return [...products].sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
      case "price-high": return [...products].sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
      default: return [...products].sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [productsData, searchResults, selectedCategory, sortBy, searchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Page Header */}
      <div className="bg-[oklch(0.22_0.05_260)] py-10">
        <div className="container">
          {hasUrlSearch ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Search Results</h1>
              <p className="text-white/60">Showing products matching your search</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Product Catalog</h1>
              <p className="text-white/60">Browse our complete range of wholesale electrical spare parts</p>
            </>
          )}
        </div>
      </div>

      <div className="container py-8 flex-1">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
          {!hasUrlSearch && (
          <div className="flex flex-1 gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by part number, name, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 hidden sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setLocation("/search")}
            >
              <Sliders className="h-4 w-4" />
              Advanced Search
            </Button>
            <span className="text-sm text-muted-foreground">{displayProducts.length} products</span>
            <div className="flex border border-border rounded-md">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" className="rounded-r-none" onClick={() => setViewMode("grid")}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" className="rounded-l-none" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>Clear Filters</Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {displayProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden"
                onClick={() => setLocation(`/products/${product.id}`)}
              >
                <CardContent className="p-0">
                  <div className="h-40 bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    )}
                    <Badge className="absolute top-2 right-2" variant={product.isActive ? "default" : "destructive"}>
                      {product.isActive ? "In Stock" : "Out"}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground font-mono mb-1">#{product.partNumber}</p>
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">{product.name}</h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold">₹{Number(product.basePrice).toFixed(0)}</p>

                      </div>
                      <div className="flex gap-1">
                        <Dialog open={quotationOpen && quotationProduct?.id === product.id} onOpenChange={(open) => {
                          if (open) { setQuotationProduct(product); setQuotationOpen(true); } else { setQuotationOpen(false); }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent onClick={(e) => e.stopPropagation()}>
                            <DialogHeader><DialogTitle>Request Quotation</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div><p className="font-semibold">{product.name}</p><p className="text-sm text-muted-foreground">₹{Number(product.basePrice).toFixed(0)}</p></div>
                              <div><label className="text-sm font-medium">Quantity</label><Input type="number" min="1" value={quotationQty} onChange={(e) => setQuotationQty(Math.max(1, parseInt(e.target.value) || 1))} /></div>
                              <Button onClick={() => createQuotation.mutate({ items: [{ productId: product.id, quantity: quotationQty }] })} disabled={createQuotation.isPending}>Send Request</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0"><ShoppingCart className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setLocation(`/products/${product.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-16 w-16 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-mono">#{product.partNumber}</p>
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{product.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold">₹{Number(product.basePrice).toFixed(0)}</p>
                    <Badge variant={product.isActive ? "default" : "destructive"} className="text-xs">
                      {product.isActive ? "In Stock" : "Out"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
