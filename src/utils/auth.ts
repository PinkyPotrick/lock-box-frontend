/* eslint-disable vue/multi-word-component-names */
import { getCookies } from './cookies'
import {
  encryptWithPublicKey,
  generateAESKey,
  encryptWithAESCBC,
  getClientKeyPair,
  decryptWithAESCBC,
  generateAndStoreSecureClientKeyPair,
  deriveEncryptionKey,
  encryptUsername,
  decryptWithPrivateKey
} from './encryption'
import axios from '@/axios-config'
import forge from 'node-forge'

const ITERATIONS = 100000
const KEY_LENGTH = 32
const N_BASE16 = 'EEAF0AB9ADB38DD69C33F80AFA8FC5E860726187' // The group parameter N, a large prime number.
const g_BASE16 = '2' // The group parameter g, a generator modulo N.
const N = BigInt(`0x${N_BASE16}`) // Convert N from hex to a bigint
const g = BigInt(g_BASE16) // Convert g from hex to a bigint
const k = BigInt(3) // Multiplier parameter

console.log('CONSTANTS:') //TODO delete console logs !!!
console.log('N:', N) //TODO delete console logs !!!
console.log('g:', g) //TODO delete console logs !!!
console.log('k:', k) //TODO delete console logs !!!

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
function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
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

/**
 * Generate a random salt based on the specified number of bytes.
 *
 * Trivia: A cryptographic salt is made up of random bits added to each password instance
 * before its hashing. Salts create unique passwords even in the instance of two users choosing
 * the same passwords. Salts help us mitigate hash table attacks by forcing attackers to
 * re-compute them using the salts for each user.
 *
 * @param bytes - number of bytes used to generate the salt.
 * @returns the random generated salt.
 */
function generateSalt(bytes: number = 16): string {
  const salt = forge.random.getBytesSync(bytes)
  return forge.util.bytesToHex(salt) // Convert salt to hex string for storage and use in SRP
}

/**
 * Computes the verifier based on the salt, username, password and group parameters (N, g).
 *
 * @example x = SHA1(s | SHA1(I | ":" | P))
 *          v = g^x % N
 *
 * @param salt - The salt value (s), typically a random string, as a hexadecimal string.
 * @param username - The user name (I).
 * @param password - The user's password (P).
 * @returns
 */
function computeVerifier(salt: string, username: string, password: string): bigint {
  // Compute the inner hash = SHA1(I | ":" | P)
  const innerHash = forge.md.sha1.create()
  innerHash.update(username + ':' + password)
  const innerHashHex = innerHash.digest().toHex() // Get the inner hash as a hex string

  // Compute x = SHA1(s | innerHash)
  const xHash = forge.md.sha1.create()
  xHash.update(forge.util.hexToBytes(salt) + forge.util.hexToBytes(innerHashHex))
  const xHex = xHash.digest().toHex() // Get x as a hex string

  const x = BigInt(`0x${xHex}`) // Convert x from hex to a bigint

  // Compute the verifier v = g^x % N
  const v = modExp(g, x, N)

  return v
}

/**
 * Computes the client's public value A based on the client's private value a.
 *
 * @example A = g^a % N
 *
 * @param a - the client's private value
 * @returns
 */
function computeA(a: bigint): bigint {
  return modExp(g, a, N)
}

/**
 * Computes the private value x based on the salt, username and password.
 *
 * @example x = SHA1(s | SHA1(I | ":" | P))
 *
 * @param salt - The salt value (s), typically a random string, as a hexadecimal string.
 * @param username - The user name (I).
 * @param password - The user's password (P).
 * @returns The private value x as a bigint.
 */
function computeX(salt: string, username: string, password: string): bigint {
  // Compute the inner hash = SHA1(I | ":" | P)
  const innerHash = forge.md.sha1.create()
  innerHash.update(username + ':' + password)
  const innerHashHex = innerHash.digest().toHex()

  // Compute x = SHA1(s | innerHash)
  const xHash = forge.md.sha1.create()
  xHash.update(forge.util.hexToBytes(salt) + forge.util.hexToBytes(innerHashHex))
  return BigInt(`0x${xHash.digest().toHex()}`)
}

/**
 * Computes the scrambling parameter u in the SRP protocol.
 *
 * The parameter u is a 32-bit unsigned integer which takes its value
 * from the first 32 bits (4 bytes) of the SHA1 hash of B, with the
 * most significant byte first (MSB first).
 *
 * @param B - The server's public value (B) as a bigint.
 * @returns The computed scrambling parameter u as a bigint.
 */
