/* eslint-disable max-len */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
// import { ChainFactory, ChainType } from '../../../index'
import { Interfaces, Models, Helpers, PluginChainFactory } from '@open-rights-exchange/chain-js'
import { EthereumChainEndpoint, EthereumChainSettings } from '../models'
// import { asyncForEach, sleep } from '../../../helpers'
// import { TxExecutionPriority } from '../../../models'
import { toEthereumPrivateKey } from '../helpers'
import ChainEthereumV1 from '../ChainEthereumV1'

require('dotenv').config()

const { env } = process

const ropstenEndpoints: EthereumChainEndpoint[] = [
  {
    url: 'https://ropsten.infura.io/v3/fc379c787fde4363b91a61a345e3620a',
  },
]

const mainnetEndpoints: EthereumChainEndpoint[] = [
  {
    url: 'https://mainnet.infura.io/v3/fc379c787fde4363b91a61a345e3620a',
  },
]

function range(start: number, step: number) {
  return Array.apply(0, Array(step)).map((element: number, index: number) => index + start)
}

const ropstenChainOptions: EthereumChainSettings = {
  chainForkType: {
    chainName: 'ropsten',
    hardFork: 'istanbul',
  },
  defaultTransactionSettings: {
    maxFeeIncreasePercentage: 20,
    executionPriority: Models.TxExecutionPriority.Fast,
  },
}

const mainChainOptions: EthereumChainSettings = {
  chainForkType: {
    chainName: 'mainnet',
    hardFork: 'istanbul',
  },
  defaultTransactionSettings: {
    maxFeeIncreasePercentage: 20,
    executionPriority: Models.TxExecutionPriority.Fast,
  },
}

// address (and matching private key) to cancel all pending transactions for - replace with your address
const accountToCancelFor = env.ROPSTEN_erc20acc
const privateKeyForCancelAccount = env.ROPSTEN_erc20acc_PRIVATE_KEY as any

;(async () => {
  try {
    const ethChain = PluginChainFactory(
      [ChainEthereumV1],
      Models.ChainType.EthereumV1,
      ropstenEndpoints,
      ropstenChainOptions,
    ) as ChainEthereumV1
    await ethChain.connect()
    const highestNonceExecuted = await ethChain.web3.eth.getTransactionCount(accountToCancelFor, 'latest')
    const highestNoncePending = await ethChain.web3.eth.getTransactionCount(accountToCancelFor, 'pending')
    console.log('last nonce executed: ', highestNonceExecuted)
    console.log('highest nonce pending: ', highestNoncePending)
    const cancelationTrx = {
      from: accountToCancelFor,
      to: accountToCancelFor,
      amount: 0,
    }
    if (highestNoncePending > highestNonceExecuted) {
      console.log(`cancelling ${highestNoncePending - highestNonceExecuted} pending transactions`)
      const nonceRange = range(highestNonceExecuted, highestNoncePending - highestNonceExecuted)
      await Helpers.asyncForEach(nonceRange, async nonce => {
        const transaction = await ethChain.new.Transaction()
        await transaction.setTransaction({ ...cancelationTrx, nonce })
        const { feeStringified } = await transaction.getSuggestedFee(Models.TxExecutionPriority.Fast)
        await transaction.setDesiredFee(feeStringified)
        await transaction.validate()
        await transaction.prepareToBeSigned()
        await transaction.sign([toEthereumPrivateKey(privateKeyForCancelAccount)])
        try {
          console.log('transaction sent: ', await transaction.send())
        } catch (err) {
          console.log(err)
        }
        Helpers.sleep(500)
      })
    }
    console.log('no pending')
  } catch (error) {
    console.log(error)
  }
})()
