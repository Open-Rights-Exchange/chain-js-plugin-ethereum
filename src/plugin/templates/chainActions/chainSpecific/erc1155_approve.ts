// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chainjs'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
  EthereumChainActionType,
  EthereumMultiValue,
} from '../../../models'
import { erc1155Abi } from '../../abis/erc1155Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue } from '../../../helpers'
// import { getArrayIndexOrNull } from '../../../../../helpers'

export interface Erc1155ApproveParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  to: EthereumAddress
  tokenId: number
  quantity: number
  data?: EthereumMultiValue[]
}

export const composeAction = ({ contractAddress, from, to, tokenId, quantity, data }: Erc1155ApproveParams) => {
  const contract = {
    abi: erc1155Abi,
    parameters: [to, tokenId, quantity, data || 0],
    method: 'approve',
  }
  return {
    to: contractAddress,
    from,
    contract,
  }
}

export const decomposeAction = (action: EthereumTransactionAction): EthereumDecomposeReturn => {
  const { to, from, contract } = action
  if (contract?.abi === erc1155Abi && contract?.method === 'approve') {
    const returnData: Erc1155ApproveParams = {
      contractAddress: to,
      from,
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      tokenId: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as number,
      quantity: Helpers.getArrayIndexOrNull(contract?.parameters, 2) as number,
      data: Helpers.getArrayIndexOrNull(contract?.parameters, 3) as EthereumMultiValue[],
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC1155Approve,
      args: returnData,
      partial,
    }
  }

  return null
}
