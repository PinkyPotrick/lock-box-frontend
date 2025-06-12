import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  AUTH,
  AUTH_ERROR_MESSAGES,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS
} from '@/constants/appConstants'
import { useAuthStore } from '@/stores/authStore'
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
import { getCookies } from '@/utils/cookiesUtils'
import { bigIntFromBytes } from '@/utils/dataTypesUtils'
import {
  deriveEncryptionKey,
  encryptUsername,
  generateAESKey,
  generateAndStoreSecureClientKeyPair,
  getClientKeyPair,
  storeNewSecureClientKeyPair
} from '@/utils/encryptionUtils'
import forge from 'node-forge'
import { ApiError, ApiErrorService } from './apiErrorService'
import { LoginEncryptionService } from './encryption/loginEncryptionService'
import { RegistrationEncryptionService } from './encryption/registrationEncryptionService'

/**
 * Prepares user credentials for secure authentication
 * @param username User's username
 * @param password User's password
 * @returns Derived key and encrypted username
 */
const prepareUserCredentials = (username: string, password: string) => {
  const derivedKey = deriveEncryptionKey(username, password)
  const derivedUsername = encryptUsername(username, derivedKey)

  return {
    derivedKey,
    derivedUsername
  }
}

/**
 * Registers the user and fetches a valid session token
 * @param data - the encrypted registration data
 * @returns encrypted AES session token { encryptedSessionToken, helperAesKey }
 */
