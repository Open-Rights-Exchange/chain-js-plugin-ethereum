// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
  EthereumChainActionType,
  EthereumMultiValue,
} from '../../../models'
import { erc1155Abi } from '../../abis/erc1155Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'
// import { getArrayIndexOrNull } from '../../../../../helpers'

export interface Erc1155TransferParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  to: EthereumAddress
  tokenId: number
  quantity: number
  data?: EthereumMultiValue[]
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  to,
  tokenId,
  quantity,
  data,
  gasPrice,
  gasLimit,
  nonce,
}: Erc1155TransferParams) => {
  const contract = {
    abi: erc1155Abi,
    parameters: [to, tokenId, quantity, data || 0],
    method: 'transfer',
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
  if (contract?.abi === erc1155Abi && contract?.method === 'transfer') {
    const returnData: Erc1155TransferParams = {
      contractAddress: to,
      from,
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      tokenId: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as number,
      quantity: Helpers.getArrayIndexOrNull(contract?.parameters, 2) as number,
      data: Helpers.getArrayIndexOrNull(contract?.parameters, 3) as EthereumMultiValue[],
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC1155Transfer,
      args: returnData,
      partial,
    }
  }

  return null
}
