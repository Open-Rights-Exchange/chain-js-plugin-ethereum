import { PluginChainFactory } from '@open-rights-exchange/chain-js'
import { chainConfig, ChainNetwork } from './mockups/chainConfig'
import { Plugin as EthereumPlugin } from '../index'

/** create an instance of a chainjs plugin */
export async function getChain(chainNetwork: ChainNetwork, connect = false) {
  const config = chainConfig[chainNetwork]
  const chain = PluginChainFactory([EthereumPlugin], config.chainType, config.endpoints, config.chainSettings)
  if (connect) {
    await chain.connect()
  }
  return chain
}
