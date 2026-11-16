/** የድርጅቱ ክፍያ፦ በራሳቸው ሲጨርሱ (SELF) 10%፣ በድርጅቱ ኤጀንት በኩል (AGENT) 15%። ሻጩ ይከፍላል፣ ገዢው የተስማማውን ዋጋ ብቻ። */
export const FEE_PERCENT = { SELF: 10, AGENT: 15 } as const;

export function feeFor(amountEtb: number, feePercent: number) {
  const feeEtb = Math.round((amountEtb * feePercent) / 100);
  return { feeEtb, payoutEtb: amountEtb - feeEtb };
}
