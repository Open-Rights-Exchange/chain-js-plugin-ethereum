import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumChainActionType,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
// import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'
import { isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'

export interface Erc20IssueParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  precision?: number
  value: string
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  precision,
  value,
  gasPrice,
  gasLimit,
  nonce,
}: Erc20IssueParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [valueString],
    method: 'issue',
  }
  return {
    to: contractAddress,
    from,
    contract,
    ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
  }
}

export const decomposeAction = (action: EthereumTransactionAction): EthereumDecomposeReturn => {
  const { to, from, contract, gasPrice, gasLimit, nonce } = action
  if (contract?.abi === erc20Abi && contract?.method === 'issue') {
    const returnData: Erc20IssueParams = {
      contractAddress: to,
      from,
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string,
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC20Issue,
      args: returnData,
      partial,
    }
  }

  return null
}
