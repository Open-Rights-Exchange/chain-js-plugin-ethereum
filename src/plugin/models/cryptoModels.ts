import { Models } from '@open-rights-exchange/chain-js'

/** an ethereum transaction signature */
export interface ECDSASignature {
  v: number
  r: Buffer
  s: Buffer
}

/** a private key string - formatted correctly for ethereum */
export type EthereumPrivateKey = string & Models.PrivateKeyBrand

/** a public key string - formatted correctly for ethereum */
export type EthereumPublicKey = string & Models.PublicKeyBrand

/** a stringified Ethereum signature - may have diff underlying formats (e.g. multisig) */
export type EthereumSignature = string & Models.SignatureBrand

/** a native Ethereum ECDSA signature structure */
export type EthereumSignatureNative = ECDSASignature & Models.SignatureBrand

/** key pair - in the format returned from algosdk */
export type EthereumKeyPair = {
  publicKey: EthereumPublicKey
  privateKey: EthereumPrivateKey
  privateKeyEncrypted?: Models.ModelsCryptoAes.AesEncryptedDataString
}
