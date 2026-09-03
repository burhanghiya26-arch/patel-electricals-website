import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DeliveryOtpNotice() {
  const [location] = useLocation();
  const match = location.match(/^\/customer\/orders\/(\d+)/);
  const orderId = match ? Number(match[1]) : 0;
  const deliveryOtp = trpc.delivery.customerOtp.useQuery(orderId, {
    enabled: orderId > 0,
    retry: false,
  });

  if (!deliveryOtp.data?.otp) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xl">
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
        <div>
          <p className="font-bold text-amber-950">Delivery OTP</p>
          <p className="mt-1 text-sm text-amber-900">Order milne ke baad hi ye code delivery person ko batayein.</p>
          <p className="mt-3 text-3xl font-bold tracking-[0.35em] text-amber-700">{deliveryOtp.data.otp}</p>
        </div>
      </div>
    </div>
  );
}
