import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminNav } from "./AdminDashboard";
import { useState } from "react";
import { AlertTriangle, Mail, Phone, DollarSign, ShoppingCart, MessageSquare, Tag } from "lucide-react";

export default function AdminCustomers() {
  const { user, isAuthenticated } = useAuth();
  
  if (user && user.role !== "admin") {
    return <div className="p-4">Access denied. Admin only.</div>;
  }
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteType, setNoteType] = useState("call");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [newSegment, setNewSegment] = useState("");
  const [segmentReason, setSegmentReason] = useState("");

  const { data: customers, isLoading, refetch } = trpc.admin.customers.useQuery(
    { search: searchTerm, limit: 100 },
    { enabled: isAuthenticated && user?.role === 'admin' }
  );
  
  const { data: customerDetail } = trpc.admin.customerDetail.useQuery(selectedCustomer || 0, {
    enabled: isAuthenticated && user?.role === 'admin' && !!selectedCustomer,
  });

  const { data: customerAnalytics } = trpc.admin.customerAnalytics.useQuery(selectedCustomer || 0, {
    enabled: isAuthenticated && user?.role === 'admin' && !!selectedCustomer,
  });

  const addNoteMutation = trpc.admin.addCustomerNote.useMutation();
  const updateSegmentMutation = trpc.admin.updateCustomerSegment.useMutation();

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

  const handleAddNote = async () => {
    if (!selectedCustomer || !noteContent) return;
    try {
      await addNoteMutation.mutateAsync({
        customerId: selectedCustomer,
        noteType: noteType as any,
        subject: noteSubject,
        content: noteContent,
        isInternal: true,
      });
      setNoteContent("");
      setNoteSubject("");
      setShowNoteForm(false);
      refetch();
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleUpdateSegment = async () => {
    if (!selectedCustomer || !newSegment) return;
    try {
      await updateSegmentMutation.mutateAsync({
        customerId: selectedCustomer,
        segment: newSegment as any,
        reason: segmentReason,
      });
      setNewSegment("");
      setSegmentReason("");
      refetch();
    } catch (error) {
      console.error("Failed to update segment:", error);
    }
  };

  const getSegmentColor = (segment?: string) => {
    switch (segment) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'high_value': return 'bg-blue-100 text-blue-800';
      case 'regular': return 'bg-green-100 text-green-800';
      case 'new': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav current="/admin/customers" />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">Customer Management</h1>
        <p className="text-muted-foreground mb-8">Track customer profiles, orders, and interactions</p>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Customer List */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Customers</h2>
                <input
                  type="text"
                  placeholder="Search by name, email, or business..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-4"
                />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : customers && customers.length === 0 ? (
                    <p className="text-muted-foreground">No customers found</p>
                  ) : (
                    customers?.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedCustomer === customer.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                            {customer.businessName && (
                              <p className="text-xs text-muted-foreground">{customer.businessName}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {customer.role === 'dealer' ? 'Dealer' : 'Customer'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined: {new Date(customer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Detail Panel */}
          {selectedCustomer && customerDetail && (
            <div className="space-y-4">
              {/* Profile Card */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Profile</h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{customerDetail.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {customerDetail.email}
                      </p>
                    </div>
                    {customerDetail.businessPhone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {customerDetail.businessPhone}
                        </p>
                      </div>
                    )}
                    {customerDetail.businessName && (
                      <div>
                        <p className="text-muted-foreground">Business</p>
                        <p className="font-medium">{customerDetail.businessName}</p>
                      </div>
                    )}
                    {customerDetail.segment && (
                      <div>
                        <p className="text-muted-foreground">Segment</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSegmentColor(customerDetail.segment.segment)}`}>
                          {customerDetail.segment.segment.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Card */}
              {customerAnalytics && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Analytics</h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Total Spent
                        </span>
                        <span className="font-bold">₹{customerAnalytics.totalSpent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Orders
                        </span>
                        <span className="font-bold">{customerAnalytics.orderCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Order Value</span>
                        <span className="font-bold">₹{customerAnalytics.avgOrderValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days Since Last Order</span>
                        <span className="font-bold">{customerAnalytics.daysSinceLastOrder || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Segment Update */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Update Segment
                  </h2>
                  <div className="space-y-3">
                    <select
                      value={newSegment}
                      onChange={(e) => setNewSegment(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Select segment...</option>
                      <option value="vip">VIP</option>
                      <option value="high_value">High Value</option>
                      <option value="regular">Regular</option>
                      <option value="new">New</option>
                      <option value="at_risk">At Risk</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <input
                      type="text"
                      value={segmentReason}
                      onChange={(e) => setSegmentReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <Button
                      onClick={handleUpdateSegment}
                      disabled={!newSegment || updateSegmentMutation.isPending}
                      className="w-full"
                    >
                      {updateSegmentMutation.isPending ? 'Updating...' : 'Update Segment'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Orders and Notes */}
        {selectedCustomer && customerDetail && (
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 mt-8">
            {/* Recent Orders */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {customerDetail.orders && customerDetail.orders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No orders yet</p>
                  ) : (
                    customerDetail.orders?.map((order) => (
                      <div key={order.id} className="p-3 border rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{order.totalAmount}</p>
                            <p className="text-xs text-muted-foreground capitalize">{order.orderStatus}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setShowNoteForm(!showNoteForm)}
                    variant="outline"
                  >
                    {showNoteForm ? 'Cancel' : 'Add Note'}
                  </Button>
                </div>

                {showNoteForm && (
                  <div className="space-y-3 mb-4 p-3 bg-muted rounded-lg">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="issue">Issue</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={noteSubject}
                      onChange={(e) => setNoteSubject(e.target.value)}
                      placeholder="Subject (optional)"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Note content..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      rows={3}
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!noteContent || addNoteMutation.isPending}
                      className="w-full"
                      size="sm"
                    >
                      {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {customerDetail.notes && customerDetail.notes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No notes yet</p>
                  ) : (
                    customerDetail.notes?.map((note) => (
                      <div key={note.id} className="p-3 border rounded-lg text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium capitalize text-xs bg-primary/10 px-2 py-1 rounded">
                            {note.noteType.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {note.subject && <p className="font-medium text-xs mb-1">{note.subject}</p>}
                        <p className="text-xs text-muted-foreground">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
