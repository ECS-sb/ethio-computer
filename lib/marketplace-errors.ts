import type { MessageKey } from "@/lib/messages";

/** ለተጠቃሚው የሚታይ ስህተት፤ key በlib/messages.ts ውስጥ ያለ ጽሑፍ ነው። */
export class DomainError extends Error {
  constructor(readonly key: MessageKey) {
    super(key);
  }
}
