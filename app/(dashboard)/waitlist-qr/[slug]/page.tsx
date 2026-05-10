import { WaitlistQrSourceDetail } from "@/components/WaitlistQrSourceDetail";

export default async function WaitlistQrSourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <WaitlistQrSourceDetail slug={slug} />;
}
