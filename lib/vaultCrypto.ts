import {
  scrypt,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export type EncryptedVault = {
  salt: string;   // hex
  iv: string;     // hex
  authTag: string;// hex
  data: string;   // hex — AES-256-GCM ciphertext
};

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return scryptAsync(password, salt, 32) as Promise<Buffer>;
}

export async function encryptVault(
  plaintext: string,
  masterPassword: string
): Promise<EncryptedVault> {
  const salt = randomBytes(32);
  const iv   = randomBytes(16);
  const key  = await deriveKey(masterPassword, salt);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc1 = cipher.update(plaintext, "utf8");
  const enc2 = cipher.final();
  const authTag = cipher.getAuthTag();

  return {
    salt:    salt.toString("hex"),
    iv:      iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data:    Buffer.concat([enc1, enc2]).toString("hex"),
  };
}

export async function decryptVault(
  vault: EncryptedVault,
  masterPassword: string
): Promise<string> {
  const salt   = Buffer.from(vault.salt, "hex");
  const iv     = Buffer.from(vault.iv, "hex");
  const authTag = Buffer.from(vault.authTag, "hex");
  const data   = Buffer.from(vault.data, "hex");
  const key    = await deriveKey(masterPassword, salt);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const dec1 = decipher.update(data);
  const dec2 = decipher.final();
  return Buffer.concat([dec1, dec2]).toString("utf8");
}