function computeU(B: bigint): bigint {
  const B_hex = B.toString(16) // Convert B to a hex string
  const B_hash = forge.md.sha1.create().update(forge.util.hexToBytes(B_hex)).digest().getBytes() // Compute the SHA1 hash of B

  const first32Bits = B_hash.substring(0, 4) // Extract the first 32 bits (4 bytes) from the hash
  const u = BigInt(`0x${forge.util.bytesToHex(first32Bits)}`) // Convert the first 4 bytes to a bigint (32-bit unsigned integer)

  return u
}

/**
 * Computes the shared secret S in the SRP protocol. This shared secret S is used to derive the session key K.
 *
 * @example S = (B - g^x) ^ (a + u * x) % N
 *
 * @param B - The server's public value (B) as a bigint.
 * @param x - The private value (x) as a bigint.
 * @param a - The client's private value (a) as a bigint.
 * @param u - The scrambling parameter (u) as a bigint.
 * @returns The computed shared secret S as a bigint.
 */
function computeS(B: bigint, x: bigint, a: bigint, u: bigint): bigint {
  const gx = modExp(g, x, N) // Compute g^x % N

  let B_minus_gx = B - gx // Ensure non-negative result by adding N before mod

  console.log('[computeS] B:', B) //TODO delete console logs !!!
  console.log('[computeS] gx:', gx) //TODO delete console logs !!!
  console.log('[computeS] B_minus_gx:', B - gx) //TODO delete console logs !!!

  if (B_minus_gx < 0n) {
    console.log('[computeS] B_minus_gx < 0n: We have to add N') //TODO delete console logs !!!
    B_minus_gx += N // Ensure B_minus_gx is positive
    console.log('[computeS] B_minus_gx += N:', B_minus_gx) //TODO delete console logs !!!
  }
  B_minus_gx = B_minus_gx % N
  console.log('[computeS] B_minus_gx = B_minus_gx % N:', B_minus_gx) //TODO delete console logs !!!

  // const B_minus_gx = (B - gx) % N // Compute (B - g^x) % N
  console.log('[computeS] B_minus_gx % N:', B_minus_gx) //TODO delete console logs !!!

  const exp = a + u * x // Compute the exponent (a + u * x)
  const S = modExp(B_minus_gx, exp, N) // Compute S = (B - g^x) ^ (a + u * x) % N

  console.log('[computeS] u * x:', u * x) //TODO delete console logs !!!
  console.log('[computeS] a + u * x:', a + u * x) //TODO delete console logs !!!
  console.log('[computeS] modExp(B_minus_gx, exp, N):', S) //TODO delete console logs !!!

  return S
}

/**
 * Computes the session key K using the SHA_Interleave function.
 *
 * SHA_Interleave is used in SRP-SHA1 to generate a session key that is twice
 * as long as the 160-bit output of SHA1. The process involves interleaving
 * two SHA1 hashes derived from the even and odd bytes of the input.
 *
 * @param S - The shared secret S as a bigint.
 * @returns The session key K as a hexadecimal string.
 */
function computeK(S: bigint): string {
  // Convert S to a byte array and remove leading zeros
  let T = forge.util.hexToBytes(S.toString(16))

  // If the length of T is odd, remove the first byte
  if (T.length % 2 !== 0) {
    T = T.slice(1)
  }

  // Split T into even-numbered and odd-numbered bytes
  const E = []
  const F = []

  for (let i = 0; i < T.length; i += 2) {
    E.push(T.charCodeAt(i)) // Even-indexed bytes
    F.push(T.charCodeAt(i + 1)) // Odd-indexed bytes
  }

  // Convert E and F arrays back to byte strings
  const E_bytes = String.fromCharCode(...E)
  const F_bytes = String.fromCharCode(...F)

  // Compute the SHA1 hashes of E and F
  const G = forge.md.sha1.create().update(E_bytes).digest().getBytes()
  const H = forge.md.sha1.create().update(F_bytes).digest().getBytes()

  // Interleave the two hashes
  let K_bytes = ''
  for (let i = 0; i < G.length; i++) {
    K_bytes += G[i] + H[i]
  }

  // Convert the interleaved byte string to a hexadecimal string
  return forge.util.bytesToHex(K_bytes)
}

