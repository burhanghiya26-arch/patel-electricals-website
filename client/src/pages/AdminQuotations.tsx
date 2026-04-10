import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { FileText } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  quoted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

export default function AdminQuotations() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const { data: quotations, isLoading, refetch } = trpc.quotations.getAllQuotations.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const updateMutation = trpc.quotations.update.useMutation({
    onSuccess: () => { toast.success("Quotation updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/quotations" />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">Quotations</h1>
        <p className="text-muted-foreground mb-6">{quotations?.length || 0} total quotation requests</p>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>
        ) : !quotations || quotations.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quotation requests</h3>
            <p className="text-muted-foreground">Quotation requests from dealers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotations.map((q) => (
              <Card key={q.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold font-mono">{q.quotationNumber}</h3>
                        <Badge className={statusColors[q.status] || "bg-gray-100 text-gray-800"}>{q.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">User ID: {q.userId}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(q.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{Number(q.totalAmount || 0).toLocaleString()}</p>
                      {q.quotedPrice && <p className="text-sm text-green-600">Quoted: ₹{Number(q.quotedPrice).toLocaleString()}</p>}
                    </div>
                    <Select
                      value={q.status}
                      onValueChange={(val) => updateMutation.mutate({ quotationId: q.id, status: val as any })}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="quoted">Quoted</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
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
