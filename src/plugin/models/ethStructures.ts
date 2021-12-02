// import { ChainActionType } from '../../../models'
import { Models } from '@open-rights-exchange/chainjs'
import { EthereumChainActionType } from './chainActionTypeModels'

export type EthereumDecomposeReturn = {
  chainActionType: Models.ChainActionType | EthereumChainActionType
  args: any
  partial?: boolean
}
