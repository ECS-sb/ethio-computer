// ቴሌግራም ቦቱ በድርጅቱ ስም መልዕክት እንዲልክ የሚፈቅደው ሰውየው ባለፉት 24 ሰዓታት ውስጥ ከጻፈ ብቻ ነው። ምንም database አይጠቀምም።

/** 24 ሰዓት (ለጥንቃቄ 5 ደቂቃ ተቀንሶ) */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000 - 5 * 60 * 1000;

export function canReplyNow(lastInboundAt: Date | null, now = new Date()): boolean {
  return lastInboundAt !== null && now.getTime() - lastInboundAt.getTime() < REPLY_WINDOW_MS;
}
