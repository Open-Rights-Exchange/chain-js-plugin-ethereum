import { Models } from '@open-rights-exchange/chain-js'
import { ethers } from 'ethers'
import { EthereumPrivateKey, PersonalSignDataInput } from '../models'
import { convertStringToUInt8Array, splitSignature, getEthersWallet } from '../helpers'

export async function validatePersonalSignInput(data: PersonalSignDataInput): Promise<Models.SignStringValidateResult> {
  let result: Models.SignStringValidateResult

  let message = ''
  let valid = true

  // Check that the stringToSign property exists.
  if (!data || !data.stringToSign) {
    message += ' stringToSign property is missing.'
    valid = false
  }

  // Check that message is string
  if (typeof data.stringToSign !== 'string') {
    message += ' stringToSign property must be a string.'
    valid = false
  }

  /* If any part of the input is not valid then let's build an example to reply with */
  if (!valid) {
    const fullMessage = `The data supplied to personalSign is incorrectly formatted or missing: ${message}`

    const example = {
      stringToSign: 'The message you would like to sign here',
    }

    result = {
      valid,
      message: fullMessage,
      example,
    }
  } else {
    result = {
      valid: true,
      message: '',
      example: {},
    }
  }

  return result
}

export async function personalSign(
  privateKeys: EthereumPrivateKey[],
  data: PersonalSignDataInput,
): Promise<Models.SignStringSignResult> {
  const privateKey = privateKeys[0]
  const signer = getEthersWallet(privateKey)

  const dataBytes: Uint8Array = convertStringToUInt8Array(data.stringToSign)
  const sig = await signer.signMessage(dataBytes)

  const signatureParts = splitSignature(sig)
  const result = { signature: sig, details: { r: signatureParts.r, s: signatureParts.s, v: signatureParts.v } }
  return result
}
