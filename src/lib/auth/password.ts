import crypto from "crypto";

/**
 * Hashes a plaintext password using OWASP-recommended scrypt with a unique random salt.
 * Output format: scrypt:<salt>:<hash>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored hash using timing-safe comparison.
 * Also supports legacy plain text passwords seamlessly for database migration.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) {
    return false;
  }

  // Handle scrypt hashed passwords
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) {
      return false;
    }
    const [, salt, originalHash] = parts;
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, "hex"),
        Buffer.from(originalHash, "hex")
      );
    } catch {
      return false;
    }
  }

  // Fallback for legacy plain text passwords
  return password === storedHash;
}
