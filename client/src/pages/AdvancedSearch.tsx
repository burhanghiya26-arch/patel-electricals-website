import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, Filter, X } from "lucide-react";
import { toast } from "sonner";

export default function AdvancedSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [showFilters, setShowFilters] = useState(false);
  
  const minPriceRef = useRef<HTMLInputElement>(null);
  const maxPriceRef = useRef<HTMLInputElement>(null);

  const { data: categories } = trpc.products.getCategories.useQuery();
  const { data: searchResults, isLoading, refetch } = trpc.products.search.useQuery(
    { 
      query: searchQuery, 
      categoryId: selectedCategory || undefined,
      minPrice: priceRange.min,
      maxPrice: priceRange.max
    },
    { enabled: searchQuery.length > 0 }
  );

  // Refetch when filters change
  const handleFilterChange = () => {
    if (searchQuery.length > 0) {
      refetch();
    }
  };

  // Debounce price range changes
  const [priceTimeout, setPriceTimeout] = useState<NodeJS.Timeout | null>(null);
  const handlePriceChange = (newPriceRange: typeof priceRange) => {
    setPriceRange(newPriceRange);
    if (priceTimeout) clearTimeout(priceTimeout);
    const timeout = setTimeout(() => {
      if (searchQuery.length > 0) {
        refetch();
      }
    }, 300);
    setPriceTimeout(timeout);
  };

  const filteredResults = searchResults || [];

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setPriceRange({ min: 0, max: 100000 });
    if (minPriceRef.current) minPriceRef.current.value = "0";
    if (maxPriceRef.current) maxPriceRef.current.value = "100000";
    toast.success("Filters reset");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Advanced Search</h1>
          <p className="text-slate-600">Find spare parts with filters</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by part name, number, or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(null);
                      toast.success("Category filter cleared");
                      handleFilterChange();
                    }}
                  >
                    All Categories
                  </Button>
                  {categories?.map((cat: any) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        toast.success(`Filtered by ${cat.name}`);
                        handleFilterChange();
                      }}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Price Range
                </label>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-slate-600 mb-1 block">Min</label>
                    <input
                      ref={minPriceRef}
                      type="number"
                      defaultValue={0}
                      onBlur={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        handlePriceChange({ ...priceRange, min: isNaN(val) ? 0 : val });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-600 mb-1 block">Max</label>
                    <input
                      ref={maxPriceRef}
                      type="number"
                      defaultValue={100000}
                      onBlur={(e) => {
                        const val = e.target.value === '' ? 100000 : parseInt(e.target.value, 10);
                        handlePriceChange({ ...priceRange, max: isNaN(val) ? 100000 : val });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div>
          {searchQuery && (
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                Found <span className="font-semibold">{filteredResults.length}</span> results
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Searching...</p>
            </div>
          ) : searchQuery && filteredResults.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">No products found matching your criteria</p>
              </CardContent>
            </Card>
          ) : searchQuery ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((product: any) => (
                <Card key={product.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h3 className="font-semibold text-slate-900 mb-2">{product.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{product.partNumber}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-blue-600">
                        ₹{parseFloat(product.basePrice || "0").toFixed(2)}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {product.stockQty > 0 ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </div>

                    <Button className="w-full">View Details</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-lg">
              <CardContent className="py-12 text-center">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Enter a search query to find products</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
