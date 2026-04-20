import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { useState } from "react";
import { AlertTriangle, Package, TrendingDown, Plus, Minus, RefreshCw } from "lucide-react";

export default function AdminInventory() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'purchase' | 'sale' | 'adjustment' | 'return' | 'damage'>('adjustment');
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const { data: inventory, isLoading, refetch } = trpc.admin.inventory.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const { data: lowStockSummary } = trpc.admin.lowStockSummary.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const { data: movementHistory } = trpc.admin.inventoryMovementHistory.useQuery({ productId: selectedProduct || undefined, limit: 20 }, { enabled: isAuthenticated && user?.role === 'admin' && !!selectedProduct });
  const adjustMutation = trpc.admin.adjustInventory.useMutation();
  const updateReorderMutation = trpc.admin.updateReorderLevel.useMutation();

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full"><CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </CardContent></Card>
      </div>
    );
  }

  const handleAdjustInventory = async () => {
    if (!selectedProduct || !adjustmentQty) return;
    try {
      await adjustMutation.mutateAsync({
        productId: selectedProduct,
        quantityChange: parseInt(adjustmentQty) * (adjustmentType === 'sale' ? -1 : 1),
        movementType: adjustmentType,
        reason: adjustmentReason,
      });
      setAdjustmentQty("");
      setAdjustmentReason("");
      refetch();
    } catch (error) {
      console.error("Failed to adjust inventory:", error);
    }
  };

  const filteredInventory = inventory?.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedProductData = inventory?.find(i => i.productId === selectedProduct);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/inventory" />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">Inventory Management</h1>
        <p className="text-muted-foreground mb-8">Track and manage product stock levels</p>

        {/* Low Stock Summary */}
        {lowStockSummary && (
          <div className="grid gap-4 grid-cols-3 mb-8">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{lowStockSummary.total}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-sm text-red-700 font-medium">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{lowStockSummary.critical}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm text-amber-700 font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{lowStockSummary.low}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Inventory List */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Products</h2>
                <input
                  type="text"
                  placeholder="Search by name or part number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-4"
                />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : filteredInventory.length === 0 ? (
                    <p className="text-muted-foreground">No products found</p>
                  ) : (
                    filteredInventory.map((item) => (
                      <div
                        key={item.productId}
                        onClick={() => setSelectedProduct(item.productId)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedProduct === item.productId
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">{item.partNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              item.status === 'out_of_stock' ? 'text-red-600' :
                              item.status === 'low_stock' ? 'text-amber-600' :
                              'text-green-600'
                            }`}>
                              {item.quantityInStock} units
                            </p>
                            <p className="text-xs text-muted-foreground">Reorder: {item.reorderLevel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Adjustment Panel */}
          {selectedProductData && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Product Details</h2>
                  <div className="space-y-3 text-sm mb-6">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedProductData.productName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Part Number</p>
                      <p className="font-medium">{selectedProductData.partNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Stock</p>
                      <p className={`text-lg font-bold ${
                        selectedProductData.status === 'out_of_stock' ? 'text-red-600' :
                        selectedProductData.status === 'low_stock' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {selectedProductData.quantityInStock} units
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reorder Level</p>
                      <p className="font-medium">{selectedProductData.reorderLevel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">MOQ</p>
                      <p className="font-medium">{selectedProductData.minimumOrderQuantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Adjust Stock</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <select
                        value={adjustmentType}
                        onChange={(e) => setAdjustmentType(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="adjustment">Adjustment</option>
                        <option value="purchase">Purchase</option>
                        <option value="sale">Sale</option>
                        <option value="return">Return</option>
                        <option value="damage">Damage</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <input
                        type="number"
                        value={adjustmentQty}
                        onChange={(e) => setAdjustmentQty(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reason</label>
                      <input
                        type="text"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        placeholder="Optional reason..."
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleAdjustInventory}
                      disabled={!adjustmentQty || adjustMutation.isPending}
                      className="w-full"
                    >
                      {adjustmentType === 'sale' ? <Minus className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Movement History */}
        {selectedProductData && movementHistory && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Stock Movement History</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {movementHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No movements recorded</p>
                ) : (
                  movementHistory.map((movement) => (
                    <div key={movement.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium capitalize">{movement.movementType}</p>
                          <p className="text-xs text-muted-foreground">{movement.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${movement.quantityChanged > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.quantityChanged > 0 ? '+' : ''}{movement.quantityChanged}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
