import BN from 'bn.js'
import { EthereumTransactionAction, EthereumAddress } from '../../../models'
import { isNullOrEmptyEthereumValue } from '../../../helpers'
//import { ChainActionType, ActionDecomposeReturn } from '../../../../../models'
//import { toChainEntityName } from '../../../../../helpers'
import { Interfaces, Models, ChainFactory, Helpers, PluginInterfaces, Crypto, Errors } from '@open-rights-exchange/chainjs'



export interface EthTransferParams {
  value: string
  from?: EthereumAddress
  to: EthereumAddress
}

/** Sends ETH (in units of Wei) */
export const composeAction = (params: EthTransferParams) => {
  const { from, to, value } = params
  return {
    from,
    to,
    value: new BN(value, 10), // must be a hex '0x' string or BN
  }
}

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const { to, from, value, data, contract } = action
  if (to && value && !contract && isNullOrEmptyEthereumValue(data)) {
    const returnData: EthTransferParams = {
      // coerce to string as EthereumAddress could be Buffer type
      to: Helpers.toChainEntityName(to as string),
      from: from ? Helpers.toChainEntityName(from as string) : null,
      value: value as string,
    }
    const partial = !returnData?.from
    return {
      chainActionType: Models.ChainActionType.ValueTransfer,
      args: returnData,
      partial,
    }
  }

  return null
}
