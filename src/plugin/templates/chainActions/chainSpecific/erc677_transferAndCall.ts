import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumMultiValue,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
  EthereumChainActionType,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'
// import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'

export interface Erc677TransferAndCallParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  precision?: number
  to: EthereumAddress
  value: string
  data?: EthereumMultiValue[]
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  precision,
  to,
  value,
  data,
  gasPrice,
  gasLimit,
  nonce,
}: Erc677TransferAndCallParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [to, valueString, data || 0],
    method: 'transferAndCall',
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
  if (contract?.method === 'transferAndCall') {
    const returnData: Erc677TransferAndCallParams = {
      contractAddress: to,
      from,
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as string,
      data: Helpers.getArrayIndexOrNull(contract?.parameters, 2) as EthereumMultiValue[],
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC677TransferAndCall,
      args: returnData,
      partial,
    }
  }

  return null
}