const registerUser = async (data: object) => {
  try {
    const response = await axios.post<{
      item: any
      success: boolean
      message?: string
      statusCode?: number
      errorType?: string
    }>(API_PATHS.AUTH.REGISTER, data)

    if (response.data && !response.data.success) {
      throw new ApiError(
        response.data.message || AUTH_ERROR_MESSAGES.REGISTRATION_FAILED,
        response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
        response.data.errorType || ERROR_TYPES.API_ERROR
      )
    }

    return response?.data?.item
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.REGISTRATION_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Fetches the stored SRP params
 * @param data - the encrypted { derivedKey, username, encryptedClientPublicValueA,
 *               encryptedPublicKey, helperAesKey }
 * @returns encrypted salt and encrypted AES server's public value B { salt,
 *          encryptedServerPublicValueB, helperAesKey }
 */
const fetchSrpParams = async (data: object) => {
  try {
    const response = await axios.post<{
      item: any
      success: boolean
      message?: string
      statusCode?: number
      errorType?: string
    }>(API_PATHS.AUTH.SRP_PARAMS, data)

    if (response.data && !response.data.success) {
      throw new ApiError(
        response.data.message || AUTH_ERROR_MESSAGES.SRP_PARAMS_FAILED,
        response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
        response.data.errorType || ERROR_TYPES.API_ERROR
      )
    }

    return response?.data?.item
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.SRP_PARAMS_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Authenticates the user and fetches a valid session token
 * @param data - the encrypted { clientProofM }
 * @returns encrypted AES server proof and session token { encryptedM2, encryptedSessionToken, helperAesKey }
 */
const authenticateUser = async (data: object) => {
  try {
    const response = await axios.post<{
      item: any
      success: boolean
      message?: string
      statusCode?: number
      errorType?: string
    }>(API_PATHS.AUTH.SRP_AUTHENTICATE, data)

    if (response.data && !response.data.success) {
      throw new ApiError(
        response.data.message || AUTH_ERROR_MESSAGES.AUTHENTICATION_FAILED,
        response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
        response.data.errorType || ERROR_TYPES.API_ERROR
      )
    }

    return response?.data?.item
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.AUTHENTICATION_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Sends a logout request to the server
 * @returns success message from server
 */
const logoutUser = async () => {
  try {
    const response = await axios.post<{
      item: any
      success: boolean
      message?: string
      statusCode?: number
      errorType?: string
    }>(API_PATHS.AUTH.LOGOUT)

    if (response.data && !response.data.success) {
      throw new ApiError(
        response.data.message || AUTH_ERROR_MESSAGES.LOGOUT_FAILED,
        response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
        response.data.errorType || ERROR_TYPES.API_ERROR
      )
    }

    return response?.data?.item
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.LOGOUT_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Handler for the SRP registration process.
 * @param username - the inserted username value.
 * @param email - the inserted email value.
 * @param password - the inserted password value.
 */
export const handleRegister = async (username: string, email: string, password: string) => {
  if (!username || !email || !password) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.MISSING_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION_ERROR
    )
  }

  try {
    // Generate and store client key pair
    generateAndStoreSecureClientKeyPair(username, password)
    const { publicKeyPem: clientPublicKeyPem, privateKeyPem: clientPrivateKeyPem } =
      await getClientKeyPair(username, password)

    // Encrypt the username using a derived key from the username and password
    const { derivedKey, derivedUsername } = prepareUserCredentials(username, password)

    // Generate salt and compute verifier
    const salt = generateSalt()
    const verifier = computeVerifier(salt, derivedUsername, password)

    // Encrypt all registration data
    const encryptedData = await RegistrationEncryptionService.encryptRegistrationData({
      derivedKey,
      derivedUsername,
      email,
      salt,
      verifier,
      clientPublicKeyPem,
      clientPrivateKeyPem
    })

    // Send registration request
    const { encryptedSessionToken, helperAesKey } = await registerUser(encryptedData)

    if (!encryptedSessionToken || !helperAesKey) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.API_ERROR
      )
    }

    // Decrypt the retrieved session token
    const sessionToken = RegistrationEncryptionService.decryptSessionToken(
      encryptedSessionToken,
      helperAesKey
    )

    if (!sessionToken) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.INVALID_SESSION_TOKEN,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.API_ERROR
      )
    }

    // Store the session token securely
    const cookies = getCookies()
    cookies.set(
      AUTH.TOKEN_COOKIE_NAME,
      sessionToken,
      AUTH.TOKEN_EXPIRATION,
      '',
      '',
      true,
      AUTH.COOKIE_SAME_SITE
    )
    const authStore = useAuthStore()
    authStore.updateAuthToken()

    return true
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.REGISTRATION_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Implements the SRP login process.
 * @param username - the inserted username value.
 * @param password - the inserted password value.
 */
export const handleLogin = async (
  username: string,
  password: string
): Promise<{ success: boolean; requiresTOTP: boolean }> => {
  if (!username || !password) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.MISSING_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION_ERROR
    )
  }

  try {
    // Generate and store client key pair
    generateAndStoreSecureClientKeyPair(username, password)
    const { publicKeyPem: clientPublicKeyPem, privateKeyPem: clientPrivateKeyPem } =
      await getClientKeyPair(username, password)

    // Generate SRP values
    const clientPrivateValueA = bigIntFromBytes(forge.random.getBytesSync(32)) // Generate a random client's private value a
    const clientPublicValueA = computeA(clientPrivateValueA) // Compute the client's public value A
    const aesKey = generateAESKey() // Generate an AES key

    // Encrypt the username using a derived key from the username and password
    const { derivedKey, derivedUsername } = prepareUserCredentials(username, password)

    // Encrypt SRP parameters
    const { serverPublicKeyPem, ...encryptedSrpParamsData } =
      await LoginEncryptionService.encryptSrpParams({
        clientPublicValueA,
        clientPublicKeyPem,
        derivedKey,
        derivedUsername,
        aesKey
      })

    // Fetch SRP parameters from server
    const {
      encryptedServerPublicValueB,
      encryptedTotpSessionId,
      helperSrpParamsAesKey,
      salt,
      requiresTotp
    } = await fetchSrpParams(encryptedSrpParamsData)

    if (!encryptedServerPublicValueB || !helperSrpParamsAesKey || !salt) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.API_ERROR
      )
    }

    // Decrypt the server's public value B
    const serverPublicValueB = LoginEncryptionService.decryptServerPublicValueB(
      encryptedServerPublicValueB,
      helperSrpParamsAesKey
    )

    // Abort authentication if B % N == 0
    if (BigInt(`0x${serverPublicValueB}`) % N === 0n) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.INVALID_SERVER_VALUE,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    // Check if TOTP is required
    if (requiresTotp && encryptedTotpSessionId) {
      // Decrypt TOTP session ID
      const totpSessionId = LoginEncryptionService.decryptTotpSessionId(
        encryptedTotpSessionId,
        helperSrpParamsAesKey
      )

      // Store critical data for completing SRP authentication after TOTP
      sessionStorage.setItem('srp_username', username)
      sessionStorage.setItem('srp_password', password)
      sessionStorage.setItem('srp_derived_username', derivedUsername)
      sessionStorage.setItem('srp_salt', salt)
      sessionStorage.setItem('srp_client_public_value_a', clientPublicValueA.toString())
      sessionStorage.setItem('srp_server_public_value_b', serverPublicValueB)
      sessionStorage.setItem('srp_client_private_value_a', clientPrivateValueA.toString())
      sessionStorage.setItem('srp_client_private_key_pem', clientPrivateKeyPem)
      sessionStorage.setItem('srp_server_public_key_pem', serverPublicKeyPem)
      sessionStorage.setItem('totp_session_id', totpSessionId)
      sessionStorage.setItem('totp_expiry', (Date.now() + 120000).toString()) // 2 minutes (120 seconds)

      // Return TOTP required status to trigger redirect
      return {
        success: false,
        requiresTOTP: true
      }
    }

    // If TOTP not required, proceed with normal authentication
    return await completeAuthentication(
      username,
      password,
      derivedUsername,
      salt,
      clientPublicValueA,
      serverPublicValueB,
      clientPrivateValueA,
      clientPrivateKeyPem,
      serverPublicKeyPem
    )
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.LOGIN_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Completes the SRP authentication after initial password check (and TOTP if required)
 */
export const completeAuthentication = async (
  username: string,
  password: string,
  derivedUsername: string,
  salt: string,
  clientPublicValueA: bigint,
  serverPublicValueB: string,
  clientPrivateValueA: bigint,
  clientPrivateKeyPem: string,
  serverPublicKeyPem: string
): Promise<{ success: boolean; requiresTOTP: boolean }> => {
  try {
    // Compute SRP proof values
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

    // Encrypt client proof
    const encryptedData = LoginEncryptionService.encryptClientProof(
      clientProofM1,
      serverPublicKeyPem
    )

    // Authenticate with server
    const authResponse = await authenticateUser(encryptedData)

    if (!authResponse) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.API_ERROR
      )
    }

    // Decrypt authentication response
    const { sessionToken, userPublicKey, userPrivateKey, serverProofM2 } =
      LoginEncryptionService.decryptAuthenticationResponse(authResponse, clientPrivateKeyPem)

    // Verify server proof
    const clientProofM2 = computeM2(clientPublicValueA, clientProofM1, sessionKeyK)
    if (clientProofM2 !== serverProofM2) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.PROOF_VERIFICATION_FAILED,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    // Store session data
    if (userPublicKey && userPrivateKey) {
      storeNewSecureClientKeyPair(username, password, userPublicKey, userPrivateKey)
    } else {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.API_ERROR
      )
    }

    const cookies = getCookies()
    cookies.set(
      AUTH.TOKEN_COOKIE_NAME,
      sessionToken,
      AUTH.TOKEN_EXPIRATION,
      '',
      '',
      true,
      AUTH.COOKIE_SAME_SITE
    )
    const authStore = useAuthStore()
    authStore.updateAuthToken()

    return {
      success: true,
      requiresTOTP: false
    }
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.LOGIN_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}

/**
 * Handles the logout process
 * - Calls the backend logout endpoint
 * - Clears the auth token
 * - Updates the auth store
 */
export const handleLogout = async () => {
  try {
    const authStore = useAuthStore()
    const token = authStore.authToken

    if (!token) {
      console.warn(AUTH_ERROR_MESSAGES.NO_ACTIVE_SESSION)
      return false
    }

    // Call the backend logout endpoint
    await logoutUser()

    // Clear the auth token from cookies
    const cookies = getCookies()
    cookies.remove(AUTH.TOKEN_COOKIE_NAME)

    // Update the auth store state
    authStore.logout()

    return true
  } catch (error) {
    console.error(AUTH_ERROR_MESSAGES.LOGOUT_FAILED, error)
    throw ApiErrorService.handleError(error)
  }
}
