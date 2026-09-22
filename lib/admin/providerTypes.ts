export type ProviderStatus = "pending" | "approved" | "paused" | "suspended";

export interface ProviderProfile {
  fullName: string | null;
  email: string;
  phone: string | null;
  brandName: string;
  brandHandle: string | null;
  brandDescription: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  businessType: string | null;
  brandColor: string;
  logoUrl: string | null;
  contractUrl: string | null;
  pasarelaFeePct: number | null;
  allonsFeePct: number | null;
}

export interface ProviderOption {
  id: string;
  name: string;
  handle: string | null;
}
