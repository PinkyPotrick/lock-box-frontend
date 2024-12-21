import forge from 'node-forge'

/**
 * Converts a string of bytes to a BigInt.
 * This function assumes the byte string is in a raw binary format and converts it to a hex string
 * before converting that string to a BigInt.
 *
 * @param bytes - The byte string to be converted into a BigInt.
 * @return The BigInt representation of the input byte string.
 */
export function bigIntFromBytes(bytes: string): bigint {
  return BigInt(`0x${forge.util.bytesToHex(bytes)}`)
}

/**
 * Pads a BigInt to a hex string with leading zeros.
 * This function converts a BigInt to a hex string and pads it with leading zeros
 * to ensure the string is at least 64 characters long, suitable for consistent cryptographic operations
 * that require fixed-length inputs.
 *
 * @param bigInt - The BigInt to be converted and padded.
 * @return The padded hexadecimal string representation of the BigInt.
 */
export function padHex(bigInt: bigint): string {
  return bigInt.toString(16).padStart(64, '0')
}
