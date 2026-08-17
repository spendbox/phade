import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Storing a password so that stealing the database doesn't hand over the shop.
 *
 * scrypt from Node's own crypto: memory-hard, in the standard library, and
 * therefore one fewer dependency to keep patched. Each password gets its own
 * random salt, so two people who pick the same password still store different
 * hashes and a stolen table can't be attacked by rainbow table.
 *
 * The stored form carries everything needed to check it — algorithm, cost and
 * salt — which is what lets the cost be raised later without invalidating
 * every password already set.
 */

/** CPU/memory cost. 2^15 is a few hundred milliseconds on a small server. */
const COST = 2 ** 15;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // The default maxmem is too small for this cost; give it room.
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N: COST, maxmem: 128 * COST * 8 * 2 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt);
  return `scrypt$${COST}$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * True when the password matches what was stored.
 *
 * Never throws on a malformed or missing hash — a row that has somehow lost
 * its password should refuse the sign-in, not crash the login page.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const [scheme, cost, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !cost || !saltHex || !keyHex) return false;

  const rounds = Number(cost);
  if (!Number.isFinite(rounds) || rounds <= 0) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");

    const key = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password.normalize("NFKC"),
        salt,
        expected.length,
        { N: rounds, maxmem: 128 * rounds * 8 * 2 },
        (error, derived) => (error ? reject(error) : resolve(derived)),
      );
    });

    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** What a password must clear before it is allowed to guard an order book. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) {
    return "Use at least 10 characters — a short phrase beats a clever word.";
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}
