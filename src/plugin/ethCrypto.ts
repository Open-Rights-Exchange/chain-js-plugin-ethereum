import Wallet from 'ethereumjs-wallet'
import { bufferToHex, ecsign, ecrecover, publicToAddress, keccak } from 'ethereumjs-util'
import secp256k1 from 'secp256k1'
import {
  Helpers,
  Crypto,
  CryptoAsymmetricModels,
  CryptoHelpers,
  CryptoAsymmetricHelpers as AsymmetricHelpers,
} from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumKeyPair,
  EthereumPrivateKey,
  EthereumPublicKey,
  EthereumSignature,
  EthereumSignatureNative,
} from './models'
import { toEthBuffer, toEthereumAddress, toEthereumPublicKey, toEthereumSignatureNative } from './helpers'

// eslint-disable-next-line prefer-destructuring
export const defaultIter = Crypto.AesCrypto.defaultIter
// eslint-disable-next-line prefer-destructuring
export const defaultMode = Crypto.AesCrypto.defaultMode

/** Verifies that the value is a valid, stringified JSON Encrypted object */
export function isSymEncryptedDataString(value: string): value is Crypto.AesCrypto.AesEncryptedDataString {
  return Crypto.AesCrypto.isAesEncryptedDataString(value)
}

/** Ensures that the value comforms to a well-formed, stringified JSON Encrypted Object */
export function toSymEncryptedDataString(value: any): Crypto.AesCrypto.AesEncryptedDataString {
  return Crypto.AesCrypto.toAesEncryptedDataString(value)
}

/** get uncompressed public key from EthereumPublicKey */
export function uncompressPublicKey(publicKey: EthereumPublicKey): string {
  // if already decompressed an not has trailing 04
  const cleanedPublicKey = Helpers.removeHexPrefix(publicKey)
  const testBuffer = Buffer.from(cleanedPublicKey, 'hex')
  const prefixedPublicKey = testBuffer.length === 64 ? `04${cleanedPublicKey}` : cleanedPublicKey
  const uncompressedPublicKey = Helpers.byteArrayToHexString(
    secp256k1.publicKeyConvert(Helpers.hexStringToByteArray(prefixedPublicKey), false),
  )
  return uncompressedPublicKey
}

/** Decrypts the encrypted value using a password, and optional salt using AES algorithm and SHA256 hash function
 * The encrypted value is either a stringified JSON object or a JSON object */
export function decryptWithPassword(
  encrypted: Crypto.AesCrypto.AesEncryptedDataString | any,
  password: string,
  options: Crypto.AesCrypto.AesEncryptionOptions,
): string {
  return Crypto.AesCrypto.decryptWithPassword(encrypted, password, options)
}

/** Encrypts a string using a password and optional salt */
export function encryptWithPassword(
  unencrypted: string,
  password: string,
  options: Crypto.AesCrypto.AesEncryptionOptions,
): Crypto.AesCrypto.AesEncryptedDataString {
  return Crypto.AesCrypto.encryptWithPassword(unencrypted, password, options)
}

/** Encrypts a string using a public key into a stringified JSON object
 * The encrypted result can be decrypted with the matching private key */
export async function encryptWithPublicKey(
  unencrypted: string,
  publicKey: EthereumPublicKey,
  options: Crypto.Asymmetric.EciesOptions,
): Promise<Crypto.Asymmetric.AsymmetricEncryptedDataString> {
  const publicKeyUncompressed = uncompressPublicKey(publicKey) // should be hex string
  const useOptions = {
    ...options,
    curveType: Crypto.Asymmetric.EciesCurveType.Secp256k1,
    scheme: CryptoAsymmetricModels.AsymmetricScheme.ETHEREUM_ASYMMETRIC_SCHEME_NAME,
  }
  const response = Crypto.Asymmetric.encryptWithPublicKey(publicKeyUncompressed, unencrypted, useOptions)
  return Crypto.Asymmetric.toAsymEncryptedDataString(JSON.stringify(response))
}

/** Decrypts the encrypted value using a private key
 * The encrypted value is a stringified JSON object
 * ... and must have been encrypted with the public key that matches the private ley provided */
export async function decryptWithPrivateKey(
  encrypted: Crypto.Asymmetric.AsymmetricEncryptedDataString | Crypto.Asymmetric.AsymmetricEncryptedData,
  privateKey: EthereumPrivateKey,
  options: Crypto.Asymmetric.EciesOptions,
): Promise<string> {
  const useOptions = { ...options, curveType: Crypto.Asymmetric.EciesCurveType.Secp256k1 }
  const privateKeyHex = Helpers.removeHexPrefix(privateKey)
  const encryptedObject = CryptoHelpers.ensureEncryptedValueIsObject(encrypted)
  return Crypto.Asymmetric.decryptWithPrivateKey(encryptedObject, privateKeyHex, useOptions)
}

/** Encrypts a string using multiple assymmetric encryptions with multiple public keys - one after the other
 *  calls a helper function to perform the iterative wrapping
 *  the first parameter of the helper is a chain-specific function (in this file) to encryptWithPublicKey
 *  The result is stringified JSON object including an array of encryption results with the last one including the final cipertext
 *  Encrypts using publicKeys in the order they appear in the array */
export async function encryptWithPublicKeys(
  unencrypted: string,
  publicKeys: EthereumPublicKey[],
  options?: Crypto.Asymmetric.EciesOptions,
): Promise<Crypto.Asymmetric.AsymmetricEncryptedDataString> {
  return Crypto.Asymmetric.toAsymEncryptedDataString(
    await AsymmetricHelpers.encryptWithPublicKeys(encryptWithPublicKey, unencrypted, publicKeys, options),
  )
}

