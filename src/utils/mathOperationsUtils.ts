/**
 * Performs modular exponentiation: (base^exp) % mod.
 *
 * This is used to efficiently compute large powers modulo N.
 *
 * @param base - the base value.
 * @param exp - the exponent value.
 * @param mod - the modulo value.
 * @returns the modular exponentiation restuled value.
 */
export function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1)
  base = base % mod

  while (exp > 0) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = (result * base) % mod
    }
    exp = exp >> BigInt(1)
    base = (base * base) % mod
  }

  return result
}
