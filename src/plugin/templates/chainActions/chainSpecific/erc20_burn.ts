// import { toHex } from 'web3-utils'
import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumChainActionType,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
// import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'
import { isNullOrEmptyEthereumValue } from '../../../helpers'

export interface Erc20BurnParams {
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
}: Erc20BurnParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [valueString],
    method: 'burn',
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
  if (contract?.abi === erc20Abi && contract?.method === 'burn') {
    const returnData: Erc20BurnParams = {
      contractAddress: to,
      from,
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string,
      gasPrice,
      gasLimit,
      nonce,
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC20Burn,
      args: returnData,
      partial,
    }
  }

  return null
}
