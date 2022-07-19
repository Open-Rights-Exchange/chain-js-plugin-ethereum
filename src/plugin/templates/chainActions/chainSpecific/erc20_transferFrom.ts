import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
  EthereumChainActionType,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'
// import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'

export interface Erc20TransferFromParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  precision?: number
  transferFrom: EthereumAddress
  to: EthereumAddress
  value: string
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  precision,
  transferFrom,
  to,
  value,
  gasPrice,
  gasLimit,
  nonce,
}: Erc20TransferFromParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [transferFrom, to, valueString],
    method: 'transferFrom',
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
  if (contract?.abi === erc20Abi && contract?.method === 'transferFrom') {
    const returnData: Erc20TransferFromParams = {
      contractAddress: to,
      from,
      transferFrom: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 1) as string),
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 2) as string,
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC20TransferFrom,
      args: returnData,
      partial,
    }
  }

  return null
}