/**
 * Computes the client's proof
 *
 * @example M = H(H(N) XOR H(g) | H(U) | s | A | B | K)
 *
 * @param username - The username U.
 * @param salt - The salt s.
 * @param A - The client's public value A.
 * @param B - The server's public value B.
 * @param K - The session key K.
 * @returns The client's proof M as a hexadecimal string.
 */
function computeM(username: string, salt: string, A: bigint, B: bigint, K: string): string {
  // Compute H(N), H(g) and H(U)
  const H_N = forge.md.sha1
    .create()
    .update(forge.util.hexToBytes(N.toString(16)))
    .digest()
    .getBytes()
  const H_g = forge.md.sha1
    .create()
    .update(forge.util.hexToBytes(g.toString(16)))
    .digest()
    .getBytes()
  const H_U = forge.md.sha1.create().update(username).digest().toHex()

  // XOR the hashes byte by byte H(N) XOR H(g)
  const H_N_XOR_H_g = new Uint8Array(H_N.length)
  for (let i = 0; i < H_N.length; i++) {
    H_N_XOR_H_g[i] = H_N.charCodeAt(i) ^ H_g.charCodeAt(i)
  }

  // Compute M = H(H(N) XOR H(g) | H(U) | s | A | B | K)
  const M = forge.md.sha1.create()
  M.update(forge.util.binary.raw.encode(H_N_XOR_H_g))
  M.update(forge.util.hexToBytes(H_U))
  M.update(forge.util.hexToBytes(salt))
  M.update(forge.util.hexToBytes(A.toString(16)))
  M.update(forge.util.hexToBytes(B.toString(16)))
  M.update(forge.util.hexToBytes(K))

  return M.digest().toHex()
}

/**
 * Verifies the server's proof by comparing the server's computed value with the expected value.
 *
 * This function is used to ensure that the server's session key is identical to the client's session key.
 * If the server's proof does not match the expected value, the authentication fails.
 *
 * @param A - The client's public value A.
 * @param M - The client's proof M.
 * @param K - The session key K derived from the shared secret.
 * @param serverProofM - The server's proof value received from the server.
 * @returns
 */
function verifyServerProof(A: bigint, M: string, K: string, serverProofM: string): boolean {
  const digest = forge.md.sha1.create()
  digest.update(forge.util.hexToBytes(A.toString(16)))
  digest.update(forge.util.hexToBytes(M))
  digest.update(forge.util.hexToBytes(K))

  const expectedServerProof = digest.digest().toHex()
  return expectedServerProof === serverProofM
}

// _______________________________________________ ABOVE WE HAVE HELPER FUNCTIONS _______________________________________________

/**
 * Fetches the server's public key
 * @returns the public key string
 */
const fetchPublicKey = async (): Promise<string> => {
  const response = await axios.get('/api/auth/public-key')
  return response?.data?.item
}

/**
 * Registers the user and fetches a valid session token
 * @param data - the encrypted { derivedKey, username, email, salt, encryptedVerifier,
 *               encryptedClientPublicKey, encryptedClientPrivateKey }
 * @returns encrypted AES session token { encryptedSessionToken, helperAesKey }
 */
const registerUser = async (data: object) => {
  const response = await axios.post('/api/auth/register', data)
  return response?.data?.item
}

/**
 * Fetches the stored SRP params
 * @param data - the encrypted { derivedKey, username, encryptedClientPublicValueA,
 *               encryptedPublicKey, helperAesKey }
 * @returns encrypted salt and encrypted AES server's public value B { salt,
 *          encryptedServerPublicValueB, helperAesKey }
 */
const fetchSrpParams = async (data: object) => {
  const response = await axios.post('/api/auth/srp-params', data)
  return response?.data?.item
}

/**
 * Authenticates the user and fetches a valid session token
 * @param data - the encrypted { clientProofM }
 * @returns encrypted AES server proof and session token { encryptedM2, encryptedSessionToken, helperAesKey }
 */
const authenticateUser = async (data: object) => {
  const response = await axios.post('/api/auth/srp-authenticate', data)
  return response?.data?.item
}

/**
 * Handler for the SRP registration process.
 * @param username - the inserted username value.
 * @param email - the inserted email value.
 * @param password - the inserted password value.
 */
