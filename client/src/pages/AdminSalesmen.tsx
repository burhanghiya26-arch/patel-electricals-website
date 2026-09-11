import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AdminNav } from "./AdminDashboard";
import { toast } from "sonner";

export default function AdminSalesmen() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const salesmen = trpc.salesman.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const create = trpc.salesman.create.useMutation({ onSuccess: async () => { toast.success("Salesman ID created"); setForm({ name: "", email: "", phone: "", password: "" }); await utils.salesman.list.invalidate(); }, onError: error => toast.error(error.message) });
  if (!isAuthenticated || user?.role !== "admin") return null;
  return <div className="min-h-screen bg-background"><AdminNav current="/admin/salesmen" /><main className="container py-8 space-y-6"><div><h1 className="text-2xl font-bold">Salesmen</h1><p className="text-muted-foreground">Create a salesman ID here. Send only this link to him: yourwebsite.com/salesman</p></div><Card><CardHeader><CardTitle>Create Salesman Login</CardTitle><CardDescription>Salesman can book shop wholesale orders. He cannot access admin or delivery panels.</CardDescription></CardHeader><CardContent><form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password }); }}><div><Label>Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div><div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div><div><Label>Email / ID</Label><Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div><div><Label>Password</Label><Input type="password" minLength={6} required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div><Button className="md:w-fit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Generate Salesman ID"}</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Created Salesmen</CardTitle></CardHeader><CardContent>{!salesmen.data?.length ? <p className="text-sm text-muted-foreground">No salesman ID created yet.</p> : <div className="space-y-3">{salesmen.data.map(salesman => <div key={salesman.id} className="rounded-lg border p-3"><p className="font-semibold">{salesman.name}</p><p className="text-sm text-muted-foreground">{salesman.email}{salesman.phone ? ` · ${salesman.phone}` : ""}</p></div>)}</div>}</CardContent></Card></main></div>;
}
