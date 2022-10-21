/* eslint-disable no-console */
// How to use fetch mocks - https://www.npmjs.com/package/jest-fetch-mock
// import { toChainEntityName } from '../../../helpers'
// import { ChainType } from '../../..'
import { Interfaces, Models, PluginChainFactory, Helpers } from '@open-rights-exchange/chain-js'
import nock from 'nock'
import { startVCR, stopVCR } from '@aikon/network-vcr'
import { goerliEndpoints as testNetEndpoints } from '../plugin/examples/helpers/networks'
import { toEthereumSymbol } from '../plugin/helpers'
// import { ChainFactory } from '../../../chainFactory'
// import { Chain } from '../../../interfaces'
import plugin from '../plugin/ChainEthereumV1'

nock.disableNetConnect()

beforeEach(async () => {
  await startVCR()
})

afterEach(async () => {
  await stopVCR()
})

describe('Ethereum Helper Functions', () => {
  let testNet: Interfaces.Chain
  beforeEach(async () => {
    testNet = PluginChainFactory([plugin], Models.ChainType.EthereumV1, testNetEndpoints)
    await testNet.connect()
  })
  // sets fetchMock to throw an error on the next call to fetch (jsonRpc.get_abi calls fetch and triggers the error to be thrown)
  it('Get Native Balance', async () => {
    const balance = await testNet.fetchBalance(
      Helpers.toChainEntityName('0xA2910d9b2Bd0Bdc1DfCCDDAd532680b167Df1894'),
      toEthereumSymbol('eth'),
    )
    // console.log('Eth Balance: ', balance)
    expect(balance).toBeTruthy()
  })

  it('get erc20 Balance', async () => {
    const balance = await testNet.fetchBalance(
      Helpers.toChainEntityName('0xb83339d874f27b7e74dc188bd6b2a51a1167946c'),
      toEthereumSymbol('USDC'),
      '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    )
    expect(balance).toBeTruthy()
  })
})
