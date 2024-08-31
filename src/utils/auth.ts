/* eslint-disable vue/multi-word-component-names */
import { getCookies } from './cookies'
import {
  encryptWithPublicKey,
  decryptWithPrivateKey,
  generateAESKey,
  encryptWithAESCBC,
  getClientKeyPair,
  decryptWithAESCBC,
  generateAndStoreSecureClientKeyPair,
  deriveEncryptionKey,
  encryptUsername
} from './encryption'
import axios from '@/axios-config'
import crypto from 'crypto-js'

export const HASH_ALGORITHM = 'sha256'
export const ITERATIONS = 100000
export const KEY_LENGTH = 32

const N_base16 =
  '115b8b692e0e045692cf280b07a9b05f72e6f9c3b70d0b13136f2c55e9b6ef9f03e8d679c5c75641f37e14fdd87dc8b7ff88a5c0d5e8d889e9094dbdc6bcf8ad5b32b6bdfed719c9e050f47c9c02b6de5e91c0bde6717db3e7a466db92a82aaf5645085b8a6925ef13f776a4b3a109d1a1922cfbb87b4b0360dfe4e3b6f0e9f8426a42e58ec0a7'
const g_base16 = '2'

const N = BigInt(`0x${N_base16}`)
const g = BigInt(g_base16)
const k = BigInt(`0x${crypto.SHA256(padHex(N) + padHex(g)).toString(crypto.enc.Hex)}`)

// Converts a `crypto-js` WordArray to a BigInt.
function bigIntFromWordArray(wordArray: crypto.lib.WordArray): bigint {
  return BigInt(`0x${wordArray.toString(crypto.enc.Hex)}`)
}

// Pads a BigInt to a hexadecimal string with leading zeros.
function padHex(bigInt: bigint): string {
  return bigInt.toString(16).padStart(64, '0')
}

// Computes the SHA-256 hash of the input data.
function hash(data: string | crypto.lib.WordArray): crypto.lib.WordArray {
  return crypto.SHA256(data)
}

// Computes the HMAC using SHA-256.
function hmac(
  key: crypto.lib.WordArray,
  data: string | crypto.lib.WordArray
): crypto.lib.WordArray {
  return crypto.HmacSHA256(data, key)
}

// Derives x using the salt, username, and password with PBKDF2.
export async function deriveX(salt: string, username: string, password: string): Promise<bigint> {
  const innerHash = crypto.SHA256(`${username}:${password}`)
  const xHash = crypto.PBKDF2(innerHash.toString(crypto.enc.Hex), crypto.enc.Hex.parse(salt), {
    keySize: KEY_LENGTH / 4,
    iterations: ITERATIONS,
    hasher: crypto.algo.SHA256
  })
  const x = bigIntFromWordArray(crypto.SHA256(crypto.enc.Hex.parse(salt).concat(xHash)))
  return x
}

