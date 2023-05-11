/** EthSignMethods enum contains the methods that can be used to sign a string */

export enum SignMethod {
  EthereumPersonalSign = 'ethereum.personal-sign',
  EthereumSignTypedData = 'ethereum.sign-typed-data'
}

/** SignStringOptions options used when contructing a signString object */

export type SignStringOptions = {
  signMethod: SignMethod
}


/** SignStringSignResult input contains the signature and the details containing r,s,v signature paramters */

export type SignStringSignResult = {
  signature: String
  details: any
}


/**  SignStringValidateResult input contains the validation result (valid), message and example */

export type SignStringValidateResult = {
  valid: boolean
  message: string,
  example: any
}

/** 
  ERC712 SignTypedData input contains the following fields:
  version: a version number for the signature
  types: a map of the types used in the signature
  primaryType: the primary type of the signature
  domain: the domain of the signature (containing the chainId and verifyingContract)
  message: the message of the signature
*/

export type SignTypedDataInput = {
  version: number
  types: any
  primaryType: String
  domain: any
  message: any
}

/** PersonalSignDataInput contains the string to sign */ 

export type PersonalSignDataInput = {
  stringToSign: string
}
