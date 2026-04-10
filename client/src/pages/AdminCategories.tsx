import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { useState } from "react";
import { AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react";

export default function AdminCategories() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: categories, isLoading, refetch } = trpc.admin.getAllCategories.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const createCategoryMutation = trpc.admin.createCategory.useMutation();
  const updateCategoryMutation = trpc.admin.updateCategory.useMutation();
  const deleteCategoryMutation = trpc.admin.deleteCategory.useMutation();

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full"><CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </CardContent></Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingId) {
        await updateCategoryMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          description: formData.description,
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
        });
      }
      setFormData({ name: "", description: "" });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const handleEdit = (category: { id: number; name: string; description?: string }) => {
    setFormData({ name: category.name, description: category.description || "" });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategoryMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "" });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/categories" />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Category Management</h1>
            <p className="text-muted-foreground">Create and manage product categories</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "New Category"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? "Edit Category" : "Create New Category"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Fan Parts, Motor Components"
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Category description (optional)"
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  >
                    {editingId ? "Update Category" : "Create Category"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading categories...</p>
          ) : categories && categories.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No categories yet. Create your first category!</p>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories?.map((category: any) => (
              <Card key={category.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      {category.description && (
                        <p className="text-muted-foreground text-sm mt-1">{category.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        ID: {category.id} | Created: {new Date(category.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(category.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
