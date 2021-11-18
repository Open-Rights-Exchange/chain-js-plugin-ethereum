//import { ChainActionType } from '../../../models'
import { EthereumChainActionType } from './chainActionTypeModels'
import { Interfaces, Models, ChainFactory, Helpers, PluginInterfaces, Crypto, Errors } from '@open-rights-exchange/chainjs'



export type EthereumDecomposeReturn = {
  chainActionType: Models.ChainActionType | EthereumChainActionType
  args: any
  partial?: boolean
}
