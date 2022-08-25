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
    // Notice how even though we are providing a fee multiplier, it does not impact the user supplied value.
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 2,
        [Models.TxExecutionPriority.Average]: 2,
        [Models.TxExecutionPriority.Fast]: 2,
      },
      maxFeeIncreasePercentage: 10,
    }

    const gasPrice = Helpers.decimalToHexString('2000000000')
    const gasLimit = Helpers.decimalToHexString('21500') // 21000 + 4

    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, gasPrice, gasLimit, null)
    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note that even though we're supplying feeMultipliers they should not effect the supplied gasPrice of 2000000000
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x77359400')
    // Note that even though we're supplying maxFeeIncreasePercentage it should not modify the supplied gasLimit of 21500
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x53fc')
  })

  test('GasPrice and GasLimit set in the transaction are exactly what is used to run the transaction', async () => {
    const gasPrice = Helpers.decimalToHexString('3000000000') // 3 GWEI
    const gasLimit = Helpers.decimalToHexString((22000).toString()) // 21000 + 4

    // Notice how even though we are providing a fee multiplier, it does not impact the user supplied value.
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 2,
        [Models.TxExecutionPriority.Average]: 2,
        [Models.TxExecutionPriority.Fast]: 2,
      },
      maxFeeIncreasePercentage: 10,
      gasPrice,
      gasLimit,
    }

    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, null, null)
    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note that even though we're supplying feeMultipliers they should not effect the supplied gasPrice of 3000000000
    expect(tx.actions[0].gasPrice.toString()).toEqual('0xb2d05e00')
    // Note that even though we're supplying maxFeeIncreasePercentage it should not modify the supplied gasLimit of 22000
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x55F0'.toLowerCase())
  })

  test('Providing just the gasPrice should result in the GasLimit being calculated by the plugin', async () => {
    const defaultTransactionOptions = {
      maxFeeIncreasePercentage: 10,
    }
    const gasPrice = Helpers.decimalToHexString('2000000000')
    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, gasPrice, null, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // We supplied 2000000000 as the gasPrice so it should be exactly that 0x77359400
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x77359400'.toString())
    // This should be calculated.
    // GasLimit: (21000 + 4) + (maxFeeIncreasePercentage of 10%) = 23104 (0x5a40)
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x5a40'.toString())
  })

  test('Providing just the gasLimit in the transaction should result in the GasPrice being calculated by the plugin', async () => {
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 1,
        [Models.TxExecutionPriority.Average]: 1,
        [Models.TxExecutionPriority.Fast]: 1.2,
      },
      executionPriority: Models.TxExecutionPriority.Fast,
      maxFeeIncreasePercentage: 10,
    }
    const gasLimit = Helpers.decimalToHexString((22000).toString())
    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, gasLimit, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note: We're mocking the call to chain that gets the gas price, so the calculated gas price should remain consistent
    // GasPrice: (1171000007 + 20%)
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x53C1A688'.toLowerCase())
    // GasLimit that was set was 22000 and it should be exectly that
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x55F0'.toLowerCase())
  })

  test('When gasFee and gasLimit are not provided in any capacity AND no Multiplier is present both values are calculated', async () => {
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 1,
        [Models.TxExecutionPriority.Average]: 1,
        [Models.TxExecutionPriority.Fast]: 1.2,
      },
      executionPriority: Models.TxExecutionPriority.Fast,
      maxFeeIncreasePercentage: 10,
    }
    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, null, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note: We're mocking the call to chain that gets the gas price, so the calculated gas price should remain consistent
    // GasPrice: (1171000007 + 20%)
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x53C1A688'.toLowerCase())
    // GasLimit: (21000 + 4) + (maxFeeIncreasePercentage of 10%) = 23104 (0x5a40)
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x5a40'.toLowerCase())
  })

  test('When gasFee and gasLimit are not provided in any capacity AND a Multiplier present, the multiplied is applied to the gasPrice and not the gasLimit', async () => {
    const defaultTransactionOptions = {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 2,
        [Models.TxExecutionPriority.Average]: 5,
        [Models.TxExecutionPriority.Fast]: 10,
      },
      executionPriority: Models.TxExecutionPriority.Fast,
      maxFeeIncreasePercentage: 0,
    }

    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, null, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    // Note: We're mocking the call to chain that gets the gas price, so the calculated gas price should remain consistent
    expect(tx.actions[0].gasPrice.toString()).toEqual('0x2b9f86bc6')
    expect(tx.actions[0].gasLimit.toString()).toEqual('0x520c')
  })

  test('If the nonce is explicitly set in the action then it should persist and be used in the transaction', async () => {
    const nonce = '0x26'
    tx = await chain.new.Transaction({})
    action = await composeSendTokenEthereum(chain, account2, null, null, nonce)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    expect(tx.actions[0].nonce.toString()).toEqual(nonce)
  })

  test('If the nonce is explicitly set in the transacton then it should persist and be used in the transaction', async () => {
    const nonce = '0x26'
    const defaultTransactionOptions = {
      nonce,
    }

    tx = await chain.new.Transaction(defaultTransactionOptions)
    action = await composeSendTokenEthereum(chain, account2, null, null, null)

    await tx.setTransaction(action)
    await tx.prepareToBeSigned()
    expect(tx.actions[0].nonce.toString()).toEqual(nonce)
  })
})
