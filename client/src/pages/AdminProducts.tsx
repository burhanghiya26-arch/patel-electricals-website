import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Package, AlertCircle, ImageIcon, Upload, X } from "lucide-react";

export default function AdminProducts() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.adminList.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isAuthenticated && user?.role === 'admin' }
  );
  const { data: categoriesList } = trpc.products.getCategories.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({
    partNumber: '', name: '', description: '', categoryName: 'General',
    basePrice: '', stock: '', moq: '1', imageUrl: '', productImages: [] as string[],
    colorOptions: '', sizeOptions: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productImageGallery, setProductImageGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully!");
      resetForm();
      utils.products.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated!");
      resetForm();
      utils.products.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted!");
      utils.products.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImage = trpc.upload.image.useMutation({
    onSuccess: (data) => {
      setForm(prev => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
      setUploading(false);
      toast.success("Image uploaded!");
    },
    onError: (err) => {
      setUploading(false);
      toast.error("Image upload failed: " + err.message);
    },
  });

  const uploadGalleryImage = trpc.upload.image.useMutation({
    onSuccess: (data) => {
      setProductImageGallery(prev => [...prev, data.url]);
      setForm(prev => ({ ...prev, productImages: [...prev.productImages, data.url] }));
      setUploading(false);
      toast.success("Gallery image added!");
    },
    onError: (err) => {
      setUploading(false);
      toast.error("Image upload failed: " + err.message);
    },
  });

  const resetForm = () => {
    setForm({ partNumber: '', name: '', description: '', categoryName: 'General', basePrice: '', stock: '', moq: '1', imageUrl: '', productImages: [], colorOptions: '', sizeOptions: '' });
    setImagePreview(null);
    setProductImageGallery([]);
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Full = ev.target?.result as string;
      setImagePreview(base64Full);
      setUploading(true);
      const base64Data = base64Full.split(',')[1];
      uploadImage.mutate({
        base64: base64Data,
        filename: file.name,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.partNumber || !form.name || !form.basePrice) {
      toast.error("Part Number, Name aur Price required hai!");
      return;
    }
    const price = parseFloat(form.basePrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Valid price daalo!");
      return;
    }
    const parseOptions = (str: string) => str.trim() ? str.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    if (editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        data: {
          name: form.name,
          description: form.description || undefined,
          basePrice: price,
          categoryName: form.categoryName || 'General',
          imageUrl: form.imageUrl || undefined,
          productImages: form.productImages.length > 0 ? form.productImages : undefined,
          stock: form.stock ? parseInt(form.stock) : undefined,
          moq: form.moq ? parseInt(form.moq) : undefined,
          colorOptions: parseOptions(form.colorOptions),
          sizeOptions: parseOptions(form.sizeOptions),
        },
      });
    } else {
      createProduct.mutate({
        partNumber: form.partNumber,
        name: form.name,
        description: form.description || undefined,
        categoryName: form.categoryName || 'General',
        basePrice: price,
        stock: form.stock ? parseInt(form.stock) : 0,
        moq: form.moq ? parseInt(form.moq) : 1,
        imageUrl: form.imageUrl || undefined,
        productImages: form.productImages.length > 0 ? form.productImages : undefined,
        colorOptions: parseOptions(form.colorOptions),
        sizeOptions: parseOptions(form.sizeOptions),
      });
    }
  };

  const startEdit = (product: any) => {
    setEditingProduct(product);
    const galleryImages = product.productImages && Array.isArray(product.productImages) 
      ? product.productImages.map((img: any) => typeof img === 'string' ? img : img.url)
      : [];
    setForm({
      partNumber: product.partNumber,
      name: product.name,
      description: product.description || '',
      categoryName: product.categoryName || 'General',
      basePrice: String(Number(product.basePrice)),
      stock: String(product.inventory?.quantityInStock || 0),
      moq: String(product.inventory?.minimumOrderQuantity || 1),
      imageUrl: product.imageUrl || '',
      productImages: galleryImages,
      colorOptions: product.colorOptions && Array.isArray(product.colorOptions) ? product.colorOptions.join(', ') : '',
      sizeOptions: product.sizeOptions && Array.isArray(product.sizeOptions) ? product.sizeOptions.join(', ') : '',
    });
    setImagePreview(product.imageUrl || null);
    setProductImageGallery(galleryImages);
    setShowForm(true);
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full"><CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Admin privileges required.</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/products" />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">{products?.length || 0} products in catalog</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Add/Edit Product Form */}
        {showForm && (
          <Card className="mb-8 border-primary/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>{editingProduct ? "Edit Product" : "Add New Product"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Part Number *</Label>
                  <Input
                    placeholder="e.g. FAN-001"
                    value={form.partNumber}
                    onChange={(e) => setForm(prev => ({ ...prev, partNumber: e.target.value }))}
                    disabled={!!editingProduct}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    placeholder="Type category name e.g. Fans, Motors, Switches"
                    value={form.categoryName}
                    onChange={(e) => setForm(prev => ({ ...prev, categoryName: e.target.value }))}
                    list="category-suggestions"
                    className="mt-1"
                  />
                  <datalist id="category-suggestions">
                    {categoriesList?.map((cat) => (
                      <option key={cat.id} value={cat.name} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground mt-1">Type any category - new ones will be created automatically</p>
                </div>
              </div>

              <div>
                <Label>Product Name *</Label>
                <Input
                  placeholder="e.g. Havells Ceiling Fan Motor"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Product description..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Base Price (₹) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="950"
                    value={form.basePrice}
                    onChange={(e) => setForm(prev => ({ ...prev, basePrice: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Stock Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={form.stock}
                    onChange={(e) => setForm(prev => ({ ...prev, stock: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Min Order Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={form.moq}
                    onChange={(e) => setForm(prev => ({ ...prev, moq: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Color Options</Label>
                  <Input
                    placeholder="e.g. Red, Blue, Green (comma-separated)"
                    value={form.colorOptions}
                    onChange={(e) => setForm(prev => ({ ...prev, colorOptions: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty if no color options</p>
                </div>
                <div>
                  <Label>Size Options</Label>
                  <Input
                    placeholder="e.g. S, M, L, XL (comma-separated)"
                    value={form.sizeOptions}
                    onChange={(e) => setForm(prev => ({ ...prev, sizeOptions: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty if no size options</p>
                </div>
              </div>

              {/* Primary Image Upload */}
              <div>
                <Label>Primary Product Image</Label>
                <div className="mt-2 flex items-start gap-4">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setForm(prev => ({ ...prev, imageUrl: '' }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full h-6 w-6 flex items-center justify-center text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs">Uploading...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-32 w-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors flex-shrink-0"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground text-center">Click to upload<br/>image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Or paste Image URL</Label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={form.imageUrl}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, imageUrl: e.target.value }));
                        if (e.target.value) setImagePreview(e.target.value);
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Product Gallery Images */}
              <div>
                <Label>Product Gallery (Add 2-3 or more images)</Label>
                <p className="text-xs text-muted-foreground mb-2">Upload additional product images for gallery view</p>
                <div className="flex flex-wrap gap-3 mb-3">
                  {productImageGallery.map((img, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img
                        src={img}
                        alt={`Gallery ${idx + 1}`}
                        className="h-24 w-24 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          const newGallery = productImageGallery.filter((_, i) => i !== idx);
                          setProductImageGallery(newGallery);
                          setForm(prev => ({ ...prev, productImages: newGallery }));
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center text-xs hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Image must be less than 5MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const base64Full = ev.target?.result as string;
                          setUploading(true);
                          const base64Data = base64Full.split(',')[1];
                          uploadGalleryImage.mutate({
                            base64: base64Data,
                            filename: file.name,
                            contentType: file.type,
                          });
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }}
                    className="h-24 w-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center">Add image</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{productImageGallery.length} images added</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={createProduct.isPending || updateProduct.isPending || uploading}>
                  {createProduct.isPending || updateProduct.isPending ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                </Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>
        ) : !products || products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your first product.</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add First Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Product Image */}
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{product.partNumber}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">₹{Number(product.basePrice).toLocaleString()}</span>
                        <span>Stock: {product.inventory?.quantityInStock ?? 0}</span>
                        <span>MOQ: {product.inventory?.minimumOrderQuantity ?? 1}</span>
                        <Badge variant="secondary" className="text-xs">{product.categoryName}</Badge>
                        {product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-blue-50">📸 {product.productImages.length} gallery images</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => startEdit(product)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          if (confirm("Delete this product?")) {
                            deleteProduct.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
