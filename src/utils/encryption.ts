import forge from 'node-forge'

export function storeSecureClientKeyPair(username: string, password: string) {} // TODO implement this!!!

// Generate and store secure client key pair
export function generateAndStoreSecureClientKeyPair(username: string, password: string) {
  // Generate a random RSA key pair
  const keyPair = forge.pki.rsa.generateKeyPair(2048)

  // Export keys to PEM format
  const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey)
  const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey)

  // Store the public key directly in localStorage
  localStorage.setItem('clientPublicKey', publicKeyPem)

  // Encrypt and store the private key
  const { encryptedKey, salt, iv } = encryptPrivateKey(privateKeyPem, username, password)
  localStorage.setItem('encryptedPrivateKey', encryptedKey)
  localStorage.setItem('encryptionSalt', salt)
  localStorage.setItem('encryptionIv', iv)
}

// Retrieve and decrypt the key pair
export async function getClientKeyPair(
  username: string,
  password: string
): Promise<{ publicKeyPem: string; privateKeyPem: string }> {
  const publicKeyPem = localStorage.getItem('clientPublicKey')
  const encryptedKeyBase64 = localStorage.getItem('encryptedPrivateKey')
  const saltBase64 = localStorage.getItem('encryptionSalt')
  const ivBase64 = localStorage.getItem('encryptionIv')

  if (!publicKeyPem || !encryptedKeyBase64 || !saltBase64 || !ivBase64) {
    throw new Error('Key pair not found. Please generate them first.')
  }

  // Decrypt the private key
  const privateKeyPem = decryptPrivateKey(encryptedKeyBase64, saltBase64, ivBase64, password)

  return { publicKeyPem, privateKeyPem }
}

// Encrypt the private key using AES-GCM
export function encryptPrivateKey(privateKeyPem: string, username: string, password: string) {
  const iv = forge.random.getBytesSync(12) // Generate a random IV
  const salt = forge.random.getBytesSync(16) // Generate a random salt

  // Derive a key from the password using PBKDF2
  const derivedKey = forge.pkcs5.pbkdf2(password, salt, 10000, 32)

  // Encrypt the private key using AES-GCM
  const cipher = forge.cipher.createCipher('AES-GCM', derivedKey)
  cipher.start({ iv: iv })
  cipher.update(forge.util.createBuffer(privateKeyPem, 'utf8'))
  cipher.finish()

  const encryptedKey = cipher.output.getBytes()
  const tag = cipher.mode.tag.getBytes() // Authentication tag

  return {
    encryptedKey: forge.util.encode64(encryptedKey + tag),
    salt: forge.util.encode64(salt),
    iv: forge.util.encode64(iv)
  }
}

// Decrypt the private key using AES-GCM
export function decryptPrivateKey(
  encryptedKeyBase64: string,
  saltBase64: string,
  ivBase64: string,
  password: string
): string {
  const encryptedKey = forge.util.decode64(encryptedKeyBase64)
  const salt = forge.util.decode64(saltBase64)
  const iv = forge.util.decode64(ivBase64)

  // Derive the key from the password using PBKDF2
  const derivedKey = forge.pkcs5.pbkdf2(password, salt, 10000, 32)

  // Decrypt the private key using AES-GCM
  const decipher = forge.cipher.createDecipher('AES-GCM', derivedKey)
  const encryptedBuffer = forge.util.createBuffer(
    encryptedKey.slice(0, encryptedKey.length - 16),
    'raw'
  ) // Exclude the last 16 bytes (tag)
  const tag = encryptedKey.slice(-16) // Last 16 bytes are the authentication tag

  decipher.start({ iv: iv, tag: forge.util.createBuffer(tag, 'raw') })
  decipher.update(encryptedBuffer)
  const success = decipher.finish()

  if (!success) {
    throw new Error('Decryption failed.')
  }

  return decipher.output.toString()
}

// Function to encrypt data with the public key
export function encryptWithPublicKey(data: string, publicKeyPem: string): string {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
  const encrypted = publicKey.encrypt(forge.util.encodeUtf8(data), 'RSAES-PKCS1-V1_5')
  return forge.util.encode64(encrypted)
}

// Function to decrypt data with the private key
export function decryptWithPrivateKey(encryptedData: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
  const decrypted = privateKey.decrypt(forge.util.decode64(encryptedData), 'RSAES-PKCS1-V1_5')
  return forge.util.decodeUtf8(decrypted)
}

export function generateAESKey() {
  return forge.util.encode64(forge.random.getBytesSync(32)) // AES-256, so 32 bytes key
}

// Function to encrypt data using AES-CBC
export function encryptWithAESCBC(
  data: string,
  aesKey: string
): { encryptedData: string; iv: string; hmac: string } {
  const iv = forge.random.getBytesSync(16) // AES-CBC IV should be 16 bytes
  const cipher = forge.cipher.createCipher('AES-CBC', forge.util.decode64(aesKey))
  cipher.start({ iv: iv })
  cipher.update(forge.util.createBuffer(data, 'utf8'))
  cipher.finish()

  const encryptedData = cipher.output.getBytes()

  // Create an HMAC for integrity
  const hmac = forge.hmac.create()
  hmac.start('sha256', forge.util.decode64(aesKey)) // Use the correct HMAC initialization
  hmac.update(iv + encryptedData) // HMAC covers the IV and the ciphertext

  return {
    encryptedData: forge.util.encode64(encryptedData),
    iv: forge.util.encode64(iv),
    hmac: forge.util.encode64(hmac.digest().getBytes())
  }
}

// Function to decrypt with AES-CBC and verify HMAC
export function decryptWithAESCBC(
  encryptedDataBase64: string,
  ivBase64: string,
  hmacBase64: string,
  aesKeyBase64: string
): string {
  // Decode the Base64 inputs
  const aesKey = forge.util.decode64(aesKeyBase64)
  const iv = forge.util.decode64(ivBase64)
  const encryptedData = forge.util.decode64(encryptedDataBase64)

  // Verify HMAC
  const hmac = forge.hmac.create()
  hmac.start('sha256', aesKey)
  hmac.update(iv + encryptedData)
  const hmacCalculated = hmac.digest().getBytes()

  const hmacReceived = forge.util.decode64(hmacBase64)
  if (hmacCalculated !== hmacReceived) {
    throw new Error('HMAC verification failed. Data integrity compromised.')
  }

  // Decrypt the data using AES-CBC
  const decipher = forge.cipher.createDecipher('AES-CBC', aesKey)
  decipher.start({ iv: iv })
  decipher.update(forge.util.createBuffer(encryptedData))
  const success = decipher.finish()

  if (!success) {
    throw new Error('Decryption failed.')
  }

  return decipher.output.toString()
}

// Derive a key using PBKDF2
export function deriveEncryptionKey(username: string, secret: string): string {
  const salt = forge.util.createBuffer(secret, 'utf8')
  const derivedKey = forge.pkcs5.pbkdf2(username, salt.getBytes(), 10000, 32) // 32 bytes = 256-bit key
  return forge.util.encode64(derivedKey)
}

// Function to encrypt the username using AES in ECB mode
export function encryptUsername(username: string, encryptionKey: string): string {
  const key = forge.util.decode64(encryptionKey) // Decode the Base64-encoded key

  const cipher = forge.cipher.createCipher('AES-ECB', key)
  cipher.start({ iv: '' }) // ECB mode doesn't use an IV
  cipher.update(forge.util.createBuffer(username, 'utf8'))
  cipher.finish()

  const encrypted = cipher.output.getBytes()
  return forge.util.encode64(encrypted) // Return Base64-encoded encrypted data
}
