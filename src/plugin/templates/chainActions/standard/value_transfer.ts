import { Helpers, Models } from '@open-rights-exchange/chain-js'
import { EthUnit, EthereumTransactionAction, EthereumChainSettings } from '../../../models'
import { toEthUnit, toWeiString } from '../../../helpers'
import { DEFAULT_ETH_UNIT } from '../../../ethConstants'
// import { ChainActionType, ValueTransferParams, ActionDecomposeReturn } from '../../../../../models'

import {
  composeAction as ethTransferComposeAction,
  decomposeAction as ethTransferDecomposeAction,
  EthTransferParams,
} from '../chainSpecific/eth_transfer'

/** Sends ETH (in units of Wei) */
export const composeAction = (params: Models.ValueTransferParams, settings: EthereumChainSettings) => {
  const { fromAccountName, toAccountName, amount } = params
  let { symbol = DEFAULT_ETH_UNIT } = params
  // toWeiString() uses web3.utils.toWei() to do unit conversion. This lib only supports converting between ETH units, so if the ETH unit we're working with has an ETH equivelant, then switch to that symbol.
  // Note that the symbol is not used in the transaction itself, it's only used to do the unit conversion.
  if (settings?.ethereumTokenEquivalenceMapping && settings.ethereumTokenEquivalenceMapping[symbol]) {
    symbol = settings.ethereumTokenEquivalenceMapping[symbol]
  }
  const ethUnit = toEthUnit(symbol)
  const value = toWeiString(amount, ethUnit) // using 0 precision since the toWei already converts to right precision for EthUnit
  return ethTransferComposeAction({
    from: fromAccountName,
    to: toAccountName,
    value,
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
