import { fr, type MessageKey } from "@/messages/fr";

export type { MessageKey };

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(fr, value);
}

// Translate a key. Unknown keys (e.g. an unexpected error code) fall back to a
// generic message: raw technical text is never shown to users.
export function t(key: MessageKey | string): string {
  return isMessageKey(key) ? fr[key] : fr["common.genericError"];
}
