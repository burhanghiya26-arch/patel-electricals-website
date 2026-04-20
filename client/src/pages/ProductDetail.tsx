import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, AlertCircle, CheckCircle, Package, ArrowLeft, MessageCircle, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SocialShareButtons } from "@/components/SocialShareButtons";



export default function ProductDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/products/:id");
  const productId = params?.id ? parseInt(params.id) : 0;
  const [quantity, setQuantity] = useState(1);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const { data: productData, isLoading } = trpc.products.getById.useQuery(productId, { enabled: productId > 0 });
  const { data: reviews } = trpc.reviews.getProductReviews.useQuery(productId, { enabled: productId > 0 });
  const { data: rating } = trpc.reviews.getProductRating.useQuery(productId, { enabled: productId > 0 });
  const { user } = useAuth();

  const utils = trpc.useUtils();
  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Product added to cart!");
      utils.cart.list.invalidate();
      setQuantity(1);
      setSelectedColor("");
      setSelectedSize("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!productData?.product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
          <Button variant="outline" onClick={() => setLocation("/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Catalog
          </Button>
        </div>
      </div>
    );
  }

  const { product, inventory } = productData;
  const basePrice = Number(product.basePrice);
  const totalPrice = basePrice * quantity;
  const discountedPrice = totalPrice;
  const maxQuantity = inventory?.quantityInStock || 0;
  const isQuantityExceeded = quantity > maxQuantity;

  let compatibleModels: string[] = [];
  try {
    if (product.compatibleModels) compatibleModels = JSON.parse(product.compatibleModels as string);
  } catch {}

  let alternatePartNumbers: string[] = [];
  try {
    if (product.alternatePartNumbers) alternatePartNumbers = JSON.parse(product.alternatePartNumbers as string);
  } catch {}

  let colorOptions: string[] = [];
  try {
    if (product.colorOptions) colorOptions = JSON.parse(product.colorOptions as string);
  } catch {}

  let sizeOptions: string[] = [];
  try {
    if (product.sizeOptions) sizeOptions = JSON.parse(product.sizeOptions as string);
  } catch {}

  const isCompatible = !selectedModel || compatibleModels.includes(selectedModel);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-secondary/30">
        <div className="container py-3 flex items-center gap-2 text-sm">
          <Button variant="link" className="p-0 h-auto text-muted-foreground" onClick={() => setLocation("/")}>Home</Button>
          <span className="text-muted-foreground">/</span>
          <Button variant="link" className="p-0 h-auto text-muted-foreground" onClick={() => setLocation("/products")}>Products</Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate">{product.name}</span>
        </div>
      </div>

      <div className="container py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Product Image */}
          <div>
            <div className="bg-gradient-to-br from-secondary to-muted rounded-xl h-80 md:h-96 flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground/20" />
              )}
            </div>

            {/* Exploded View */}
            {product.explodedViewUrl && (
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-base">Exploded View Diagram</CardTitle></CardHeader>
                <CardContent>
                  <img src={product.explodedViewUrl} alt="Exploded View" className="w-full rounded-lg" />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm text-muted-foreground font-mono mb-1">Part #{product.partNumber}</p>
                  <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
                </div>
                <Badge variant={inventory?.quantityInStock ? "default" : "destructive"} className="flex-shrink-0">
                  {inventory?.quantityInStock ? `${inventory.quantityInStock} in stock` : "Out of Stock"}
                </Badge>
              </div>
              {product.description && (
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Rating Display */}
            {rating && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i <= Math.round(rating.avgRating || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold">{Number(rating.avgRating || 0).toFixed(1)} / 5</p>
                      <p className="text-sm text-muted-foreground">{rating.totalReviews || 0} reviews</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold">₹{basePrice.toFixed(2)}</span>

                </div>
                {inventory?.minimumOrderQuantity && (
                  <p className="text-sm text-amber-600 font-medium">
                    Minimum order: {inventory.minimumOrderQuantity} units
                  </p>
                )}
              </CardContent>
            </Card>



            {/* Compatibility Checker */}
            {compatibleModels.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Compatibility Checker</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                  >
                    <option value="">Select your model...</option>
                    {compatibleModels.map((model: string) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  {selectedModel && (
                    <Alert className={isCompatible ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}>
                      <div className="flex items-center gap-2">
                        {isCompatible ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertDescription>
                          {isCompatible ? "Compatible with your model!" : "Not compatible with this model."}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Alternate Part Numbers */}
            {alternatePartNumbers.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Cross-Reference Part Numbers</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {alternatePartNumbers.map((part: string) => (
                      <Badge key={part} variant="secondary" className="font-mono">{part}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Color & Size Options */}
            {(colorOptions.length > 0 || sizeOptions.length > 0) && (
              <Card>
                <CardHeader><CardTitle className="text-base">Available Options</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {colorOptions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color: string) => (
                          <Badge key={color} variant={selectedColor === color ? "default" : "outline"} className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => setSelectedColor(color)}>{color}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {sizeOptions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Size</label>
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((size: string) => (
                          <Badge key={size} variant={selectedSize === size ? "default" : "outline"} className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => setSelectedSize(size)}>{size}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Add to Cart */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</Button>
                    <Input 
                      type="number" 
                      min="1" 
                      max={maxQuantity}
                      value={quantity} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuantity(Math.min(Math.max(1, val), maxQuantity));
                      }} 
                      className={`w-24 text-center ${isQuantityExceeded ? 'border-red-500 border-2' : ''}`}
                    />
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.min(quantity + 1, maxQuantity))} disabled={quantity >= maxQuantity}>+</Button>
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.min(quantity + 10, maxQuantity))} disabled={quantity >= maxQuantity}>+10</Button>
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.min(quantity + 50, maxQuantity))} disabled={quantity >= maxQuantity}>+50</Button>
                  </div>
                  {isQuantityExceeded && (
                    <p className="text-sm text-red-600 font-medium">Only {maxQuantity} units available</p>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total ({quantity} units):</span>
                    <span>₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="flex-1"
                    disabled={!inventory?.quantityInStock || addToCartMutation.isPending || isQuantityExceeded}
                    onClick={() => addToCartMutation.mutate({ productId, quantity, selectedColor: selectedColor || undefined, selectedSize: selectedSize || undefined })}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {addToCartMutation.isPending ? "Adding..." : isQuantityExceeded ? "Quantity Exceeds Stock" : "Add to Cart"}
                  </Button>
                  <WhatsAppButton
                    message={`Hi, I want to enquire about ${product.name} (Part #${product.partNumber}), Price: ₹${Number(product.basePrice).toLocaleString()}, Qty: ${quantity}`}
                    showText={true}
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <SocialShareButtons
                    title={product.name}
                    description={`Check out ${product.name} (Part #${product.partNumber}) at Patel Electricals - ₹${Number(product.basePrice).toLocaleString()}`}
                    showText={true}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="font-semibold">{review.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground">{review.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
