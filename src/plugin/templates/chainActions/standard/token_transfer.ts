// import { ChainActionType, TokenTransferParams, ActionDecomposeReturn } from '../../../../../models'
import { Models } from '@open-rights-exchange/chain-js'
import { EthereumTransactionAction } from '../../../models'
import {
  composeAction as erc20TokenTransferComposeAction,
  decomposeAction as erc20TokenTransferDecomposeAction,
} from '../chainSpecific/erc20_transfer'

export interface EthereumTokenTransferParams extends Models.TokenTransferParams {
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

/** Calls ERC20Transfer as default token template for Ethereum */
export const composeAction = ({
  fromAccountName,
  toAccountName,
  amount,
  contractName,
  precision,
  gasPrice,
  gasLimit,
  nonce,
}: EthereumTokenTransferParams) => ({
  ...erc20TokenTransferComposeAction({
    contractAddress: contractName,
    from: fromAccountName,
    to: toAccountName,
    precision,
    value: amount,
    gasPrice,
    gasLimit,
    nonce,
  }),
})

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const decomposed = erc20TokenTransferDecomposeAction(action)
  const { contractAddress, from, to, value } = decomposed.args
  if (decomposed) {
    return {
      ...decomposed,
      args: {
        // coerce to string as EthereumAddress could be Buffer type
        contractName: contractAddress as string,
        fromAccountName: from as string,
        toAccountName: to as string,
        amount: value,
      },
      chainActionType: Models.ChainActionType.TokenTransfer,
    }
  }
  return null
}
