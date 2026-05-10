import { WaitlistQrManager } from "@/components/WaitlistQrManager";

function getWaitlistBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_WAITLIST_BASE_URL ??
    process.env.NEXT_PUBLIC_WAITLIST_URL;

  if (!envUrl) return "https://allonsapp.com/";

  try {
    return new URL(envUrl).toString();
  } catch {
    return "https://allonsapp.com/";
  }
}

export default function WaitlistQrPage() {
  return <WaitlistQrManager waitlistBaseUrl={getWaitlistBaseUrl()} />;
}
