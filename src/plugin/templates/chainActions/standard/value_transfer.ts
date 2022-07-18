import { Helpers, Models } from '@open-rights-exchange/chain-js'
import { EthUnit, EthereumTransactionAction } from '../../../models'
import { toEthUnit, toWeiString } from '../../../helpers'
import { DEFAULT_ETH_UNIT } from '../../../ethConstants'
// import { ChainActionType, ValueTransferParams, ActionDecomposeReturn } from '../../../../../models'

import {
  composeAction as ethTransferComposeAction,
  decomposeAction as ethTransferDecomposeAction,
  EthTransferParams,
} from '../chainSpecific/eth_transfer'

export interface EthereumValueTransferParams extends Models.ValueTransferParams {
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

/** Sends ETH (in units of Wei) */
export const composeAction = (params: EthereumValueTransferParams) => {
  const { fromAccountName, toAccountName, amount, symbol = DEFAULT_ETH_UNIT, gasPrice, gasLimit, nonce } = params
  const ethUnit = toEthUnit(symbol)
  const value = toWeiString(amount, ethUnit) // using 0 precision since the toWei already converts to right precision for EthUnit
  return ethTransferComposeAction({
    from: fromAccountName,
    to: toAccountName,
    value,
    gasPrice,
    gasLimit,
    nonce,
  } as EthTransferParams)
}

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const decomposed = ethTransferDecomposeAction(action)
  if (decomposed) {
    const decomposedArgs = decomposed.args
    return {
      args: {
        amount: Helpers.toTokenValueString(decomposedArgs.value, 10, 0), // convert back to decimal from hex (in Wei)
        fromAccountName: decomposedArgs.from,
        toAccountName: decomposedArgs.to,
        symbol: EthUnit.Wei,
      },
      chainActionType: Models.ChainActionType.ValueTransfer,
      partial: decomposedArgs.partial,
    }
  }
  return null
}
