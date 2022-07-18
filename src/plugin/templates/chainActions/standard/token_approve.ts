// import { ChainActionType, TokenApproveParams, ActionDecomposeReturn } from '../../../../../models'
import { Models } from '@open-rights-exchange/chain-js'
import { EthereumTransactionAction } from '../../../models'
import {
  composeAction as erc20TokenApproveComposeAction,
  decomposeAction as erc20TokenApproveDecomposeAction,
} from '../chainSpecific/erc20_approve'

export interface EthereumTokenApproveParams extends Models.TokenApproveParams {
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

/** Calls ERC20Approve as default token template for Ethereum */
export const composeAction = ({
  fromAccountName,
  toAccountName,
  amount,
  contractName,
  precision,
  gasPrice,
  gasLimit,
  nonce,
}: EthereumTokenApproveParams) => ({
  ...erc20TokenApproveComposeAction({
    contractAddress: contractName,
    from: fromAccountName,
    precision,
    spender: toAccountName,
    value: amount,
    gasPrice,
    gasLimit,
    nonce,
  }),
})

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const decomposed = erc20TokenApproveDecomposeAction(action)
  const { contractAddress, from, spender, value, gasPrice, gasLimit, nonce } = decomposed.args
  if (decomposed) {
    return {
      ...decomposed,
      args: {
        // coerce to string as EthereumAddress could be Buffer type
        contractName: contractAddress as string,
        fromAccountName: from as string,
        toAccountName: spender as string,
        amount: value,
        gasPrice,
        gasLimit,
        nonce,
      },
      chainActionType: Models.ChainActionType.TokenApprove,
    }
  }
  return null
}
