// import { ChainActionType, TokenTransferFromParams, ActionDecomposeReturn } from '../../../../../models'
import { Models } from '@open-rights-exchange/chain-js'
import { EthereumTransactionAction } from '../../../models'
import {
  composeAction as erc20TokenTransferFromComposeAction,
  decomposeAction as erc20TokenTransferFromDecomposeAction,
} from '../chainSpecific/erc20_transferFrom'

/** Calls ERC20TransferFrom as default token template for Ethereum */
export const composeAction = ({
  approvedAccountName,
  contractName,
  precision,
  fromAccountName,
  toAccountName,
  amount,
}: Models.TokenTransferFromParams) => ({
  ...erc20TokenTransferFromComposeAction({
    contractAddress: contractName,
    from: approvedAccountName,
    precision,
    transferFrom: fromAccountName,
    to: toAccountName,
    value: amount,
  }),
})

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const decomposed = erc20TokenTransferFromDecomposeAction(action)
  const { contractAddress, from, transferFrom, to, value } = decomposed.args
  if (decomposed) {
    return {
      ...decomposed,
      args: {
        // coerce to string as EthereumAddress could be Buffer type
        contractName: contractAddress as string,
        approvedAccountName: from as string,
        fromAccountName: transferFrom as string,
        toAccountName: to as string,
        amount: value,
      },
      chainActionType: Models.ChainActionType.TokenTransferFrom,
    }
  }
  return null
}
