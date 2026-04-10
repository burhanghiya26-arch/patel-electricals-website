import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, ShoppingCart, FileText, CreditCard, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function DealerProfile() {
  const [, setLocation] = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "", businessName: "", businessPhone: "", businessAddress: "",
  });

  const { data: orders } = trpc.orders.list.useQuery();
  const { data: quotations } = trpc.quotations.list.useQuery();
  const updateMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => { toast.success("Profile updated"); setEditMode(false); },
    onError: (e) => toast.error(e.message),
  });



  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800", shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                D
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Guest Dealer</h1>
                <p className="text-muted-foreground">Browse and shop without account</p>
                <div className="flex gap-2 mt-1">
                  <Badge>Guest</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" /> My Orders</TabsTrigger>
            <TabsTrigger value="quotations"><FileText className="h-4 w-4 mr-1" /> Quotations</TabsTrigger>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {!orders || orders.length === 0 ? (
              <div className="text-center py-12"><ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No orders yet</p></div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-sm" onClick={() => setLocation(`/orders/${order.id}`)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold font-mono">{order.orderNumber}</h3>
                        <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <Badge className={statusColors[order.orderStatus] || ""}>{order.orderStatus}</Badge>
                      <p className="font-bold">₹{Number(order.totalAmount).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotations">
            {!quotations || quotations.length === 0 ? (
              <div className="text-center py-12"><FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No quotation requests</p></div>
            ) : (
              <div className="space-y-3">
                {quotations.map((q) => (
                  <Card key={q.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold font-mono">{q.quotationNumber}</h3>
                        <p className="text-sm text-muted-foreground">{new Date(q.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <Badge>{q.status}</Badge>
                      <p className="font-bold">₹{Number(q.totalAmount || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>


          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Full Name</Label><Input value={profileData.name || ""} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="mt-1" /></div>
                  <div><Label>Business Name</Label><Input value={profileData.businessName} onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })} className="mt-1" /></div>
                  <div><Label>Phone Number</Label><Input value={profileData.businessPhone} onChange={(e) => setProfileData({ ...profileData, businessPhone: e.target.value })} className="mt-1" /></div>

                </div>
                <div><Label>Business Address</Label><textarea value={profileData.businessAddress} onChange={(e) => setProfileData({ ...profileData, businessAddress: e.target.value })} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm min-h-20" /></div>
                <Button onClick={() => updateMutation.mutate(profileData)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
