import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function WhatsAppButton({
  phoneNumber = "918780657095", // Default to business number
  message = "Hello! I'm interested in your products.",
  variant = "default",
  size = "default",
  showText = true,
}: WhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      variant={variant}
      size={size}
      className={`${
        variant === "default" ? "bg-green-600 hover:bg-green-700" : ""
      }`}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {showText && "WhatsApp Us"}
    </Button>
  );
}

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  message?: string;
}

export function WhatsAppFloatingButton({
  phoneNumber = "918780657095",
  message = "Hello! I'm interested in your products.",
}: WhatsAppFloatingButtonProps) {
  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl z-40 flex items-center justify-center"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
