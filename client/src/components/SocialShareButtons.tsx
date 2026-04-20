import { Share2, Instagram, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareButtonsProps {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  showText?: boolean;
}

export function SocialShareButtons({
  title,
  description = "",
  url = typeof window !== "undefined" ? window.location.href : "",
  imageUrl = "",
  showText = true,
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareData = {
    title,
    text: description || title,
    url,
  };



  const handleInstagramShare = () => {
    try {
      // Open Patel Electricals Instagram account
      const instagramUrl = "https://www.instagram.com/patel_electricals_surat";
      const newWindow = window.open(instagramUrl, "_blank");
      if (!newWindow) {
        // If popup blocked, try direct navigation
        window.location.href = instagramUrl;
      }
    } catch (error) {
      console.error("Failed to open Instagram:", error);
      toast.error("Could not open Instagram. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground">Share:</span>

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          {showText && "Share"}
        </Button>
      )}



      <Button
        variant="outline"
        size="sm"
        onClick={handleInstagramShare}
        className="gap-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
        title="Follow us on Instagram"
        type="button"
      >
        <Instagram className="h-4 w-4" />
        {showText && "Instagram"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="gap-2"
      >
        <LinkIcon className="h-4 w-4" />
        {showText && (copied ? "Copied!" : "Copy Link")}
      </Button>
    </div>
  );
}
