// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumChainActionType,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'
// import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'

export interface Erc20ApproveParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  precision?: number
  spender: EthereumAddress
  value: string
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  precision,
  spender,
  value,
  gasPrice,
  gasLimit,
  nonce,
}: Erc20ApproveParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [spender, valueString],
    method: 'approve',
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
  if (contract?.abi === erc20Abi && contract?.method === 'approve') {
    const returnData: Erc20ApproveParams = {
      contractAddress: to,
      from,
      spender: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as string,
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC20Approve,
      args: returnData,
      partial,
    }
  }

  return null
}