export const handleRegister = async (username: string, email: string, password: string) => {
  try {
    generateAndStoreSecureClientKeyPair(username, password)
    const { publicKeyPem: clientPublicKeyPem, privateKeyPem: clientPrivateKeyPem } =
      await getClientKeyPair(username, password)

    const salt = generateSalt() // Generate a random salt
    const verifier = computeVerifier(salt, username, password) // Compute the verifier
    const serverPublicKeyPem = await fetchPublicKey() // Fetch the server's public key
    const aesKey = generateAESKey() // Generate an AES key

    console.log('[REGISTER] For debugging purposes:\n') //TODO delete console logs !!!
    console.log('salt (s):', salt) //TODO delete console logs !!!
    console.log('verifier (v):', verifier) //TODO delete console logs !!!

    // Encrypt the verifier using the AES key
    const {
      encryptedData: encryptedAESVerifier,
      iv: ivVerifier,
      hmac: hmacVerifier
    } = encryptWithAESCBC(padHex(verifier), aesKey)

    // Encrypt the client's public key using the AES key
    const {
      encryptedData: encryptedAESClientPublicKey,
      iv: ivClientPublicKey,
      hmac: hmacClientPublicKey
    } = encryptWithAESCBC(clientPublicKeyPem, aesKey)

    // Encrypt the client's private key using the AES key
    const {
      encryptedData: encryptedAESClientPrivateKey,
      iv: ivClientPrivateKey,
      hmac: hmacClientPrivateKey
    } = encryptWithAESCBC(clientPrivateKeyPem, aesKey)

    // Encrypt the username using a derived key from the username and password
    const derivedKey = deriveEncryptionKey(username, password)
    const derivedUsername = encryptUsername(username, derivedKey)

    // Prepare the encrypted data to be sent to the server for registration
    const encryptedData = {
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      username: encryptWithPublicKey(derivedUsername, serverPublicKeyPem),
      email: encryptWithPublicKey(email, serverPublicKeyPem),
      salt: encryptWithPublicKey(salt, serverPublicKeyPem),
      encryptedClientVerifier: {
        encryptedDataBase64: encryptedAESVerifier,
        ivBase64: ivVerifier,
        hmacBase64: hmacVerifier
      },
      encryptedClientPublicKey: {
        encryptedDataBase64: encryptedAESClientPublicKey,
        ivBase64: ivClientPublicKey,
        hmacBase64: hmacClientPublicKey
      },
      encryptedClientPrivateKey: {
        encryptedDataBase64: encryptedAESClientPrivateKey,
        ivBase64: ivClientPrivateKey,
        hmacBase64: hmacClientPrivateKey
      },
      helperAesKey: aesKey // This value cannot be encrypted (it should be protected by SSL)
    }
    console.log('Registering user...')
    const { encryptedSessionToken, helperAesKey } = await registerUser(encryptedData)

    // Decrypt the retrieved session token
    const sessionToken = decryptWithAESCBC(
      encryptedSessionToken.encryptedDataBase64,
      encryptedSessionToken.ivBase64,
      encryptedSessionToken.hmacBase64,
      helperAesKey
    )

    console.log('Registered successfully!...') //TODO delete console logs !!!
    console.log('sessionToken:', sessionToken) //TODO delete console logs !!!

    // Store the session token securely
    const cookies = getCookies()
    cookies.set('auth_token', sessionToken, '5min', '', '', true, 'Strict')
  } catch (error) {
    console.error('Registration failed:', error)
    throw error
  }
}

