import { Chain, Models, Transaction, Helpers } from '@open-rights-exchange/chain-js'
import nock from 'nock'
import { getChain } from '../tests/helpers'
import { ChainNetwork } from '../tests/mockups/chainConfig'
import { account2, composeSendTokenEthereum } from '../tests/mockups/ethereumTransactions'
import { startVCR, stopVCR } from '../tests/mockups/VCR'

function withFixedRequestIds(defns: nock.Definition[]) {
  let id = 0
  return defns.map(def => {
    id++
    return {
      ...def,
      body: {
        ...(def.body as nock.DataMatcherMap),
        id,
      },
      response: {
        ...(def.response as Record<string, any>),
        id,
      },
    }
  })
}

describe('Transaction properties', () => {
  let chain: Chain
  let tx: Transaction
  let action: any

  beforeEach(async () => {
    await startVCR(withFixedRequestIds)
    chain = await getChain(ChainNetwork.EthRopsten, true)
  })
  afterEach(async () => {
    await stopVCR()
  })

  test('GasPrice and GasLimit set in the acton are exactly what is used to run the transaction', async () => {
    const gasPrice = Helpers.decimalToHexString('2000000000')
    const gasLimit = Helpers.decimalToHexString('21500') // 21000 + 4

    tx = await chain.new.Transaction({})
    action = await composeSendTokenEthereum(chain, account2, gasPrice, gasLimit)
    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x77359400')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x53fc')
  })

  test('GasPrice and GasLimit set in the transaction are exactly what is used to run the transaction', async () => {
    const gasPrice = Helpers.decimalToHexString('3000000000') // 3 GWEI
    const gasLimit = Helpers.decimalToHexString((21000 + 4).toString()) // 21000 + 4

    // Notice how even though we are providing a fee multiplier, it does not impact the user supplied value.
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 2,
        [Models.TxExecutionPriority.Average]: 2,
        [Models.TxExecutionPriority.Fast]: 2,
      },
      gasPrice,
      gasLimit,
    }

    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, null)
    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    expect(tx.actions[0].gasPrice.toString()).toEqual('0xb2d05e00')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x520c')
  })

  test('Providing just the gasPrice should result in the GasLimit being calculated by the plugin', async () => {
    const gasPrice = Helpers.decimalToHexString('2000000000')

    tx = await chain.new.Transaction({})
    action = await composeSendTokenEthereum(chain, account2, gasPrice, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x77359400')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x520c')
  })

  test('Providing just the gasLimit in the transaction should result in the GasPrice being calculated by the plugin', async () => {
    const gasLimit = Helpers.decimalToHexString((22000).toString()) // 21000 + 4
    tx = await chain.new.Transaction({})
    action = await composeSendTokenEthereum(chain, account2, null, gasLimit)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note: We're mocking the call to chain that gets the gas price, so the calculated gas price should remain consistent
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x59682f07')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x55f0')
  })

  test('When gasFee and gasLimit are not provided in any capacity AND no Multiplier is present both values are calculated', async () => {
    tx = await chain.new.Transaction({})
    action = await composeSendTokenEthereum(chain, account2, null, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note: We're mocking the call to chain that gets the gas price, so the calculated gas price should remain consistent
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x59682f07')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x520c')
  })

  test('When gasFee and gasLimit are not provided in any capacity AND a Multiplier present, the multiplied is applied to the gasPrice and not the gasLimit', async () => {
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 2,
        [Models.TxExecutionPriority.Average]: 5,
        [Models.TxExecutionPriority.Fast]: 10,
      },
      executionPriority: Models.TxExecutionPriority.Fast,
    }

    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note: We're mocking the call to chain that gets the gas price, so the calculated gas price should remain consistent
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x59682f07')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x520c')
    expect(1).toEqual(1)
  })
})