/**
 * Performs modular exponentiation: (base^exp) % mod
 * This is used to efficiently compute large powers modulo N.
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

// Computes the verifier v = g^x % N.
export function computeVerifier(x: bigint): bigint {
  return modExp(g, x, N)
}

// Computes the client's public value A = g^a % N.
export function computeA(a: bigint): bigint {
  return modExp(g, a, N)
}

// Computes the scrambling parameter u = H(A | B).
export function computeU(A: bigint, B: bigint): bigint {
  const uHash = hash(crypto.enc.Hex.parse(padHex(A)).concat(crypto.enc.Hex.parse(padHex(B))))
  return bigIntFromWordArray(uHash)
}

// Computes the shared secret S = (B - k * v) ^ (a + u * x) % N.
export function computeS(B: bigint, k: bigint, v: bigint, u: bigint, x: bigint, a: bigint): bigint {
  console.log('B:', B.toString())
  console.log('k * v:', (k * v).toString())
  console.log('B - k * v:', (B - k * v).toString())

  const base = B - k * v // Calculate the base (B - k * v)
  const exp = a + u * x // Calculate the exponent (a + u * x)

  if (base <= 0n) {
    throw new Error('Base must be positive')
  }

  if (B > N) {
    throw new Error('Invalid B value, exceeds modulus N')
  }

  return modExp(base, exp, N)
}

// Computes the session key K = H(S).
export function computeK(S: bigint): crypto.lib.WordArray {
  return hash(crypto.enc.Hex.parse(padHex(S)))
}

// Fetches the server's public key
const fetchPublicKey = async (): Promise<string> => {
  const response = await axios.get('/api/auth/public-key')
  return response?.data?.item
}

// Registers the user and fetches a valid session token
const registerUser = async (data: object) => {
  const response = await axios.post('/api/auth/register', data)
  return response?.data?.item
}

// Fetches the SRP params
// const fetchSrpParams = async (data: object) => {
//   // TODO implement later !!!
// }

// // Logs in the user and fetches a valid session token
// const loginUser = async (data: object) => {
//   // TODO implement later !!!
// }

// Implements the SRP registration process.
export const handleRegister = async (username: string, email: string, password: string) => {
  try {
    // Generate and store the client's secure key pair
    generateAndStoreSecureClientKeyPair(username, password) // REMEMBER THAT THE PRIVATE KEY IS GENERATED WITH "BEGIN RSA PRIVATE KEY"

    // Step 1: Generate and store the client's secure key pair and retrieve the client's private key
    const { publicKeyPem: clientPublicKeyPem, privateKeyPem: clientPrivateKeyPem } =
      await getClientKeyPair(username, password)

    // Step 2: Generate a random salt
    const salt = crypto.lib.WordArray.random(16).toString(crypto.enc.Hex)

    // Step 3: Derive x using the salt, username, and password
    const x = await deriveX(salt, username, password)

    // Step 4: Compute the verifier v = g^x % N
    const v = computeVerifier(x)

    // Step 5: Fetch the server's public key
    const serverPublicKeyPem = await fetchPublicKey()

    // Step 6: Generate an AES key
    const aesKey = generateAESKey()

    // Encrypt the verifier using the AES key
    const {
      encryptedData: encryptedAESVerifier,
      iv: ivVerifier,
      hmac: hmacVerifier
    } = encryptWithAESCBC(padHex(v), aesKey)

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
    const encryptedUsername = encryptUsername(username, derivedKey)

    // Step 7: Send the encrypted email, username, salt, and verifier to the server for registration
    const encryptedData = {
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      username: encryptWithPublicKey(encryptedUsername, serverPublicKeyPem),
      email: encryptWithPublicKey(email, serverPublicKeyPem),
      salt: encryptWithPublicKey(salt, serverPublicKeyPem),
      encryptedVerifier: {
        encryptedDataBase64: encryptedAESVerifier,
        ivBase64: ivVerifier,
        hmacBase64: hmacVerifier
      },
      encryptedPublicKey: {
        encryptedDataBase64: encryptedAESClientPublicKey,
        ivBase64: ivClientPublicKey,
        hmacBase64: hmacClientPublicKey
      },
      encryptedPrivateKey: {
        encryptedDataBase64: encryptedAESClientPrivateKey,
        ivBase64: ivClientPrivateKey,
        hmacBase64: hmacClientPrivateKey
      },
      helperAesKey: aesKey // This value cannot be encrypted (it should be protected by SSL)
    }
    const { encryptedSessionToken, helperAesKey } = await registerUser(encryptedData)

    // Step 8: Retrieve the client's private key and decrypt the session token
    const sessionToken = decryptWithAESCBC(
      encryptedSessionToken.encryptedDataBase64,
      encryptedSessionToken.ivBase64,
      encryptedSessionToken.hmacBase64,
      helperAesKey
    )

    // Step 9: Store the session token securely
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
    // Generate and store the client's secure key pair
    generateAndStoreSecureClientKeyPair(username, password)

    // Step 1: Retrieve the client's key pair
    const { publicKeyPem: clientPublicKeyPem, privateKeyPem: clientPrivateKeyPem } =
      await getClientKeyPair(username, password)

    console.log('clientPublicKeyPem:\n', clientPublicKeyPem)
    console.log('clientPrivateKeyPem:\n', clientPrivateKeyPem)
    // Step 2: Generate a random private value a and compute the public value A = g^a % N
    const a = bigIntFromWordArray(crypto.lib.WordArray.random(32))
    const A = computeA(a)

    // Step 5: Fetch the server's public key
    const serverPublicKeyPem = await fetchPublicKey()

    // Step 6: Generate an AES key
    const aesKey = generateAESKey()

    // Encrypt the verifier using the AES key
    const {
      encryptedData: encryptedAESA,
      iv: ivA,
      hmac: hmacA
    } = encryptWithAESCBC(padHex(A), aesKey)

    // Encrypt the client's public key using the AES key
    const {
      encryptedData: encryptedAESClientPublicKey,
      iv: ivClientPublicKey,
      hmac: hmacClientPublicKey
    } = encryptWithAESCBC(clientPublicKeyPem, aesKey)

    // Encrypt the username using a derived key from the username and password
    const derivedKey = deriveEncryptionKey(username, password)
    const encryptedUsername = encryptUsername(username, derivedKey)

    // Step 4: Encrypt the username and `A` using the server's public key
    const encryptedData = {
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      username: encryptWithPublicKey(encryptedUsername, serverPublicKeyPem),
      encryptedA: {
        encryptedDataBase64: encryptedAESA,
        ivBase64: ivA,
        hmacBase64: hmacA
      },
      encryptedPublicKey: {
        encryptedDataBase64: encryptedAESClientPublicKey,
        ivBase64: ivClientPublicKey,
        hmacBase64: hmacClientPublicKey
      },
      helperAesKey: aesKey // This value cannot be encrypted (it should be protected by SSL)
    }

    // Step 5: Send the encrypted data to the server to receive salt and B
    const {
      data: { salt, encryptedB, helperAesKey }
    } = await axios.post('/api/auth/srp-params', encryptedData)

    // Step 8: Retrieve the client's private key and decrypt the session token
    const B = decryptWithAESCBC(
      encryptedB.encryptedDataBase64,
      encryptedB.ivBase64,
      encryptedB.hmacBase64,
      helperAesKey
    )

    // Step 6: Compute x, u, S, K
    const x = await deriveX(salt, username, password)
    const u = computeU(A, BigInt(`0x${B}`))
    const v = computeVerifier(x)
    const S = computeS(BigInt(`0x${B}`), k, v, u, x, a)
    const K = computeK(S)

    // Step 7: Compute the client evidence message `M1` and encrypt it
    const M1 = hmac(
      K,
      crypto.enc.Hex.parse(padHex(A))
        .concat(crypto.enc.Hex.parse(B))
        .concat(crypto.enc.Hex.parse(padHex(S)))
    )
    const encryptedM1 = encryptWithPublicKey(M1.toString(crypto.enc.Hex), serverPublicKeyPem)

    // Step 8: Send `M1` to the server and receive `M2` and session token
    const {
      data: { encryptedM2, encryptedSessionToken }
    } = await axios.post('/api/auth/srp-authenticate', {
      username: encryptedData.username,
      M1: encryptedM1,
      A: encryptedData.encryptedA,
      clientPublicKey: clientPublicKeyPem
    })

    // Step 9: Decrypt the session token and `M2` using the client's private key
    const decryptedSessionToken = decryptWithPrivateKey(encryptedSessionToken, clientPrivateKeyPem)
    const decryptedM2 = decryptWithPrivateKey(encryptedM2, clientPrivateKeyPem)

    // Step 10: Verify server's M2 (server evidence message)
    const expectedM2 = hmac(
      K,
      crypto.enc.Hex.parse(padHex(A))
        .concat(M1)
        .concat(crypto.enc.Hex.parse(padHex(S)))
    )
    if (decryptedM2 !== expectedM2.toString(crypto.enc.Hex)) {
      throw new Error('Server verification failed. M2 mismatch.')
    }

    // Step 11: Store the session token securely
    const cookies = getCookies()
    cookies.set('auth_token', decryptedSessionToken, '5min', '', '', true, 'Strict')
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}

export const getAuthToken = (): string | null => {
  const cookies = getCookies()
  return cookies?.get('auth_token')
}

export const isLoggedIn = (): boolean => {
  return !!getAuthToken()
}
