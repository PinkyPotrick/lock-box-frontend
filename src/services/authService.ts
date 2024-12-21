import { useAuthStore } from '@/stores/authStore'
import { bigIntFromBytes, padHex } from '@/utils/dataTypesUtils'
import { getCookies } from '@/utils/cookiesUtils'
import {
  encryptWithPublicKey,
  generateAESKey,
  encryptWithAESCBC,
  getClientKeyPair,
  decryptWithAESCBC,
  generateAndStoreSecureClientKeyPair,
  deriveEncryptionKey,
  encryptUsername,
  decryptWithPrivateKey,
  storeNewSecureClientKeyPair
} from '@/utils/encryptionUtils'
import {
  computeA,
  computeK,
  computeM1,
  computeM2,
  computeS,
  computeU,
  computeVerifier,
  computeX,
  generateSalt,
  N
} from '@/utils/authUtils'
import axios from '@/axios-config'
import forge from 'node-forge'

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

    // Encrypt the username using a derived key from the username and password
    const derivedKey = deriveEncryptionKey(username, password)
    const derivedUsername = encryptUsername(username, derivedKey)

    const salt = generateSalt() // Generate a random salt
    const verifier = computeVerifier(salt, derivedUsername, password) // Compute the verifier using the derived username
    const serverPublicKeyPem = await fetchPublicKey() // Fetch the server's public key
    const aesKey = generateAESKey() // Generate an AES key

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

    // Prepare the encrypted data to be sent to the server for registration
    const encryptedData = {
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      encryptedDerivedUsername: encryptWithPublicKey(derivedUsername, serverPublicKeyPem),
      encryptedEmail: encryptWithPublicKey(email, serverPublicKeyPem),
      encryptedSalt: encryptWithPublicKey(salt, serverPublicKeyPem),
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
    const { encryptedSessionToken, helperAesKey } = await registerUser(encryptedData)

    // Decrypt the retrieved session token
    const sessionToken = decryptWithAESCBC(
      encryptedSessionToken.encryptedDataBase64,
      encryptedSessionToken.ivBase64,
      encryptedSessionToken.hmacBase64,
      helperAesKey
    )

    // Store the session token securely
    const cookies = getCookies()
    cookies.set('auth_token', sessionToken, '5min', '', '', true, 'Strict')
    const authStore = useAuthStore()
    authStore.updateAuthToken()
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

    // Encrypt the client's public value A using the AES key
    const {
      encryptedData: encryptedAESA,
      iv: ivA,
      hmac: hmacA
    } = encryptWithAESCBC(padHex(clientPublicValueA), aesKey)

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
      encryptedDerivedUsername: encryptWithPublicKey(derivedUsername, serverPublicKeyPem),
      encryptedClientPublicValueA: {
        encryptedDataBase64: encryptedAESA,
        ivBase64: ivA,
        hmacBase64: hmacA
      },
      encryptedClientPublicKey: {
        encryptedDataBase64: encryptedAESClientPublicKey,
        ivBase64: ivClientPublicKey,
        hmacBase64: hmacClientPublicKey
      },
      helperAesKey: aesKey // This value cannot be encrypted (it should be protected by SSL)
    }
    const { encryptedServerPublicValueB, helperSrpParamsAesKey, salt } =
      await fetchSrpParams(encryptedSrpParamsData)

    // Decrypt the retrieved server's public value B
    const serverPublicValueB = decryptWithAESCBC(
      encryptedServerPublicValueB.encryptedDataBase64,
      encryptedServerPublicValueB.ivBase64,
      encryptedServerPublicValueB.hmacBase64,
      helperSrpParamsAesKey
    )

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
    const clientProofM1 = computeM1(
      derivedUsername,
      salt,
      clientPublicValueA,
      BigInt(`0x${serverPublicValueB}`),
      sessionKeyK
    )

    const encryptedClientProofM1 = encryptWithPublicKey(clientProofM1, serverPublicKeyPem)

    // Prepare the encrypted data to be sent to the server to receive the salt and server's public value B
    const encryptedData = {
      encryptedClientProofM1: encryptedClientProofM1
    }
    const {
      encryptedServerProofM2,
      encryptedSessionToken,
      encryptedUserPublicKey,
      encryptedUserPrivateKey,
      helperAuthenticateAesKey
    } = await authenticateUser(encryptedData)

    // Decrypt the retrieved session token, user's public key, user's private key and server proof
    const sessionToken = decryptWithAESCBC(
      encryptedSessionToken.encryptedDataBase64,
      encryptedSessionToken.ivBase64,
      encryptedSessionToken.hmacBase64,
      helperAuthenticateAesKey
    )
    const userPublicKey = decryptWithAESCBC(
      encryptedUserPublicKey.encryptedDataBase64,
      encryptedUserPublicKey.ivBase64,
      encryptedUserPublicKey.hmacBase64,
      helperAuthenticateAesKey
    )
    const userPrivateKey = decryptWithAESCBC(
      encryptedUserPrivateKey.encryptedDataBase64,
      encryptedUserPrivateKey.ivBase64,
      encryptedUserPrivateKey.hmacBase64,
      helperAuthenticateAesKey
    )
    const serverProofM2 = decryptWithPrivateKey(encryptedServerProofM2, clientPrivateKeyPem)

    const clientProofM2 = computeM2(clientPublicValueA, clientProofM1, sessionKeyK)

    if (clientProofM2 !== serverProofM2) {
      throw new Error('Proof verification failed. Authorization aborted!')
    }

    // Store the session token securely
    storeNewSecureClientKeyPair(username, password, userPublicKey, userPrivateKey)
    const cookies = getCookies()
    cookies.set('auth_token', sessionToken, '5min', '', '', true, 'Strict')
    const authStore = useAuthStore()
    authStore.updateAuthToken()
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}
