import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { useState } from "react";
import { AlertTriangle, Mail, Phone, ShoppingCart } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminCustomers() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

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

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/customers" />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Customers</h1>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Customer Management</h2>
              <p className="text-muted-foreground">Customer management features coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
