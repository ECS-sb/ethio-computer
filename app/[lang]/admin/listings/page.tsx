import Image from "next/image";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { approveListingAction, rejectListingAction, reviewListingWithAiAction } from "@/lib/actions";
import { categories, countries, formatCount, formatPrice, getPlatform, labelOf } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { readListingReview, type ListingReview } from "@/lib/listing-review";
import type { MessageKey } from "@/lib/messages";
import { getPendingListings } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { aiEnabled } from "@/lib/telegram/ai";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Listing review");

export default async function AdminListingsPage() {
  const t = await getT();
  await requireAdmin();
  const listings = await getPendingListings();

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Listing review")}</h1>
      {listings.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No listings to review.")}</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {listings.map((listing) => (
            <li key={listing.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold break-all" dir="ltr">
                  {getPlatform(listing.platform)?.name} · @{listing.username}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("{count} followers", { count: formatCount(listing.followers) })} · {formatPrice(t, listing.priceEtb)} · {t(labelOf(categories, listing.category))} ·{" "}
                  {t(labelOf(countries, listing.country))}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {t("Seller:")} {listing.seller.name} ({listing.seller.email})
                </p>
                {listing.description ? <p className="pt-2 text-sm break-words whitespace-pre-line">{listing.description}</p> : null}
              </div>
              {listing.images.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {listing.images.map((image, index) => (
                      <a key={image.id} href={`/api/listing-images/${image.id}`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-secondary ring-1 ring-foreground/10 hover:ring-primary/60">
                        <Image
                          unoptimized
                          src={`/api/listing-images/${image.id}?size=thumb`}
                          alt={t("Screenshot {number}", { number: index + 1 })}
                          width={image.width}
                          height={image.height}
                          className="aspect-[4/3] w-full object-cover object-top"
                        />
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("Check that the screenshots match the listing and don't show the channel's name.")}</p>
                </div>
              ) : null}
              <AiReviewBox t={t} listingId={listing.id} review={readListingReview(listing.aiReview)} />
              <p className="rounded-xl bg-primary/15 p-4 text-sm ring-1 ring-primary/30">
                {t("Before approving, check this code is in the account's bio:")} <code className="font-mono font-semibold text-primary">{listing.verificationCode}</code>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton action={approveListingAction} id={listing.id}>
                  {t("Approve")}
                </ActionButton>
                <ActionForm action={rejectListingAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={listing.id} />
                  <Input name="reason" placeholder={t("Reason for rejection")} maxLength={300} aria-label={t("Reason for rejection")} className="h-10 max-w-sm" />
                  <SubmitButton variant="outline">{t("Reject")}</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const riskLabels: Record<ListingReview["risk"], MessageKey> = { LOW: "Low risk", MEDIUM: "Check carefully", HIGH: "High risk" };

/** የAI ግምገማ ውጤት፦ ፍንጭ ብቻ ነው፤ የማጽደቅ ውሳኔው የአድሚኑ ነው። */
function AiReviewBox({ t, listingId, review }: { t: Awaited<ReturnType<typeof getT>>; listingId: string; review: ListingReview | null }) {
  if (!aiEnabled()) return null;
  if (!review) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 p-4 text-sm ring-1 ring-foreground/10">
        <p className="text-muted-foreground">{t("The AI check hasn't run for this listing yet.")}</p>
        <ActionButton action={reviewListingWithAiAction} id={listingId} variant="outline" size="sm">
          {t("Check with AI")}
        </ActionButton>
      </div>
    );
  }

  const flags: string[] = [];
  if (review.followers_check === "MISMATCH") flags.push(`${t("The follower count doesn't match the screenshots.")} ${review.followers_note}`);
  if (review.followers_check === "NOT_VISIBLE") flags.push(t("No screenshot shows the follower count."));
  if (review.platform_check === "MISMATCH") flags.push(t("The screenshots are from a different platform."));
  if (review.editing_suspected) flags.push(`${t("The screenshots may be edited:")} ${review.editing_reason}`);
  if (review.name_visible) flags.push(t("A screenshot shows the account's name."));
  if (review.contact_in_description.found) flags.push(`${t("The description has contact details:")} "${review.contact_in_description.quote}"`);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl p-4 text-sm ring-1",
        review.risk === "HIGH" && "bg-destructive/10 ring-destructive/40",
        review.risk === "MEDIUM" && "bg-primary/10 ring-primary/30",
        review.risk === "LOW" && "bg-secondary/60 ring-foreground/10"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {t("AI check")}: {t(riskLabels[review.risk])}
        </p>
        <ActionButton action={reviewListingWithAiAction} id={listingId} variant="ghost" size="sm">
          {t("Check again")}
        </ActionButton>
      </div>
      <p>{review.summary}</p>
      {flags.length > 0 ? (
        <ul className="list-disc ps-5">
          {flags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("A hint from AI ({model}). Check the screenshots yourself before approving.", { model: review.model })}</p>
    </div>
  );
}
