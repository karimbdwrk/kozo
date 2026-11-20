import { fr, type MessageKey } from "@/messages/fr";

export type { MessageKey };

function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(fr, value);
}

// Unknown keys fall back to a generic message: raw technical text is never shown.
export function t(key: MessageKey | string): string {
  return isMessageKey(key) ? fr[key] : fr["common.genericError"];
}
