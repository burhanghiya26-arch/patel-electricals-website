import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Phone, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SimpleCustomerLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.customer.loginByEmailPhone.useMutation({
    onSuccess: (data) => {
      toast.success("Login successful! Welcome back.");
      setLocation("/customer/dashboard");
    },
    onError: (err) => {
      setError(err.message || "Login failed. Please try again.");
      toast.error(err.message || "Login failed");
    },
  });

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !phone) {
      setError("Please enter both email and phone");
      return;
    }
    loginMutation.mutate({ email, phone });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Customer Login</CardTitle>
          <p className="text-sm text-muted-foreground text-center">Patel Electricals — Wholesale Spare Parts</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Continue to My Account"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p className="font-medium">Same email = Same history</p>
            <p className="text-xs mt-1">
              Login with the same email on any device to see all your orders and quotations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
