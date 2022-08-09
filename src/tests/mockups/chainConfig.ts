import { Models } from '@open-rights-exchange/chain-js'
import keys from './keys'

export enum ChainNetwork {
  EthRopsten = 'eth_ropsten',
  EthRinkeby = 'eth_rinkeby',
}

export interface IChainSettings {
  defaultTransactionOptions: any
  chainType: Models.ChainType
  endpoints: [Models.ChainEndpoint]
  chainSettings: any
  account_MSIG: string
  account1: string
  account2: string
  symbol: string
  permission1: any
  permission2: any
  privateKey_singleSign: string
  privateKeys_MSIG: string[]
  transferAmount: string
  precision: number
}

export type IAllChainSettings = {
  [chainNetwork in ChainNetwork]: IChainSettings
}

export const chainConfig: IAllChainSettings = {
  eth_ropsten: {
    defaultTransactionOptions: {},
    chainType: Models.ChainType.EthereumV1,
    endpoints: [{ url: 'https://ropsten.infura.io/v3/b1664813d49f45c7a5bb42a395447977' }],
    account_MSIG: keys.eth_rinkeby_account1_privateKey,
    account1: keys.eth_rinkeby_account1_privateKey,
    account2: keys.eth_rinkeby_account1_privateKey,
    chainSettings: {
      chainForkType: {
        chainName: 'ropsten',
        hardFork: 'istanbul',
      },
      defaultTransactionSettings: {
        maxFeeIncreasePercentage: 20,
        executionPriority: Models.TxExecutionPriority.Fast,
      },
    },
    symbol: 'gwei',
    permission1: null,
    permission2: null,
    privateKey_singleSign: process.env.eth_ropsten_privateKey ?? '',
    privateKeys_MSIG: [process.env.eth_ropsten_msig_1_privateKey],
    transferAmount: '10001',
    precision: 18,
  },
  eth_rinkeby: {
    defaultTransactionOptions: {
      feeMultipliers: {
        [Models.TxExecutionPriority.Slow]: 2,
        [Models.TxExecutionPriority.Average]: 2.1,
        [Models.TxExecutionPriority.Fast]: 2.2,
      },
    },
    chainType: Models.ChainType.EthereumV1,
    endpoints: [
      {
        url: 'https://rinkeby.infura.io/v3/b1664813d49f45c7a5bb42a395447977',
      },
    ],
    account_MSIG: keys.eth_rinkeby_account2_address,
    account1: keys.eth_rinkeby_account2_privateKey,
    account2: keys.eth_rinkeby_account1_address,
    chainSettings: {
      chainForkType: {
        chainName: 'rinkeby',
        hardFork: 'istanbul',
      },
      defaultTransactionSettings: {
        maxFeeIncreasePercentage: 20,
        executionPriority: Models.TxExecutionPriority.Fast,
      },
    },
    symbol: 'gwei',
    permission1: null,
    permission2: null,
    privateKey_singleSign: process.env.eth_rinkeby_privateKey ?? '',
    privateKeys_MSIG: [process.env.eth_rinkeby_msig_1_privateKey],
    transferAmount: '10001',
    precision: 18,
  },
}
