import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function CustomerOrderDetails() {
  const [, params] = useRoute("/customer/orders/:id");

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">

        <Link href="/customer/dashboard">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Orders
          </Button>
        </Link>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">
              Order Details
            </h1>

            <p className="text-gray-600">
              Order ID:
            </p>

            <p className="font-bold text-lg">
              {params?.id}
            </p>

            <div className="mt-6 border-t pt-6">
              <p className="text-gray-500">
                🚧 Order Details page is under construction.
              </p>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
