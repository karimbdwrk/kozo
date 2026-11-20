/// <reference types="jest" />

import { secureSessionStorage } from "./secure-session-storage";

// Logic of the encrypted session adapter. Native AES cannot run under Jest, so
// expo-crypto is replaced by a reversible fake; the point is to check what goes
// where (ciphertext vs key) and how failures are handled.

const mockAsyncStore = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockAsyncStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockAsyncStore.set(k, v)),
    removeItem: jest.fn(async (k: string) => void mockAsyncStore.delete(k)),
  },
}));

jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY",
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockSecureStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockSecureStore.delete(k)),
}));

jest.mock("expo-crypto", () => {
  // Fake "encryption": XOR with the key byte, tagged so tampering is detectable.
  const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  class AESEncryptionKey {
    value: number;
    constructor(value: number) {
      this.value = value;
    }
    static async generate() {
      return new AESEncryptionKey(Math.floor(Math.random() * 200) + 1);
    }
    static async import(hex: string) {
      return new AESEncryptionKey(parseInt(hex, 16));
    }
    async encoded() {
      return this.value.toString(16);
    }
  }
  class AESSealedData {
    payload: string;
    constructor(payload: string) {
      this.payload = payload;
    }
    static fromCombined(combined: string) {
      return new AESSealedData(combined);
    }
    async combined() {
      return this.payload;
    }
  }
  return {
    AESEncryptionKey,
    AESSealedData,
    aesEncryptAsync: async (plain: Uint8Array, key: AESEncryptionKey) =>
      new AESSealedData(`TAG:${toB64(plain.map((b) => b ^ key.value))}`),
    aesDecryptAsync: async (sealed: AESSealedData, key: AESEncryptionKey) => {
      if (!sealed.payload.startsWith("TAG:")) throw new Error("authentication failed");
      return fromB64(sealed.payload.slice(4)).map((b) => b ^ key.value);
    },
  };
});

const STORAGE_KEY = "sb-project-auth-token";
const SESSION = JSON.stringify({ access_token: "secret-token", refresh_token: "refresh" });

beforeEach(() => {
  mockAsyncStore.clear();
  mockSecureStore.clear();
});

test("round-trips a session", async () => {
  await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
  await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
});

test("never writes the session in clear text, and keeps the key in SecureStore", async () => {
  await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

  const stored = mockAsyncStore.get(STORAGE_KEY);
  expect(stored).toBeDefined();
  expect(stored).not.toContain("secret-token");
  expect(mockSecureStore.get(`kozo.session-key.${STORAGE_KEY}`)).toBeDefined();
});

test("returns no session when the key is missing", async () => {
  await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
  mockSecureStore.clear();
  await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
});

test("returns no session and cleans up when the ciphertext was tampered with", async () => {
  await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
  mockAsyncStore.set(STORAGE_KEY, "garbage");

  await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
  expect(mockAsyncStore.has(STORAGE_KEY)).toBe(false);
  expect(mockSecureStore.size).toBe(0);
});

test("removeItem deletes both the ciphertext and the key", async () => {
  await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
  await secureSessionStorage.removeItem(STORAGE_KEY);
  expect(mockAsyncStore.size).toBe(0);
  expect(mockSecureStore.size).toBe(0);
});
