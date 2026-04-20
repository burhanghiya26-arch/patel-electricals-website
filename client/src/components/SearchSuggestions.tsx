import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";

interface SearchSuggestionsProps {
  onSelect?: (productId: number, productName: string) => void;
  placeholder?: string;
}

export default function SearchSuggestions({
  onSelect,
  placeholder = "Search products...",
}: SearchSuggestionsProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { data: suggestions } = trpc.products.search.useQuery(
    { query },
    { enabled: query.length > 1 }
  );

  const filteredSuggestions = suggestions?.slice(0, 8) || [];

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const selected = filteredSuggestions[highlightedIndex];
          if (onSelect) {
            onSelect(selected.id, selected.name);
          }
          setQuery("");
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelect = (product: any) => {
    if (onSelect) {
      onSelect(product.id, product.name);
    }
    setQuery("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => query.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && query.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          {filteredSuggestions.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {filteredSuggestions.map((product: any, index: number) => (
                <li key={product.id}>
                  <button
                    onClick={() => handleSelect(product)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                      index === highlightedIndex ? "bg-blue-100" : ""
                    }`}
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {product.partNumber}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                      ₹{parseFloat(product.basePrice || "0").toFixed(0)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-slate-600">
              No products found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
