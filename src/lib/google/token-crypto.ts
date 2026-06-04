import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const rawKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    throw new Error("Missing GMAIL_TOKEN_ENCRYPTION_KEY.");
  }

  const normalizedKey = rawKey.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalizedKey.length % 4)) % 4;
  const paddedKey = normalizedKey + "=".repeat(paddingLength);

  let key: Buffer;

  try {
    key = rawKey.length === 64 ? Buffer.from(rawKey, "hex") : Buffer.from(paddedKey, "base64");
  } catch {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must be valid base64url, base64, or hex.");
  }

  if (key.byteLength !== 32) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}

export function encryptGoogleToken(token: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptGoogleToken(ciphertext: string) {
  const payload = Buffer.from(ciphertext, "base64url");

  if (payload.byteLength <= IV_LENGTH + 16) {
    throw new Error("Invalid encrypted Gmail token payload.");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = payload.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
