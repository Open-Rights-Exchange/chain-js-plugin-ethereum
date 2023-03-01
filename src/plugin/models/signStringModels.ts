/** SignString options used when contructing a signString object */
export type SignStringOptions = {
  signMethod: string
}

/** Transaction receipt returned from chain after submitting the transaction */
/** It can contain fields like transaction id, transaction hash etc */
export type SignStringSignResult = {
  signature: String
  details: any
}

export type SignStringValidateResult = {
  signature: String
  details: any
}

export type SignTypedDataInput = {
  version: number
  types: any
  primaryType: String
  domain: any
  message: any
}

export type PersonalSignDataInput = {
  stringToSign: string
}
