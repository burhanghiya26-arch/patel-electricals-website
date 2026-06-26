import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { AlertTriangle, Search, Users, Mail, Phone, Building2, Calendar, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminCustomers() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = trpc.users.getAllDealers.useQuery({ limit: 200, offset: 0 });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = (customers || []).filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.businessPhone?.includes(q) ||
      c.businessName?.toLowerCase().includes(q)
    );
  });

  const roleColor: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    dealer: "bg-blue-100 text-blue-700",
    sales_rep: "bg-purple-100 text-purple-700",
    user: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/customers" />
      <div className="container py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-muted-foreground text-sm">{customers?.length || 0} registered users</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No customers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c: any) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{c.name || "—"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[c.role] || "bg-gray-100 text-gray-700"}`}>
                          {c.role}
                        </span>
                        {c.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {c.email}
                          </span>
                        )}
                        {c.businessPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {c.businessPhone}
                          </span>
                        )}
                        {c.businessName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {c.businessName}
                          </span>
                        )}
                        {c.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      {c.gstNumber && (
                        <p className="text-xs text-muted-foreground mt-1">GST: {c.gstNumber}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Credit</p>
                      <p className="text-sm font-bold">
                        ₹{Number(c.creditLimit || 0).toLocaleString("en-IN")}
                      </p>
                      {c.creditApproved && (
                        <span className="text-xs text-green-600">Approved</span>
                      )}
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
