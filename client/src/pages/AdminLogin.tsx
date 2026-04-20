import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";


export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const loginMutation = trpc.admin.login.useMutation();
  const setupMutation = trpc.admin.setupAdmin.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({ email, password });
      if (result.success) {
        setLocation("/admin");
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Login failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await setupMutation.mutateAsync({ email, password });
      if (result.success) {
        setError("");
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Setup failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleSetupAdmin}
                disabled={isLoading}
              >
                {isLoading ? "Setting up..." : "Setup Admin"}
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center pt-2">
              Click "Setup Admin" if this is your first time logging in
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
