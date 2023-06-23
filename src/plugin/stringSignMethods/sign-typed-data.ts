import { Models, Errors } from '@open-rights-exchange/chain-js'
import { EthereumPrivateKey, SignMessageSignTypedDataInput } from '../models'
import { getEthersWallet, splitSignature, verifyTypedData } from '../helpers'

export async function validateSignTypedDataInput(
  data: SignMessageSignTypedDataInput,
): Promise<Models.SignMessageValidateResult> {
  let result: Models.SignMessageValidateResult

  let message = ''
  let valid = true

  if (!data || !data.domain) {
    message += ' domain property is missing.'
    valid = false
  }

  if (!data || !data.message) {
    message += ' message property is missing.'
    valid = false
  }

  if (!data || !data.primaryType) {
    message += ' primaryType property is missing.'
    valid = false
  }

  if (!data || !data.types) {
    message += ' types property is missing.'
    valid = false
  }

  if (!data || !data.version) {
    message += ' version property is missing.'
    valid = false
  }

  /* If any part of the input is not valid then let's build an example to reply with */
  if (!valid) {
    const { errorMessage, example } = composeErrorExampleMessage(message)
    result = {
      valid: false,
      message: errorMessage,
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

export function composeErrorExampleMessage(message: any = {}) {
  const errorMessage = `The data supplied to signTypedData is incorrectly formatted or missing (Details of the internal function being called can be found here - https://docs.ethers.org/v5/api/signer/#Signer-signTypedData): ${JSON.stringify(message)}. Please see the example property attached to this object. For more information on this example please see - https://medium.com/coinmonks/eip712-a-full-stack-example-e12185b03d54`

  const eip712Domain = {
    name: 'name',
    version: '1',
    verifyingContract: '0xB6Fa4E9B48F6fAcd8746573d8e151175c40121C7',
    chainId: 1,
  }

  const eip712Types = {
    MyTypeA: [
      { name: 'sender', type: 'address' },
      { name: 'x', type: 'uint' },
      { name: 'deadline', type: 'uint' },
    ],
  }

  const milsecDeadline = Date.now() / 1000 + 100
  const deadline = parseInt(String(milsecDeadline).slice(0, 10), 10)
  const x = 5

  const example = {
    version: 4,
    types: eip712Types,
    primaryType: 'MyTypeA',
    domain: eip712Domain,
    message: {
      sender: 'xxx',
      x,
      deadline,
    },
  }

  return {
    errorMessage,
    example,
  }
}

export async function signTypedData(
  privateKeys: EthereumPrivateKey[],
  data: SignMessageSignTypedDataInput,
): Promise<Models.SignMessageResult> {
  const privateKey = privateKeys[0]
  const signer = getEthersWallet(privateKey)
  const sig = await signer._signTypedData(data.domain, data.types, data.message)

  const expectedSignerAddress = signer.address
  const recoveredAddress = verifyTypedData(data.domain, data.types, data.message, sig)
  if (recoveredAddress !== expectedSignerAddress) {
    Errors.throwNewError('Validation of the genarated signature failed')
  }

  const signatureParts = splitSignature(sig)
  const result = { signature: sig, details: { r: signatureParts.r, s: signatureParts.s, v: signatureParts.v } }
  return result
}
