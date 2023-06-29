import { Models } from '@open-rights-exchange/chain-js'
import { SignMessageMethod } from '../plugin/models/signMessageModels'

import { EthereumSignMessage } from '../plugin/ethSignMessage'

describe('Ethereum SignMessage Tests', () => {
  it('ethereum.eth-sign - validate passes when input is correct', async () => {
    const stringToSign = 'Something to sign here'
    const SignMessageOptions = { signMethod: SignMessageMethod.Default }
    const SignMessage = new EthereumSignMessage(stringToSign, SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as Models.PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.eth-sign - validate passes when input is correct and no options are provided', async () => {
    const stringToSign = 'Something to sign here'
    const SignMessage = new EthereumSignMessage(stringToSign)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as Models.PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.eth-sign - validate passes when options is signMethod ethereum.eth-sign', async () => {
    const stringToSign = 'Something to sign here'
    const options = { signMethod: SignMessageMethod.EthereumSign }
    const SignMessage = new EthereumSignMessage(stringToSign, options)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as Models.PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
  })

  it('ethereum.eth-sign-typed-data - validate a typed data with EIP712Domain and/or without version field', async () => {
    const input = {"domain":{"name":"Ether Mail","version":"1","chainId":5,"verifyingContract":"0xcccccccccccccccccccccccccccccccccccccccc"},"primaryType":"Mail","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"message":{"from":{"name":"Cow","wallet":"0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826"},"to":{"name":"Bob","wallet":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},"contents":"Hello, Bob!"}}
    const SignMessageOptions = { signMethod: SignMessageMethod.EthereumSignTypedData }
    const SignMessage = new EthereumSignMessage(JSON.stringify(input), SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as Models.PrivateKeyBrand,
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

    const SignMessageOptions = { signMethod: SignMessageMethod.EthereumSignTypedData }
    const SignMessage = new EthereumSignMessage(JSON.stringify(input), SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeTruthy()
    const result = await SignMessage.sign([
      '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6' as unknown as Models.PrivateKeyBrand,
    ])
    expect(result.signature).toBeDefined()
    expect(result.details.r).toBeDefined()
    expect(result.details.s).toBeDefined()
    expect(result.details.v).toBeDefined()
  })

  it('ethereum.sign-typed-data - validate fails when input is not correct', async () => {
    const wrongInput = {
      wrongVersion: 4,
      wrongPrimaryTypefield: 'MyTypeA',
      wrongMessage: {
        sender: '0xe0B7AE41401D8301BE85Bc8103eA2A3C221b8b09',
      },
    }

    const SignMessageOptions = { signMethod: SignMessageMethod.EthereumSignTypedData }
    const SignMessage = new EthereumSignMessage(JSON.stringify(wrongInput), SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.valid).toBeFalsy()
  })

  it('ethereum.sign-typed-data - provides helpfull error message when input is malformed (string)', async () => {
    const wrongInput = 'string that is not json'

    expect(() => {
      const SignMessageOptions = { signMethod: SignMessageMethod.EthereumSignTypedData }
      const SignMessage = new EthereumSignMessage(JSON.stringify(wrongInput), SignMessageOptions)
      console.log(SignMessage)
    }).toThrow('The data supplied to signTypedData is incorrectly formatted')
  })

  it('ethereum.sign-typed-data - provides helpfull error message when input is malformed JSON', async () => {
    const wrongInput = { random: 1 }
    const SignMessageOptions = { signMethod: SignMessageMethod.EthereumSignTypedData }
    const SignMessage = new EthereumSignMessage(JSON.stringify(wrongInput), SignMessageOptions)
    const validateResult = await SignMessage.validate()
    expect(validateResult.message).toContain('The data supplied to signTypedData is incorrectly formatted')
  })
})
