/** EthSignMethods enum contains the methods that can be used to sign a string */

export enum SignMethod {
  Default = 'ethereum.personal-sign',
  EthereumSignTypedData = 'ethereum.sign-typed-data',
  EthereumSign = 'ethereum.eth-sign'
}

/** SignMessageOptions options used when contructing a SignMessage object */

export type SignMessageOptions = {
  signMethod: SignMethod
}


/** SignMessageResult input contains the signature and the details containing r,s,v signature paramters */

export type SignMessageResult = {
  signature: String
  details: any
}


/**  SignMessageValidateResult input contains the validation result (valid), message and example */

export type SignMessageValidateResult = {
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

export const SignTypedDataInputModel = {
  version: 0,
  types: {},
  primaryType: '',
  domain: {},
  message: {},
};

export type SignTypedDataInput = typeof SignTypedDataInputModel;

/** PersonalSignDataInput contains the string to sign */ 

export type PersonalSignDataInput = {
  stringToSign: string
}
