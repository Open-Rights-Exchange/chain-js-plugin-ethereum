import { SignMethod } from '../plugin/models/signMessageModels'
import { PrivateKeyBrand } from '../../../chain-js/src/models'
import { EthereumSignMessage } from '../plugin/ethSignMessage'

describe('Ethereum SignMessage Tests', () => {
  it('ethereum.eth-sign - validate passes when input is correct', async () => {
    const input2 = {
      stringToSign: 'Something to sign here',
    }

    const SignMessageOptions = { signMethod: SignMethod.Default }
    const SignMessage = new EthereumSignMessage(input2, SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.eth-sign - validate passes when input is correct and no options are provided', async () => {
    const input2 = {
      stringToSign: 'Something to sign here',
    }

    const SignMessage = new EthereumSignMessage(input2)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.sign-typed-data - validate passes when input is correct', async () => {
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

    const input = {
      version: 4,
      types: eip712Types,
      primaryType: 'MyTypeA',
      domain: eip712Domain,
      message: {
        sender: '0xe0B7AE41401D8301BE85Bc8103eA2A3C221b8b09',
        x,
        deadline,
      },
    }

    const SignMessageOptions = { signMethod: SignMethod.EthereumSignTypedData }
    const SignMessage = new EthereumSignMessage(input, SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
    expect(result.details.r).toBeDefined()
    expect(result.details.s).toBeDefined()
    expect(result.details.v).toBeDefined()
  })
})
