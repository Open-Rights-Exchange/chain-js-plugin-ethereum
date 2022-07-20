// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumChainActionType,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc721Abi } from '../../abis/erc721Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'
// import { getArrayIndexOrNull } from '../../../../../helpers'

export interface Erc721SafeTransferFromParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  transferFrom: EthereumAddress
  to: EthereumAddress
  tokenId: number
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
  gasPrice,
  gasLimit,
  nonce,
}: Erc721SafeTransferFromParams) => {
  const contract = {
    abi: erc721Abi,
    parameters: [transferFrom, to, tokenId],
    method: 'safeTransferFrom',
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
  if (contract?.abi === erc721Abi && contract?.method === 'safeTransferFrom') {
    const returnData: Erc721SafeTransferFromParams = {
      contractAddress: to,
      from,
      transferFrom: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 1) as string),
      tokenId: Helpers.getArrayIndexOrNull(contract?.parameters, 2) as number,
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC721SafeTransferFrom,
      args: returnData,
      partial,
    }
  }
  return null
}
