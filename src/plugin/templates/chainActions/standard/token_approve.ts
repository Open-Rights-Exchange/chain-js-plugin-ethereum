//import { ChainActionType, TokenApproveParams, ActionDecomposeReturn } from '../../../../../models'
import { EthereumTransactionAction } from '../../../models'
import {
  composeAction as erc20TokenApproveComposeAction,
  decomposeAction as erc20TokenApproveDecomposeAction,
} from '../chainSpecific/erc20_approve'
import { Interfaces, Models, ChainFactory, Helpers, PluginInterfaces, Crypto, Errors } from '@open-rights-exchange/chainjs'


/** Calls ERC20Approve as default token template for Ethereum */
export const composeAction = ({
  fromAccountName,
  toAccountName,
  amount,
  contractName,
  precision,
}: Models.TokenApproveParams) => ({
  ...erc20TokenApproveComposeAction({
    contractAddress: contractName,
    from: fromAccountName,
    precision,
    spender: toAccountName,
    value: amount,
  }),
})

export const decomposeAction = (action: EthereumTransactionAction): Models.ActionDecomposeReturn => {
  const decomposed = erc20TokenApproveDecomposeAction(action)
  const { contractAddress, from, spender, value } = decomposed.args
  if (decomposed) {
    return {
      ...decomposed,
      args: {
        // coerce to string as EthereumAddress could be Buffer type
        contractName: contractAddress as string,
        fromAccountName: from as string,
        toAccountName: spender as string,
        amount: value,
      },
      chainActionType: Models.ChainActionType.TokenApprove,
    }
  }
  return null
}
