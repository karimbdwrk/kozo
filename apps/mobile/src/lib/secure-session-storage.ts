import AsyncStorage from "@react-native-async-storage/async-storage";
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// Storage adapter for the Supabase session.
//
// SecureStore (Keychain / Keystore) limits values to ~2 KB, and a session is
// larger. So the session is encrypted with AES-256-GCM: the ciphertext goes to
// AsyncStorage, the key stays in SecureStore. Each write uses a fresh key.
// A missing key or a tampered ciphertext (GCM authentication fails) is treated
// as "no session": the user simply signs in again.

const KEY_PREFIX = "kozo.session-key.";

// SecureStore keys only allow alphanumerics, ".", "-" and "_".
function secureKeyName(key: string): string {
  return KEY_PREFIX + key.replace(/[^A-Za-z0-9._-]/g, "_");
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function removeItem(key: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(key),
    SecureStore.deleteItemAsync(secureKeyName(key)),
  ]);
}

async function getItem(key: string): Promise<string | null> {
  const [sealed, encodedKey] = await Promise.all([
    AsyncStorage.getItem(key),
    SecureStore.getItemAsync(secureKeyName(key)),
  ]);
  if (!sealed || !encodedKey) return null;

  try {
    const aesKey = await AESEncryptionKey.import(encodedKey, "hex");
    const plaintext = await aesDecryptAsync(AESSealedData.fromCombined(sealed), aesKey, {
      output: "bytes",
    });
    return decoder.decode(plaintext);
  } catch {
    await removeItem(key);
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  const aesKey = await AESEncryptionKey.generate();
  const sealed = await aesEncryptAsync(encoder.encode(value), aesKey);
  const combined = await sealed.combined("base64");

  await SecureStore.setItemAsync(secureKeyName(key), await aesKey.encoded("hex"), {
    // Readable only on this device, after the first unlock since boot.
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  await AsyncStorage.setItem(key, combined);
}

export const secureSessionStorage = { getItem, setItem, removeItem };
