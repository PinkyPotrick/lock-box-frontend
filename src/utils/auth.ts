/* eslint-disable vue/multi-word-component-names */
import { useCookies } from './cookies'
import {
  decryptWithPrivateKey,
  generateAndStoreSecureClientKeyPair,
  getClientKeyPair
} from './encryption'
import axios from '@/axios-config'
import crypto from 'crypto-js'

export const HASH_ALGORITHM = 'sha256'
export const ITERATIONS = 100000
export const KEY_LENGTH = 32

const N_base16 =
  '115b8b692e0e045692cf280b07a9b05f72e6f9c3b70d0b13136f2c55e9b6ef9f03e8d679c5c75641f37e14fdd87dc8b7ff88a5c0d5e8d889e9094dbdc6bcf8ad5b32b6bdfed719c9e050f47c9c02b6de5e91c0bde6717db3e7a466db92a82aaf5645085b8a6925ef13f776a4b3a109d1a1922cfbb87b4b0360dfe4e3b6f0e9f8426a42e58ec0a7'
const g_base16 = '2'

// Example public key from the server (in PEM format)
const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1x...
-----END PUBLIC KEY-----`

const N = BigInt(`0x${N_base16}`)
const g = BigInt(g_base16)
const k = BigInt(`0x${crypto.SHA256(N_base16 + g_base16).toString(crypto.enc.Hex)}`)

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

async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key)
  const exportedAsString = String.fromCharCode(...new Uint8Array(exported))
  const exportedAsBase64 = window.btoa(exportedAsString)
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const binaryDerString = window.atob(pem.replace(/-----\w+ PUBLIC KEY-----/g, ''))
  const binaryDer = new Uint8Array(binaryDerString.length)
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i)
  }
  return window.crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  )
}

async function encryptWithPublicKey(data: string, publicKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    encoder.encode(data)
  )
  return window.btoa(String.fromCharCode(...new Uint8Array(encrypted)))
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
  const exp = a + u * x
  const S = (B - k * v) ** exp % N
  return S
}

// Computes the session key K = H(S).
export function computeK(S: bigint): crypto.lib.WordArray {
  return hash(crypto.enc.Hex.parse(padHex(S)))
}

// Implements the SRP registration process.
export const handleRegister = async (username: string, email: string, password: string) => {
  try {
    // Step 1: Generate and store the client's secure key pair
    await generateAndStoreSecureClientKeyPair(username, password)

    // Step 2: Generate a random salt
    const salt = crypto.lib.WordArray.random(16).toString(crypto.enc.Hex)

    // Step 3: Derive x using the salt, username, and password
    const x = await deriveX(salt, username, password)

    // Step 4: Compute the verifier v = g^x % N
    const v = computeVerifier(x)

    // Step 5: Fetch the server's public key
    const { data: serverPublicKeyPem } = await axios.get('/api/auth/public-key')
    const serverPublicKey = await importPublicKey(serverPublicKeyPem)

    // Step 6: Send the encrypted email, username, salt, and verifier to the server for registration
    const encryptedData = {
      username: await encryptWithPublicKey(username, serverPublicKeyPem),
      email: await encryptWithPublicKey(email, serverPublicKeyPem),
      salt: await encryptWithPublicKey(salt, serverPublicKeyPem),
      verifier: await encryptWithPublicKey(padHex(v), serverPublicKeyPem),
      clientPublicKey: publicKeyPem
    }
    const {
      data: { encryptedSessionToken }
    } = await axios.post('/api/auth/register', encryptedData)

    // Step 7: Retrieve the client's private key and decrypt the session token
    const { privateKey } = await getClientKeyPair(username, password)
    const sessionToken = await decryptWithPrivateKey(encryptedSessionToken, privateKey)

    // Step 8: Store the session token securely
    const cookies = useCookies()
    cookies.set('auth_token', sessionToken, '5min', '', '', true, 'Strict')
  } catch (error) {
    console.error('Registration failed:', error)
    throw error
  }
}

// Implements the SRP login process.
export const handleLogin = async (username: string, password: string) => {
  try {
    // Step 1: Retrieve the client's key pair
    const { publicKey, privateKey } = await getClientKeyPair(username, password)

    // Step 2: Generate a random private value a and compute the public value A = g^a % N
    const a = bigIntFromWordArray(crypto.lib.WordArray.random(32))
    const A = computeA(a)

    // Step 3: Fetch the server's public key
    const { data: serverPublicKeyPem } = await axios.get('/api/auth/public-key')
    const serverPublicKey = await importPublicKey(serverPublicKeyPem)

    // Step 4: Encrypt the username and `A` using the server's public key
    const encryptedData = {
      username: await encryptWithPublicKey(username, serverPublicKey),
      A: await encryptWithPublicKey(padHex(A), serverPublicKey)
    }

    // Step 5: Send the encrypted data to the server to receive salt and B
    const {
      data: { salt, B }
    } = await axios.post('/api/auth/srp-params', encryptedData)

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
    const encryptedM1 = await encryptWithPublicKey(M1.toString(crypto.enc.Hex), serverPublicKey)

    // Step 8: Send `M1` to the server and receive `M2` and session token
    const {
      data: { encryptedM2, encryptedSessionToken }
    } = await axios.post('/api/auth/srp-authenticate', {
      username: encryptedData.username,
      M1: encryptedM1,
      A: encryptedData.A
    })

    // Step 9: Decrypt the session token and `M2` using the client's private key
    const decryptedSessionToken = await decryptWithPrivateKey(encryptedSessionToken, privateKey)
    const decryptedM2 = await decryptWithPrivateKey(encryptedM2, privateKey)

    // Step 6: Verify server's M2 (server evidence message)
    const expectedM2 = hmac(
      K,
      crypto.enc.Hex.parse(padHex(A))
        .concat(M1)
        .concat(crypto.enc.Hex.parse(padHex(S)))
    )
    if (decryptedM2 !== expectedM2.toString(crypto.enc.Hex)) {
      throw new Error('Server verification failed. M2 mismatch.')
    }

    // Step 7: Store the session token securely
    const cookies = useCookies()
    cookies.set('auth_token', decryptedSessionToken, '5min', '', '', true, 'Strict')
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}

export const getAuthToken = (): string | null => {
  const cookies = useCookies()
  return cookies?.get('auth_token')
}

export const isLoggedIn = (): boolean => {
  return !!getAuthToken()
}

// export const handleLogin = async (username: string, password: string) => {
//   try {
//     // Step 1: Generate client private value `a` and public value `A`
//     const a = bigIntFromBuffer(randomBytes(32))
//     const A = computeA(a)

//     // Step 2: Send `A` to server, receive `salt`, `B` from server
//     const {
//       data: { salt, B }
//     } = await axios.post('/api/auth/srp-params', { username, A: padHex(A) })

//     // Step 3: Compute x, u, S, K
//     const x = await deriveX(salt, username, password)
//     const u = computeU(A, BigInt(`0x${B}`))
//     const v = computeVerifier(x)
//     const S = computeS(BigInt(`0x${B}`), k, v, u, x, a)
//     const K = computeK(S)

//     // Step 4: Compute M1
//     const M1 = hmac(
//       K,
//       Buffer.concat([
//         Buffer.from(padHex(A), ENCODING.HEX),
//         Buffer.from(B, ENCODING.HEX),
//         Buffer.from(padHex(S), ENCODING.HEX)
//       ])
//     )

//     // Step 5: Send M1 to server, receive M2 and sessionToken
//     const {
//       data: { M2, sessionToken }
//     } = await axios.post('/api/auth/srp-authenticate', {
//       username,
//       M1: M1.toString(ENCODING.HEX),
//       A: padHex(A)
//     })

//     // Step 6: Verify server's M2
//     const expectedM2 = hmac(
//       K,
//       Buffer.concat([
//         Buffer.from(padHex(A), ENCODING.HEX),
//         M1,
//         Buffer.from(padHex(S), ENCODING.HEX)
//       ])
//     )
//     if (M2 !== expectedM2.toString(ENCODING.HEX)) {
//       throw new Error('Server verification failed. M2 mismatch.')
//     }

//     const cookies = useCookies()
//     cookies.set('auth_token', sessionToken, '5min', '', '', true, 'Strict')
//   } catch (error) {
//     console.error('Login failed:', error)
//     throw error
//   }
// }

// export const fetchSRPParameters = async (username: string) => {
//   try {
//     const response = await axios.post('/api/auth/srp-params', { username })
//     return response.data
//   } catch (error) {
//     console.error('Failed to fetch SRP parameters:', error)
//     throw new Error('Unable to fetch SRP parameters')
//   }
// }

// export const handleLogin = async (username: string, password: string, srpParams: any) => {
//   try {
//     const response = await axios.post('/api/auth/login', {
//       username,
//       srpParams
//     })

//     const cookies = useCookies()

//     const token = response.data.token
//     cookies?.set('auth_token', token, '15min', undefined, undefined, true, 'Strict')

//     return token
//   } catch (error) {
//     console.error('Login failed:', error)
//     throw new Error('Login failed')
//   }
// }

// export const handleRegister = async (username: string, email: string, password: string) => {
//   try {
//     const response = await axios.post('/api/auth/register', {
//       username,
//       email,
//       password
//     })

//     const token = response.data.token

//     const cookies = useCookies()
//     cookies?.set('auth_token', token, '30min', undefined, undefined, true, 'Strict')

//     return token
//   } catch (error) {
//     console.error('Registration failed:', error)
//     throw new Error('Registration failed')
//   }
// }
