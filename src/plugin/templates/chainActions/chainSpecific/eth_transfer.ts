import BN from 'bn.js'
import { Models, Helpers } from '@open-rights-exchange/chain-js'
import { EthereumTransactionAction, EthereumAddress } from '../../../models'
import { isNullOrEmptyEthereumValue } from '../../../helpers'

export interface EthTransferParams {
  value: string
  from?: EthereumAddress
  to: EthereumAddress
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

/** Sends ETH (in units of Wei) */
export const composeAction = (params: EthTransferParams) => {
  const { from, to, value, gasPrice, gasLimit, nonce } = params
  return {
    from,
    to,
    value: Helpers.ensureHexPrefix(new BN(value, 10).toString('hex')), // must be a hex '0x' string or BN
    gasPrice,
    gasLimit,
    nonce,
  }
}

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const { to, from, value, data, contract, gasPrice, gasLimit, nonce } = action
  if (to && value && !contract && isNullOrEmptyEthereumValue(data)) {
    const returnData: EthTransferParams = {
      // coerce to string as EthereumAddress could be Buffer type
      to: Helpers.toChainEntityName(to as string),
      from: from ? Helpers.toChainEntityName(from as string) : null,
      value: value as string,
      gasPrice,
      gasLimit,
      nonce,
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
