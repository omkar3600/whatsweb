/**
 * Normalizes a phone number to standard digits-only format.
 * E.g., "+91 98765-43210" -> "919876543210"
 */
export function normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

/**
 * Checks if two phone numbers match after normalization.
 */
export function isSamePhone(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
    const cleanA = normalizePhone(phoneA);
    const cleanB = normalizePhone(phoneB);
    if (!cleanA || !cleanB) return false;
    return cleanA === cleanB || cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA);
}
