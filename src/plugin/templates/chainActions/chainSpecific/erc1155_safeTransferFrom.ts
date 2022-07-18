// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumChainActionType,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc1155Abi } from '../../abis/erc1155Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue } from '../../../helpers'
// import { getArrayIndexOrNull } from '../../../../../helpers'

export interface Erc1155SafeTransferFromParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  transferFrom: EthereumAddress
  to: EthereumAddress
  tokenId: number
  quantity: number
  data?: number
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  transferFrom,
  to,
  tokenId,
  quantity,
  data,
  gasPrice,
  gasLimit,
  nonce,
}: Erc1155SafeTransferFromParams) => {
  const contract = {
    abi: erc1155Abi,
    parameters: [transferFrom, to, tokenId, quantity, data || 0],
    method: 'safeTransferFrom',
  }
  return {
    to: contractAddress,
    from,
    contract,
    gasPrice,
    gasLimit,
    nonce,
  }
}

export const decomposeAction = (action: EthereumTransactionAction): EthereumDecomposeReturn => {
  const { to, from, contract, gasPrice, gasLimit, nonce } = action
  if (contract?.abi === erc1155Abi && contract?.method === 'safeTransferFrom') {
    const returnData: Erc1155SafeTransferFromParams = {
      contractAddress: to,
      from,
      transferFrom: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 1) as string),
      tokenId: Helpers.getArrayIndexOrNull(contract?.parameters, 2) as number,
      quantity: Helpers.getArrayIndexOrNull(contract?.parameters, 3) as number,
      data: Helpers.getArrayIndexOrNull(contract?.parameters, 4) as number,
      gasPrice,
      gasLimit,
      nonce,
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC1155SafeTransferFrom,
      args: returnData,
      partial,
    }
  }
  return null
}
