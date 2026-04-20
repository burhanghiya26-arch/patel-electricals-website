import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Trash2, CheckCircle2, Clock, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function AdminReviews() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");

  const { data: allReviews = [] as any[], isLoading, refetch } = trpc.reviews.getAllReviews.useQuery();

  const approveReviewMutation = trpc.reviews.approveReview.useMutation({
    onSuccess: () => {
      toast.success("Review approved!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve review");
    },
  });

  const deleteReviewMutation = trpc.reviews.deleteReview.useMutation({
    onSuccess: () => {
      toast.success("Review deleted!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete review");
    },
  });

  // Filter reviews based on search and status
  const filteredReviews = allReviews.filter((review: any) => {
    const matchesSearch =
      !searchQuery ||
      review.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && !review.isApproved) ||
      (filterStatus === "approved" && review.isApproved);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = allReviews.filter((r: any) => !r.isApproved).length;
  const approvedCount = allReviews.filter((r: any) => r.isApproved).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading reviews...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-[oklch(0.22_0.05_260)] py-8">
        <div className="container">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white mb-2"
            onClick={() => setLocation("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
          <h1 className="text-2xl font-bold text-white">Customer Reviews Management</h1>
          <p className="text-white/60 text-sm mt-1">Manage and moderate customer reviews</p>
        </div>
      </div>

      <div className="container py-6 flex-1">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-3xl font-bold">{allReviews.length}</p>
                </div>
                <Star className="h-8 w-8 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Filter Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search by product or customer</label>
              <Input
                placeholder="Search product name, customer name, or review title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="flex gap-2">
                {(["all", "pending", "approved"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === "all" ? "All" : status === "pending" ? "Pending" : "Approved"}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No reviews found</p>
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review: any) => (
              <Card key={review.id} className={review.isApproved ? "border-green-200" : "border-amber-200"}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header with product and customer info */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{review.productName}</h3>
                          <Badge variant={review.isApproved ? "default" : "secondary"}>
                            {review.isApproved ? "Approved" : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">By {review.customerName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-1 justify-end mb-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-semibold">{review.rating} / 5</p>
                      </div>
                    </div>

                    {/* Review title and content */}
                    <div>
                      <p className="font-medium mb-1">{review.title}</p>
                      <p className="text-sm text-foreground">{review.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    {!review.isApproved && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          onClick={() => approveReviewMutation.mutate(review.id)}
                          disabled={approveReviewMutation.isPending}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteReviewMutation.mutate(review.id)}
                          disabled={deleteReviewMutation.isPending}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {review.isApproved && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteReviewMutation.mutate(review.id)}
                          disabled={deleteReviewMutation.isPending}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