/** Unwraps an object produced by encryptWithPublicKeys() - resulting in the original ecrypted string
 *  calls a helper function to perform the iterative unwrapping
 *  the first parameter of the helper is a chain-specific function (in this file) to decryptWithPrivateKey
 *  Decrypts using privateKeys that match the publicKeys provided in encryptWithPublicKeys() - provide the privateKeys in same order
 *  The result is the decrypted string */
export async function decryptWithPrivateKeys(
  encrypted: Crypto.Asymmetric.AsymmetricEncryptedDataString,
  privateKeys: EthereumPublicKey[],
  options?: any,
): Promise<{ decrypted: string; remaining: CryptoAsymmetricModels.AsymmetricEncryptedData[] }> {
  return AsymmetricHelpers.decryptWithPrivateKeys(decryptWithPrivateKey, encrypted, privateKeys, options)
}

/** Signs data with private key */
export function sign(data: string | Buffer, privateKey: string): EthereumSignatureNative {
  const dataBuffer = Helpers.convertUtf8OrHexStringToBuffer(data)
  const keyBuffer = toEthBuffer(Helpers.ensureHexPrefix(privateKey))
  const dataHash = keccak(dataBuffer)
  return toEthereumSignatureNative(ecsign(dataHash, keyBuffer))
}

/** Returns public key from ethereum signature */
export function getEthereumPublicKeyFromSignature(
  signature: EthereumSignatureNative,
  data: string | Buffer,
): EthereumPublicKey {
  const { v, r, s } = signature
  const dataHash = keccak(Helpers.convertUtf8OrHexStringToBuffer(data))
  return toEthereumPublicKey(Helpers.bufferToHexString(ecrecover(toEthBuffer(dataHash), v, r, s)))
}

/** Returns public key from ethereum address */
export function getEthereumAddressFromPublicKey(publicKey: EthereumPublicKey): EthereumAddress {
  return toEthereumAddress(bufferToHex(publicToAddress(toEthBuffer(publicKey))))
}

/** Adds privateKeyEncrypted if missing by encrypting privateKey (using password) */
function encryptAccountPrivateKeysIfNeeded(
  keys: EthereumKeyPair,
  password: string,
  options: Crypto.AesCrypto.AesEncryptionOptions,
): EthereumKeyPair {
  // encrypt if not already encrypted
  let privateKeyEncrypted = keys?.privateKeyEncrypted
  if (!privateKeyEncrypted && password) {
    privateKeyEncrypted = encryptWithPassword(keys?.privateKey, password, options)
  }
  const encryptedKeys: EthereumKeyPair = {
    privateKey: keys?.privateKey,
    publicKey: keys?.publicKey,
    privateKeyEncrypted,
  }
  return encryptedKeys
}

/** Generates and returns a new public/private key pair */
export async function generateKeyPair(): Promise<EthereumKeyPair> {
  const wallet = Wallet.generate()
  const privateKey: EthereumPrivateKey = wallet.getPrivateKeyString()
  const publicKey: EthereumPublicKey = wallet.getPublicKeyString()
  const keys: EthereumKeyPair = { privateKey, publicKey }
  return keys
}

/** Generates new public and private key pair
 * Encrypts the private key using password and optional salt
 */
export async function generateNewAccountKeysAndEncryptPrivateKeys(
  password: string,
  overrideKeys: any,
  options: Crypto.AesCrypto.AesEncryptionOptions,
): Promise<EthereumKeyPair> {
  const keys = await generateKeyPair()
  const encryptedKeys = encryptAccountPrivateKeysIfNeeded(keys, password, options)
  return encryptedKeys
}

/** Verify that the signed data was signed using the given key (signed with the private key for the provided public key) */
export function verifySignedWithPublicKey(
  data: string | Buffer,
  publicKey: EthereumPublicKey,
  signature: EthereumSignature,
): boolean {
  const signedWithPubKey = getEthereumPublicKeyFromSignature(toEthereumSignatureNative(signature), data)
  return Helpers.ensureHexPrefixForPublicKey(signedWithPubKey) === Helpers.ensureHexPrefixForPublicKey(publicKey)
}

/** Prepares a message body (e.g. a message/string to be signed) with the appropriate chain specific prefix or suffix
 * For Eth, prepends the standard message prefix ('Ethereum Signed Message:') to the beginning of data
 * Returns a HexString of the complete message (including the additions)
 * Adding data to the message allows a wallet to sign an arbitrary string without risking signing an actual transaction */
export function prepareMessageToSign(data: string | Buffer): string {
  const body = Helpers.convertUtf8OrHexStringToBuffer(data)
  const prefix = Buffer.from(`\u0019Ethereum Signed Message:\n${body.length.toString()}`, 'utf-8')
  return Helpers.bufferToHexString(Buffer.concat([prefix, body]))
}

/** Signs data as a message using private key (first prefixing additional message string) */
export function signMessage(data: string | Buffer, privateKey: string): EthereumSignatureNative {
  const dataString = prepareMessageToSign(data)
  return sign(dataString, privateKey)
}

/** Verify that a 'personal message' was signed using the given key (signed with the private key for the provided public key)
 * A message differs than verifySignedWithPublicKey() because it might additional strings appended (Eth best-practices has a prefixed message)
 * This differs from verifySignedWithPublicKey() because a message might include additional strings appended (as required by chain best-practices) */
export function verifySignedMessage(
  data: string | Buffer,
  publicKey: EthereumPublicKey,
  signature: EthereumSignature,
): boolean {
  const completeMessage = prepareMessageToSign(data)
  return verifySignedWithPublicKey(completeMessage, publicKey, signature)
}
