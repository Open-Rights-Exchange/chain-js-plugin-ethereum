// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
  EthereumChainActionType,
} from '../../../models'
import { erc721Abi } from '../../abis/erc721Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue } from '../../../helpers'
// import { getArrayIndexOrNull } from '../../../../../helpers'

export interface Erc721ApproveParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  to: EthereumAddress
  tokenId: number
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

export const composeAction = ({
  contractAddress,
  from,
  to,
  tokenId,
  gasPrice,
  gasLimit,
  nonce,
}: Erc721ApproveParams) => {
  const contract = {
    abi: erc721Abi,
    parameters: [to, tokenId],
    method: 'approve',
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
  if (contract?.abi === erc721Abi && contract?.method === 'approve') {
    const returnData: Erc721ApproveParams = {
      contractAddress: to,
      from,
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      tokenId: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as number,
      gasPrice,
      gasLimit,
      nonce,
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC721Approve,
      args: returnData,
      partial,
    }
  }

  return null
}