// Implements the SRP login process.
export const handleLogin = async (username: string, password: string) => {
  try {
    generateAndStoreSecureClientKeyPair(username, password)
    const { publicKeyPem: clientPublicKeyPem, privateKeyPem: clientPrivateKeyPem } =
      await getClientKeyPair(username, password)

    const clientPrivateValueA = bigIntFromBytes(forge.random.getBytesSync(32)) // Generate a random client's private value a
    const clientPublicValueA = computeA(clientPrivateValueA) // Compute the client's public value A
    const serverPublicKeyPem = await fetchPublicKey() // Fetch the server's public key
    const aesKey = generateAESKey() // Generate an AES key

    console.log('[LOGIN] For debugging purposes:\n') //TODO delete console logs !!!
    console.log('clientPrivateValueA (a):', clientPrivateValueA) //TODO delete console logs !!!
    console.log('clientPublicValueA (A):', clientPublicValueA) //TODO delete console logs !!!

    // Encrypt the client's public value A using the AES key
    const {
      encryptedData: encryptedAESA,
      iv: ivA,
      hmac: hmacA
    } = encryptWithAESCBC(padHex(clientPublicValueA), aesKey)

    // Encrypt the client's private value A using the AES key
    const {
      encryptedData: encryptedAESa,
      iv: iva,
      hmac: hmaca
    } = encryptWithAESCBC(padHex(clientPrivateValueA), aesKey)

    // Encrypt the client's public key using the AES key
    const {
      encryptedData: encryptedAESClientPublicKey,
      iv: ivClientPublicKey,
      hmac: hmacClientPublicKey
    } = encryptWithAESCBC(clientPublicKeyPem, aesKey)

    // Encrypt the username using a derived key from the username and password
    const derivedKey = deriveEncryptionKey(username, password)
    const derivedUsername = encryptUsername(username, derivedKey)

    // Prepare the encrypted data to be sent to the server to receive the salt and server's public value B
    const encryptedSrpParamsData = {
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      username: encryptWithPublicKey(derivedUsername, serverPublicKeyPem),
      encryptedClientPublicValueA: {
        encryptedDataBase64: encryptedAESA,
        ivBase64: ivA,
        hmacBase64: hmacA
      },
      encryptedClientPrivateValueA: {
        encryptedDataBase64: encryptedAESa,
        ivBase64: iva,
        hmacBase64: hmaca
      },
      encryptedClientPublicKey: {
        encryptedDataBase64: encryptedAESClientPublicKey,
        ivBase64: ivClientPublicKey,
        hmacBase64: hmacClientPublicKey
      },
      helperAesKey: aesKey // This value cannot be encrypted (it should be protected by SSL)
    }
    console.log('Fetching SRP user...') //TODO delete console logs !!!
    const { encryptedServerPublicValueB, helperSrpParamsAesKey, salt } =
      await fetchSrpParams(encryptedSrpParamsData)

    // Decrypt the retrieved server's public value B
    const serverPublicValueB = decryptWithAESCBC(
      encryptedServerPublicValueB.encryptedDataBase64,
      encryptedServerPublicValueB.ivBase64,
      encryptedServerPublicValueB.hmacBase64,
      helperSrpParamsAesKey
    )
    console.log('Fetched successfully!...') //TODO delete console logs !!!
    console.log('Received salt (s):', salt) //TODO delete console logs !!!
    console.log('Received serverPublicValueB (B):', serverPublicValueB) //TODO delete console logs !!!
    console.log('Received serverPublicValueB (B) (BigInt):', BigInt(`0x${serverPublicValueB}`)) //TODO delete console logs !!!
    console.log('derivedUsername (U):', derivedUsername) //TODO delete console logs !!!

    // Abort authentication if B % N == 0
    if (BigInt(`0x${serverPublicValueB}`) % N === 0n) {
      throw new Error('Authentication failed: Invalid server value B.')
    }

    // derivedUsername is used because the backend uses the same 'derivedUsername' value
    const privateValueX = computeX(salt, derivedUsername, password)
    const scramblingParameterU = computeU(BigInt(`0x${serverPublicValueB}`))
    const sharedSecretS = computeS(
      BigInt(`0x${serverPublicValueB}`),
      privateValueX,
      clientPrivateValueA,
      scramblingParameterU
    )
    const sessionKeyK = computeK(sharedSecretS)
    const clientProofM = computeM(
      username,
      salt,
      clientPublicValueA,
      BigInt(`0x${serverPublicValueB}`),
      sessionKeyK
    )

    console.log('privateValueX (x): ', privateValueX.toString()) //TODO delete console logs !!!
    console.log('scramblingParameterU (u): ', scramblingParameterU.toString()) //TODO delete console logs !!!
    console.log('sharedSecretS (S): ', sharedSecretS.toString()) //TODO delete console logs !!!
    console.log('sessionKeyK (K): ', sessionKeyK.toString()) //TODO delete console logs !!!
    console.log('clientProofM (M1): ', clientProofM.toString()) //TODO delete console logs !!!

    const encryptedClientProofM = encryptWithPublicKey(clientProofM, serverPublicKeyPem)

    // Prepare the encrypted data to be sent to the server to receive the salt and server's public value B
    const encryptedData = {
      encryptedClientProofM: encryptedClientProofM
    }
    console.log('Authenticating user...') //TODO delete console logs !!!
    const { encryptedServerProofM, encryptedSessionToken, helperAuthenticateAesKey } =
      await authenticateUser(encryptedData)

    // Decrypt the retrieved session token and server proof
    const sessionToken = decryptWithAESCBC(
      encryptedSessionToken.encryptedDataBase64,
      encryptedSessionToken.ivBase64,
      encryptedSessionToken.hmacBase64,
      helperAuthenticateAesKey
    )
    const serverProofM = decryptWithPrivateKey(encryptedServerProofM, clientPrivateKeyPem)

    console.log('Authenticated successfully!...') //TODO delete console logs !!!
    console.log('sessionToken:', sessionToken) //TODO delete console logs !!!
    console.log('serverProofM (M2):', serverProofM) //TODO delete console logs !!!

    // // Compute the HMAC
    // const hmac2 = forge.hmac.create()
    // hmac2.start('sha256', K) // Start HMAC with SHA-256 and the key
    // hmac2.update(forge.util.createBuffer(padHex(A)).getBytes())
    // hmac2.update(forge.util.createBuffer(B).getBytes())
    // hmac2.update(forge.util.createBuffer(padHex(S)).getBytes())

    // // Get the HMAC result as a hex string
    // const M1Hex = hmac2.digest().toHex()

    // Send `M1` to the server and receive `M2` and session token
    // const {
    //   data: { encryptedM2, encryptedSessionToken }
    // } = await axios.post('/api/auth/srp-authenticate', {
    //   derivedKey: encryptedData.derivedKey,
    //   username: encryptedData.username,
    //   mmm: M1Hex
    //   // A: encryptedData.encryptedA
    // })

    // const sessionToken = decryptWithAESCBC(
    //   encryptedSessionToken.encryptedDataBase64,
    //   encryptedSessionToken.ivBase64,
    //   encryptedSessionToken.hmacBase64,
    //   helperAesKey
    // )

    // Decrypt the session token and `M2` using the client's private key
    // const decryptedM2 = decryptWithPrivateKey(encryptedM2, clientPrivateKeyPem)

    // Verify server's M2 (server evidence message)
    // const expectedM2 = hmac(
    //   K,
    //   forge.util
    //     .createBuffer(padHex(A))
    //     .putBuffer(M1)
    //     .putBuffer(forge.util.createBuffer(padHex(S)))
    // )
    // if (decryptedM2 !== expectedM2.toHex()) {
    //   throw new Error('Server verification failed. M2 mismatch.')
    // }

    const cookies = getCookies()
    cookies.set('auth_token', sessionToken, '5min', '', '', true, 'Strict')
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}

// ---------------------------------------- ABOVE IS ONLY CLEAN CODE ----------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Converts a `forge` WordArray to a BigInt.
function bigIntFromBytes(bytes: string): bigint {
  return BigInt(`0x${forge.util.bytesToHex(bytes)}`)
}

// Pads a BigInt to a hexadecimal string with leading zeros.
function padHex(bigInt: bigint): string {
  return bigInt.toString(16).padStart(64, '0')
}

// Computes the SHA-256 hash of the input data.
function hash(data: string | forge.util.ByteBuffer): forge.util.ByteBuffer {
  const md = forge.md.sha256.create()
  md.update(typeof data === 'string' ? data : data.bytes())
  return md.digest()
}

// Computes the HMAC using SHA-256.
function hmac(
  key: forge.util.ByteBuffer,
  data: string | forge.util.ByteBuffer
): forge.util.ByteBuffer {
  const hmac = forge.hmac.create()
  hmac.start('sha256', key)
  hmac.update(typeof data === 'string' ? data : data.bytes())
  return hmac.digest()
}

// Derives x using the salt, username, and password with PBKDF2.
export async function deriveX(salt: string, username: string, password: string): Promise<bigint> {
  const innerHash = hash(`${username}:${password}`).toHex()
  const xHash = forge.pkcs5.pbkdf2(innerHash, forge.util.hexToBytes(salt), ITERATIONS, KEY_LENGTH)
  const x = bigIntFromBytes(hash(forge.util.hexToBytes(salt) + xHash).toHex())
  return x
}

export const getAuthToken = (): string | null => {
  const cookies = getCookies()
  return cookies?.get('auth_token')
}

export const isLoggedIn = (): boolean => {
  return !!getAuthToken()
}
