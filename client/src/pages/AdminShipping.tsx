import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { toast } from "sonner";
import { AlertCircle, Save, Loader2, Edit2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminShipping() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [, setLocation] = useLocation();
  const { data: shippingConfig } = trpc.admin.getShippingConfig.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'admin' }
  );
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    baseCost: 0,
    costPerKm: 0,
    freeShippingThreshold: 1000,
  });

  // Initialize form data when config loads
  React.useEffect(() => {
    if (shippingConfig) {
      setFormData({
        baseCost: Number(shippingConfig.baseCost) || 0,
        costPerKm: Number(shippingConfig.costPerKm) || 0,
        freeShippingThreshold: Number(shippingConfig.freeShippingThreshold) || 1000,
      });
    }
  }, [shippingConfig]);

  const updateShippingConfig = trpc.admin.updateShippingConfig.useMutation({
    onSuccess: () => {
      toast.success("Shipping configuration updated successfully!");
      setIsEditing(false);
      utils.admin.getShippingConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateShippingConfig.mutate({
      baseCost: formData.baseCost,
      costPerKm: formData.costPerKm,
      freeShippingThreshold: formData.freeShippingThreshold,
    });
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/shipping" />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">Shipping Configuration</h1>
        <p className="text-muted-foreground mb-8">Configure per-kilometer shipping charges</p>

        <div className="space-y-6">
          {/* Main Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Per-Kilometer Shipping Rate</span>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="baseCost">Base Cost (₹)</Label>
                      <Input
                        id="baseCost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.baseCost}
                        onChange={(e) => setFormData({ ...formData, baseCost: Number(e.target.value) })}
                        placeholder="e.g., 50"
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Minimum charge for any delivery</p>
                    </div>
                    <div>
                      <Label htmlFor="costPerKm">Cost Per Km (₹)</Label>
                      <Input
                        id="costPerKm"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costPerKm}
                        onChange={(e) => setFormData({ ...formData, costPerKm: Number(e.target.value) })}
                        placeholder="e.g., 10"
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Charge per kilometer distance</p>
                    </div>
                    <div>
                      <Label htmlFor="freeShippingThreshold">Free Shipping Above (₹)</Label>
                      <Input
                        id="freeShippingThreshold"
                        type="number"
                        step="1"
                        min="0"
                        value={formData.freeShippingThreshold}
                        onChange={(e) => setFormData({ ...formData, freeShippingThreshold: Number(e.target.value) })}
                        placeholder="e.g., 1000"
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Orders above this amount get free shipping</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Formula:</strong> Shipping Cost = Base Cost + (Distance × Cost Per Km)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateShippingConfig.isPending}
                      className="flex-1"
                    >
                      {updateShippingConfig.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Base Cost</p>
                      <p className="text-2xl font-bold">₹{Number(formData.baseCost).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-2">Minimum charge for any delivery</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Cost Per Km</p>
                      <p className="text-2xl font-bold">₹{Number(formData.costPerKm).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-2">Additional charge per kilometer</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-muted-foreground mb-1">Free Shipping Above</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{Number(formData.freeShippingThreshold).toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground mt-2">Orders above this get free shipping</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-foreground mb-2">Example Calculations:</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• 5 km away: ₹{Number(formData.baseCost) + (5 * Number(formData.costPerKm))} = ₹{Number(formData.baseCost).toFixed(2)} + (5 × ₹{Number(formData.costPerKm).toFixed(2)})</p>
                      <p>• 10 km away: ₹{Number(formData.baseCost) + (10 * Number(formData.costPerKm))} = ₹{Number(formData.baseCost).toFixed(2)} + (10 × ₹{Number(formData.costPerKm).toFixed(2)})</p>
                      <p>• 20 km away: ₹{Number(formData.baseCost) + (20 * Number(formData.costPerKm))} = ₹{Number(formData.baseCost).toFixed(2)} + (20 × ₹{Number(formData.costPerKm).toFixed(2)})</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">How Shipping Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p><strong className="text-foreground">1. Google Maps Distance Calculation</strong></p>
                <p className="ml-4">Customer enters their delivery address at checkout. System automatically calculates distance from your warehouse (Udhana, Surat - 394210) using Google Maps.</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">2. Per-Kilometer Calculation</strong></p>
                <p className="ml-4">Formula: Base Cost + (Distance × Cost Per Km)</p>
                <p className="ml-4 text-xs">Example: ₹{Number(formData.baseCost).toFixed(2)} + (10 km × ₹{Number(formData.costPerKm).toFixed(2)}/km) = ₹{(Number(formData.baseCost) + (10 * Number(formData.costPerKm))).toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">3. Automatic Application</strong></p>
                <p className="ml-4">Shipping cost is calculated automatically during checkout and shown to customer before they place the order.</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">4. Free Shipping Threshold</strong></p>
                <p className="ml-4">Orders with subtotal ≥ ₹{Number(formData.freeShippingThreshold).toFixed(0)} get free shipping automatically.</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">5. Real-Time Updates</strong></p>
                <p className="ml-4">Changes to any configuration apply immediately to all new orders.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
