// የኤሌክትሮኒክስ ገበያው ቋሚ መረጃዎች (ምድቦች፣ ሁኔታዎች፣ ከተሞች)። database አይጠቀምም፤ በclient ኮምፖነንቶችም ይሰራል።
import type { ProductCategory, ProductCondition, ProductOrderStatus, ProductStatus } from "@/lib/generated/prisma/enums";
import type { MessageKey } from "@/lib/messages";

export const productCategories: { value: ProductCategory; label: MessageKey; mark: string }[] = [
  { value: "PHONE", label: "Phones", mark: "PH" },
  { value: "LAPTOP", label: "Laptops", mark: "LP" },
  { value: "TABLET", label: "Tablets", mark: "TB" },
  { value: "COMPUTER", label: "Desktop computers", mark: "PC" },
  { value: "TV_AUDIO", label: "TV and audio", mark: "TV" },
  { value: "GAMING", label: "Gaming", mark: "GM" },
  { value: "CAMERA", label: "Cameras", mark: "CM" },
  { value: "ACCESSORY", label: "Accessories", mark: "AC" },
];

export function productCategory(value: string) {
  return productCategories.find((category) => category.value === value);
}

export const productConditions: { value: ProductCondition; label: MessageKey }[] = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "USED", label: "Used" },
];

export const conditionLabels: Record<ProductCondition, MessageKey> = { NEW: "New", LIKE_NEW: "Like new", USED: "Used" };

export const productCities: { value: string; label: MessageKey }[] = [
  { value: "Addis Ababa", label: "Addis Ababa" },
  { value: "Adama", label: "Adama" },
  { value: "Bahir Dar", label: "Bahir Dar" },
  { value: "Hawassa", label: "Hawassa" },
  { value: "Mekelle", label: "Mekelle" },
  { value: "Dire Dawa", label: "Dire Dawa" },
  { value: "Gondar", label: "Gondar" },
  { value: "Jimma", label: "Jimma" },
  { value: "Dessie", label: "Dessie" },
  { value: "Other city", label: "Other city" },
];

/** የተቀመጠው የከተማ ስም በተመልካቹ ቋንቋ። */
export function cityLabel(value: string): MessageKey {
  return productCities.find((city) => city.value === value)?.label ?? "Other city";
}

export const productStatusLabels: Record<ProductStatus, MessageKey> = {
  PENDING: "Under review",
  APPROVED: "Live",
  REJECTED: "Rejected",
  PAUSED: "Paused",
  RESERVED: "Sold, waiting for handover",
  SOLD: "Sold",
};

export const productOrderLabels: Record<ProductOrderStatus, MessageKey> = {
  PAID: "Paid, waiting for handover",
  HANDED_OVER: "Handed over, waiting for the buyer",
  COMPLETED: "Completed",
  DISPUTED: "In dispute",
  CANCELLED: "Cancelled, money returned",
  REFUNDED: "Refunded",
};

/** ደረጃዎቹ በገጹ ላይ በቅደም ተከተል ይታያሉ። */
export const productOrderStages: ProductOrderStatus[] = ["PAID", "HANDED_OVER", "COMPLETED"];

/** የድርጅቱ ክፍያ ከሻጩ ገቢ ላይ ይቆረጣል፤ ገዢው የእቃውን ዋጋ ብቻ ይከፍላል። */
export const ELECTRONICS_FEE_PERCENT = 10;

// Vercel ጥያቄን እስከ 4.5MB ብቻ ይቀበላል፤ ፎቶዎቹ በስልኩ ላይ ተቀንሰው ይላካሉ።
export const MAX_PRODUCT_IMAGES = 4;
export const MAX_PRODUCT_IMAGE_BYTES = 1_000_000;

export const electronicsSteps: { title: MessageKey; description: MessageKey }[] = [
  { title: "Find the item", description: "Compare photos, condition and price, and ask the seller questions in the chat." },
  { title: "Pay safely", description: "Pay from your wallet. Ethio Computer holds the money until you have the item." },
  { title: "Meet and check", description: "Agree on a place in the chat, meet the seller and check the item well." },
  { title: "Confirm and done", description: "Confirm you received it and the seller gets paid. Problem? Report it before confirming." },
];
