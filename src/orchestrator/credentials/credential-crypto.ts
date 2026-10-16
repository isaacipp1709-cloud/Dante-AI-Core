import crypto from 'node:crypto';

/**
 * Cifrado de credenciales BYOK en Dante-AI-Core.
 * AES-256-GCM con verificacion de authTag; la clave maestra se deriva de
 * CREDENTIAL_MASTER_SECRET y nunca se persiste ni se expone.
 */

export const CREDENTIAL_ALGORITHM = 'aes-256-gcm' as const;
export const CREDENTIAL_KEY_BYTES = 32;
export const CREDENTIAL_IV_BYTES = 12;
export const CREDENTIAL_SALT = 'dante-byok-v1';

export class CredentialConfigurationError extends Error {
  constructor(message = 'CREDENTIAL_MASTER_SECRET is not configured') {
    super(message);
    this.name = 'CredentialConfigurationError';
  }
}

/** Error generico: no revela si el fallo es de authTag, formato o clave. */
export class CredentialIntegrityError extends Error {
  constructor() {
    super('Invalid credential');
    this.name = 'CredentialIntegrityError';
  }
}

export interface EncryptedCredential {
  algorithm: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function deriveMasterKey(masterSecret: string | undefined): Buffer {
  if (typeof masterSecret !== 'string' || masterSecret.length === 0) {
    throw new CredentialConfigurationError();
  }
  return crypto.scryptSync(masterSecret, CREDENTIAL_SALT, CREDENTIAL_KEY_BYTES);
}

export class CredentialCrypto {
  private readonly key: Buffer;

  constructor(masterSecret: string | undefined = process.env.CREDENTIAL_MASTER_SECRET) {
    this.key = deriveMasterKey(masterSecret);
  }

  encrypt(plaintext: string): EncryptedCredential {
    const iv = crypto.randomBytes(CREDENTIAL_IV_BYTES);
    const cipher = crypto.createCipheriv(CREDENTIAL_ALGORITHM, this.key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    return {
      algorithm: CREDENTIAL_ALGORITHM,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext,
    };
  }

  decrypt(payload: EncryptedCredential): string {
    if (!payload || payload.algorithm !== CREDENTIAL_ALGORITHM) {
      throw new CredentialIntegrityError();
    }
    try {
      const decipher = crypto.createDecipheriv(
        CREDENTIAL_ALGORITHM,
        this.key,
        Buffer.from(payload.iv, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
      let plaintext = decipher.update(payload.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      return plaintext;
    } catch {
      throw new CredentialIntegrityError();
    }
  }
}
