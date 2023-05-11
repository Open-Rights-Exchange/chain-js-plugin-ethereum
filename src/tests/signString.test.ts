import { SignMethod } from '../plugin/models/signStringModels'
import { PrivateKeyBrand } from '../../../chain-js/src/models'
import { EthereumSignMessage } from '../plugin/ethSignString'

describe('Ethereum SignString Tests', () => {
  it('ethereum.eth-sign - validate fails when input is incorrect', async () => {
    // expect(1).toBeNull()
    const input2 = {
      BADstringToSign: 'Something to sign here',
    }

    const signStringOptions = { signMethod: SignMethod.EthereumPersonalSign }
    const signString = new EthereumSignMessage(input2, signStringOptions)
    const validateResult = await signString.validate()
    expect(validateResult.valid).toBeFalsy()
  })

  it('ethereum.eth-sign - validate passes when input is correct', async () => {
    // expect(1).toBeNull()
    const input2 = {
      stringToSign: 'Something to sign here',
    }

    const signStringOptions = { signMethod: SignMethod.EthereumPersonalSign }
    const signString = new EthereumSignMessage(input2, signStringOptions)
    const validateResult = await signString.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await signString.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.eth-sign - validate passes when input is correct and no options are provided', async () => {
    const input2 = {
      stringToSign: 'Something to sign here',
    }

    const signString = new EthereumSignMessage(input2)
    const validateResult = await signString.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await signString.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.sign-typed-data - validate fails when input is incorrect', async () => {
    const input2 = {
      BADstringToSign: 'Something to sign here',
    }

    const signStringOptions = { signMethod: SignMethod.EthereumPersonalSign }
    const signString = new EthereumSignMessage(input2, signStringOptions)
    const validateResult = await signString.validate()
    expect(validateResult.valid).toBeFalsy()
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

    const signStringOptions = { signMethod: SignMethod.EthereumSignTypedData }
    const signString = new EthereumSignMessage(input, signStringOptions)
    const validateResult = await signString.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await signString.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
    expect(result.details.r).toBeDefined()
    expect(result.details.s).toBeDefined()
    expect(result.details.v).toBeDefined()
  })
})
