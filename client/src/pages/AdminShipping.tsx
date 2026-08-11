import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { toast } from "sonner";
import { AlertCircle, Save, Loader2, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminShipping() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [, setLocation] = useLocation();
  // Shipping procedures are registered under the adminDashboard router.
  const shippingConfig = trpc.adminDashboard.getShippingConfig.useQuery();
  const pinCodeZones = trpc.adminDashboard.listPinCodeZones.useQuery();

  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    baseCost: 0,
    costPerKm: 0,
    freeShippingThreshold: 1000,
  });
  const [pinForm, setPinForm] = React.useState({ pincode: "", areaName: "", shippingCharge: 0 });

  // Initialize form data when config loads
React.useEffect(() => {
  if (shippingConfig.data) {
    setFormData({
      baseCost: Number(shippingConfig.data.baseCost),
      costPerKm: Number(shippingConfig.data.costPerKm),
      freeShippingThreshold: Number(shippingConfig.data.freeShippingThreshold),
    });
  }
}, [shippingConfig.data]);

const updateShippingConfig = trpc.adminDashboard.updateShippingConfig.useMutation({
  onSuccess: () => {
    toast.success("Shipping configuration updated successfully");
    shippingConfig.refetch();
    setIsEditing(false);
  },
onError: (error) => {
  console.error("SHIPPING UPDATE ERROR =", error);
  toast.error(error.message || "Failed to update shipping configuration");
},  
});  

const handleSave = () => {
  updateShippingConfig.mutate({
    baseCost: formData.baseCost,
    costPerKm: formData.costPerKm,
    freeShippingThreshold: formData.freeShippingThreshold,
  });
};  

const savePinCodeZone = trpc.adminDashboard.savePinCodeZone.useMutation({
  onSuccess: () => {
    toast.success("Pincode delivery charge saved");
    pinCodeZones.refetch();
    setPinForm({ pincode: "", areaName: "", shippingCharge: 0 });
  },
  onError: (error) => toast.error(error.message || "Could not save pincode"),
});

const deletePinCodeZone = trpc.adminDashboard.deletePinCodeZone.useMutation({
  onSuccess: () => {
    toast.success("Pincode deleted");
    pinCodeZones.refetch();
  },
  onError: (error) => toast.error(error.message || "Could not delete pincode"),
});

const handleSavePincode = () => {
  if (!/^\d{6}$/.test(pinForm.pincode)) {
    toast.error("Enter a valid 6-digit pincode");
    return;
  }
  savePinCodeZone.mutate(pinForm);
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
        <p className="text-muted-foreground mb-8">Configure delivery charges for Surat pincodes</p>

        <div className="space-y-6">
          {/* Main Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>General Shipping Settings</span>
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
                      PIN-code charges below are used at checkout. Base Cost and Cost Per Km are not used for PIN-code delivery.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateShippingConfig.isLoading}
                      className="flex-1"
                    >
                      {updateShippingConfig.isLoading ? (
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">PIN Code Delivery Charges</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add each Surat pincode and its fixed delivery charge. Adding the same pincode again updates its charge.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="shipping-pincode">Pincode *</Label>
                  <Input
                    id="shipping-pincode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g., 395003"
                    value={pinForm.pincode}
                    onChange={(event) => setPinForm({ ...pinForm, pincode: event.target.value.replace(/\D/g, "") })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="shipping-area">Area name</Label>
                  <Input
                    id="shipping-area"
                    placeholder="e.g., Udhana"
                    value={pinForm.areaName}
                    onChange={(event) => setPinForm({ ...pinForm, areaName: event.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="shipping-charge">Delivery charge (₹) *</Label>
                  <Input
                    id="shipping-charge"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pinForm.shippingCharge}
                    onChange={(event) => setPinForm({ ...pinForm, shippingCharge: Number(event.target.value) })}
                    className="mt-2"
                  />
                </div>
              </div>
              <Button onClick={handleSavePincode} disabled={savePinCodeZone.isPending}>
                {savePinCodeZone.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pincode Charge
              </Button>

              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_1.2fr_1fr_auto] gap-3 bg-muted px-4 py-3 text-sm font-medium">
                  <span>Pincode</span><span>Area</span><span>Charge</span><span>Actions</span>
                </div>
                {pinCodeZones.isLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading pincodes...</p>
                ) : pinCodeZones.data?.length ? pinCodeZones.data.map((zone) => (
                  <div key={zone.id} className="grid grid-cols-[1fr_1.2fr_1fr_auto] items-center gap-3 border-t px-4 py-3 text-sm">
                    <span className="font-medium">{zone.pinCodeStart}</span>
                    <span className="text-muted-foreground">{zone.areaName}</span>
                    <span>₹{Number(zone.shippingCost).toFixed(2)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => setPinForm({ pincode: zone.pinCodeStart, areaName: zone.areaName, shippingCharge: Number(zone.shippingCost) })}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" disabled={deletePinCodeZone.isPending} onClick={() => deletePinCodeZone.mutate({ id: zone.id })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="p-4 text-sm text-muted-foreground">No pincodes added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">How Shipping Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p><strong className="text-foreground">1. PIN Code Delivery Charge</strong></p>
                <p className="ml-4">Customer enters a Surat pincode at checkout. The delivery charge saved for that pincode is shown automatically.</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">2. Only Added PIN Codes Deliver</strong></p>
                <p className="ml-4">A pincode that is not listed above cannot be used for delivery.</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">3. Automatic Application</strong></p>
                <p className="ml-4">The delivery charge is shown during checkout and checked again when the order is placed.</p>
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
