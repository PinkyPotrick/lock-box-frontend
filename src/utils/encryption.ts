// Constants
export const HASH_ALGORITHM = 'sha256'
export const ITERATIONS = 100000
export const KEY_LENGTH = 256 // AES-256

// Derives a CryptoKey using PBKDF2
export async function deriveKey(salt: Uint8Array, password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypts the private key using AES-GCM
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  username: string,
  password: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const privateKeyData = await window.crypto.subtle.exportKey('pkcs8', privateKey)
  const privateKeyBytes = new Uint8Array(privateKeyData)

  const iv = window.crypto.getRandomValues(new Uint8Array(12)) // Initialization vector for AES-GCM
  const salt = window.crypto.getRandomValues(new Uint8Array(16)) // 16 bytes salt for PBKDF2

  const encryptionKey = await deriveKey(salt, password)

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    encryptionKey,
    privateKeyBytes
  )

  return {
    encryptedKey: window.btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    salt: window.btoa(String.fromCharCode(...salt)),
    iv: window.btoa(String.fromCharCode(...iv))
  }
}

// Decrypts the private key using AES-GCM
export async function decryptPrivateKey(
  encryptedKeyBase64: string,
  saltBase64: string,
  ivBase64: string,
  password: string
): Promise<CryptoKey> {
  const encryptedKey = Uint8Array.from(atob(encryptedKeyBase64), (c) => c.charCodeAt(0))
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0))
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0))

  const decryptionKey = await deriveKey(salt, password)

  const decryptedKeyBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    decryptionKey,
    encryptedKey
  )

  return window.crypto.subtle.importKey(
    'pkcs8',
    decryptedKeyBytes,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  )
}

// Decrypts data using the client's private key (RSA-OAEP)
export async function decryptWithPrivateKey(
  encryptedDataBase64: string,
  privateKey: CryptoKey
): Promise<string> {
  const encryptedData = Uint8Array.from(atob(encryptedDataBase64), (c) => c.charCodeAt(0))

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encryptedData.buffer
  )

  return new TextDecoder().decode(decryptedData)
}

// Example function to generate and store key pair
export async function generateAndStoreSecureClientKeyPair(username: string, password: string) {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  )

  const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKeyBase64 = window.btoa(String.fromCharCode(...new Uint8Array(publicKey)))
  localStorage.setItem('clientPublicKey', publicKeyBase64)

  const { encryptedKey, salt, iv } = await encryptPrivateKey(keyPair.privateKey, username, password)
  localStorage.setItem('encryptedPrivateKey', encryptedKey)
  localStorage.setItem('encryptionSalt', salt)
  localStorage.setItem('encryptionIv', iv)
}

// Example function to retrieve the key pair
export async function getClientKeyPair(
  username: string,
  password: string
): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const publicKeyBase64 = localStorage.getItem('clientPublicKey')
  const encryptedKeyBase64 = localStorage.getItem('encryptedPrivateKey')
  const saltBase64 = localStorage.getItem('encryptionSalt')
  const ivBase64 = localStorage.getItem('encryptionIv')

  if (!publicKeyBase64 || !encryptedKeyBase64 || !saltBase64 || !ivBase64) {
    throw new Error('Key pair not found. Please generate them first.')
  }

  const publicKeyDer = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0))
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyDer.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  )

  const privateKey = await decryptPrivateKey(encryptedKeyBase64, saltBase64, ivBase64, password)

  return { publicKey, privateKey }
}
