// import { ChainEthereumV1, ChainFactory, ChainType } from '../../../..'
// import { TxExecutionPriority } from '../../../../models'
import { Models, PluginChainFactory } from '@open-rights-exchange/chain-js'
import { EthereumChainEndpoint, EthereumChainSettings } from '../../models'
import ChainEthereumV1 from '../../ChainEthereumV1'

// goerli
export const goerliEndpoints: EthereumChainEndpoint[] = [
  {
    url: 'https://goerli.infura.io/v3/fc379c787fde4363b91a61a345e3620a',
  },
]
export const goerliChainOptions: EthereumChainSettings = {
  chainForkType: {
    chainName: 'goerli',
    hardFork: 'istanbul',
  },
  defaultTransactionSettings: {
    maxFeeIncreasePercentage: 20,
    executionPriority: Models.TxExecutionPriority.Fast,
  },
}
// ropsten
export const ropstenEndpoints: EthereumChainEndpoint[] = [
  {
    url: 'https://ropsten.infura.io/v3/fc379c787fde4363b91a61a345e3620a',
  },
]
// main net
export const mainnetEndpoints: EthereumChainEndpoint[] = [
  {
    url: 'https://mainnet.infura.io/v3/fc379c787fde4363b91a61a345e3620a',
  },
]
export const ropstenChainOptions: EthereumChainSettings = {
  chainForkType: {
    chainName: 'ropsten',
    hardFork: 'istanbul',
  },
  defaultTransactionSettings: {
    maxFeeIncreasePercentage: 20,
    executionPriority: Models.TxExecutionPriority.Fast,
  },
}

export async function connectChain(endpoints: EthereumChainEndpoint[], chainOptions: EthereumChainSettings) {
  const chain = PluginChainFactory(
    [ChainEthereumV1],
    Models.ChainType.EthereumV1,
    endpoints,
    chainOptions,
  ) as ChainEthereumV1
  await chain.connect()
  return chain
}
