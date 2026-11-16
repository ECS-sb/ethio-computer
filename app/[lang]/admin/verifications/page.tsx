import Image from "next/image";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { reviewVerificationAction } from "@/lib/actions";
import { banks, formatDateTime, idTypes, labelOf } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { namesMatch } from "@/lib/names";
import { getPendingVerifications } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Seller verification");

export default async function AdminVerificationsPage() {
  const t = await getT();
  await requireAdmin();
  const requests = await getPendingVerifications();

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Seller verification")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("Approve only when the name on the ID photo, the ID number and the bank account holder are the same person. Call the phone number if you're unsure.")}
      </p>
      {requests.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">{t("Nothing to review.")}</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {requests.map((request) => {
            const checks = [
              { label: t("ID name and bank account name"), ok: namesMatch(request.fullName, request.bankAccountName) },
              { label: t("ID name and Google account name"), ok: namesMatch(request.fullName, request.user.name) },
            ];
            return (
              <li key={request.id} className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-start gap-6">
                  <a href={`/api/admin-files/verification/${request.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                    <Image
                      unoptimized
                      src={`/api/admin-files/verification/${request.id}`}
                      alt={t("ID photo")}
                      width={320}
                      height={200}
                      className="h-48 w-80 max-w-full rounded-xl bg-secondary object-contain ring-1 ring-foreground/10 hover:ring-primary/60"
                    />
                  </a>
                  <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("Full name, as on your ID")}</dt>
                      <dd className="font-semibold">{request.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t(labelOf(idTypes, request.idType))}</dt>
                      <dd className="font-mono" dir="ltr">
                        {request.idNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("Phone")}</dt>
                      <dd dir="ltr">{request.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t(labelOf(banks, request.bankName))}</dt>
                      <dd>
                        <span className="font-mono" dir="ltr">
                          {request.bankAccountNumber}
                        </span>{" "}
                        · {request.bankAccountName}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">{t("User")}</dt>
                      <dd className="break-all">
                        {request.user.name} ({request.user.email}) · {formatDateTime(request.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ring-1",
                        check.ok ? "bg-primary/15 ring-primary/40" : "bg-destructive/10 ring-destructive/40"
                      )}
                    >
                      {check.ok ? <CheckIcon className="size-4 text-primary" /> : <TriangleAlertIcon className="size-4 text-destructive" />}
                      {check.label}: {check.ok ? t("match") : t("don't match")}
                    </li>
                  ))}
                </ul>
                <ReviewForm action={reviewVerificationAction} id={request.id} approveLabel={t("Verify seller")} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
