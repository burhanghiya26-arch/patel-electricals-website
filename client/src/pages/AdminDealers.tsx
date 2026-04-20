import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { Users, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function AdminDealers() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [creditDialog, setCreditDialog] = useState<{ userId: number; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);

  const { data: dealers, isLoading, refetch } = trpc.users.getAllDealers.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const creditMutation = trpc.users.updateCreditLimit.useMutation({
    onSuccess: () => { toast.success("Credit limit updated"); refetch(); setCreditDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/dealers" />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">Dealers & Users</h1>
        <p className="text-muted-foreground mb-6">{dealers?.length || 0} registered users</p>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>
        ) : !dealers || dealers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users yet</h3>
            <p className="text-muted-foreground">Users will appear here when they register</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dealers.map((dealer) => (
              <Card key={dealer.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(dealer.name || dealer.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{dealer.name || "Unnamed User"}</h3>
                        <p className="text-sm text-muted-foreground">{dealer.email}</p>
                        {dealer.businessName && <p className="text-xs text-muted-foreground">{dealer.businessName}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={dealer.role === "admin" ? "default" : "secondary"}>{dealer.role}</Badge>
                      {dealer.isVerified && <Badge variant="outline" className="text-green-600 border-green-300">Verified</Badge>}
                      {dealer.creditApproved && <Badge variant="outline" className="text-blue-600 border-blue-300">Credit: ₹{Number(dealer.creditLimit || 0).toLocaleString()}</Badge>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setCreditDialog({ userId: dealer.id, name: dealer.name || "User" }); setCreditAmount(Number(dealer.creditLimit || 0)); }}>
                      <CreditCard className="h-4 w-4 mr-1" /> Credit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!creditDialog} onOpenChange={() => setCreditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Credit Limit - {creditDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Credit Limit (₹)</Label><Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)} className="mt-1" /></div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => creditDialog && creditMutation.mutate({ userId: creditDialog.userId, creditLimit: creditAmount, creditApproved: true })}>
                Approve Credit
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => creditDialog && creditMutation.mutate({ userId: creditDialog.userId, creditLimit: 0, creditApproved: false })}>
                Revoke Credit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
