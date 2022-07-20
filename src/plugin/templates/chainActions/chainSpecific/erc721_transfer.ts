// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
  EthereumChainActionType,
} from '../../../models'
import { erc721Abi } from '../../abis/erc721Abi'
import { toEthereumAddress, isNullOrEmptyEthereumValue, removeEmptyValuesFromGasOptions } from '../../../helpers'
// import { getArrayIndexOrNull } from '../../../../../helpers'

export interface Erc721TransferParams {
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
}: Erc721TransferParams) => {
  const contract = {
    abi: erc721Abi,
    parameters: [to, tokenId],
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
  if (contract?.abi === erc721Abi && contract?.method === 'transfer') {
    const returnData: Erc721TransferParams = {
      contractAddress: to,
      from,
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      tokenId: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as number,
      ...removeEmptyValuesFromGasOptions(gasPrice, gasLimit, nonce),
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC721Transfer,
      args: returnData,
      partial,
    }
  }

  return null
}
