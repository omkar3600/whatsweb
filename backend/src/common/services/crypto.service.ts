import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class CryptoService {
    private readonly logger = new Logger(CryptoService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16;
    private readonly authTagLength = 16;

    private getKey(): Buffer {
        const keyHex = process.env.ENCRYPTION_KEY;
        if (!keyHex) {
            throw new Error('ENCRYPTION_KEY environment variable is not set');
        }
        if (keyHex.length !== 64) {
            throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
        }
        return Buffer.from(keyHex, 'hex');
    }

    encrypt(plaintext: string): string {
        if (!plaintext) return plaintext;

        const key = this.getKey();
        const iv = randomBytes(this.ivLength);
        const cipher = createCipheriv(this.algorithm, key, iv, {
            authTagLength: this.authTagLength,
        });

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Format: iv_hex:authTag_hex:ciphertext_hex
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    decrypt(encrypted: string): string {
        if (!encrypted) return encrypted;
        if (!this.isEncrypted(encrypted)) {
            // Return as-is if not in our encrypted format (backward compat for plain tokens)
            return encrypted;
        }

        const key = this.getKey();
        const parts = encrypted.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }

        const [ivHex, authTagHex, ciphertext] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = createDecipheriv(this.algorithm, key, iv, {
            authTagLength: this.authTagLength,
        });
        decipher.setAuthTag(authTag);

        try {
            let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (err: any) {
            this.logger.warn(`Decryption failed (key changed or invalid tag): ${err.message}`);
            return encrypted;
        }
    }

    isEncrypted(value: string): boolean {
        if (!value) return false;
        const parts = value.split(':');
        if (parts.length !== 3) return false;
        // Check if each part is valid hex
        const hexRegex = /^[0-9a-f]+$/i;
        return parts.every(p => hexRegex.test(p)) &&
            parts[0].length === this.ivLength * 2 &&
            parts[1].length === this.authTagLength * 2;
    }

    /**
     * Constant-time comparison to prevent timing attacks
     */
    safeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) return false;
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        return timingSafeEqual(bufA, bufB);
    }
}
