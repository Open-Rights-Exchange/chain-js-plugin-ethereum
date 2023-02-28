import { Models, Errors } from '@open-rights-exchange/chain-js'
import { ethers } from 'ethers'
import { EthereumPrivateKey } from '../models'

export async function validateSignTypedDataInput(): Promise<Models.SignStringValidateResult> {
  let result: Models.SignStringValidateResult

  // ToDo: Add validation logic
  result = {
    valid: true,
    message: 'Something wrong with input. Please see the following example input',
    example: { a: 123, b: 456 },
  }
  console.log('validateSignTypedDataInput called')
  return result
}

export async function signTypedData(
  privateKeys: EthereumPrivateKey[],
  data: any,
): Promise<Models.SignStringSignResult> {
  const privateKey = privateKeys[0]
  const signer = new ethers.Wallet(privateKey)
  const sig = await signer._signTypedData(data.domain, data.types, data.message)

  const expectedSignerAddress = signer.address
  const recoveredAddress = ethers.utils.verifyTypedData(data.domain, data.types, data.message, sig)
  if (recoveredAddress !== expectedSignerAddress) {
    Errors.throwNewError('Validation of the genarated signature failed')
  }

  const signatureParts = ethers.utils.splitSignature(sig)
  const result = { signature: sig, details: { r: signatureParts.r, s: signatureParts.s, v: signatureParts.v } }
  return result
}
