import { Helpers } from '@open-rights-exchange/chain-js'
import {
  EthereumAddress,
  EthereumTransactionAction,
  EthereumChainActionType,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
// import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'
import { matchKnownAbiTypes, isNullOrEmptyEthereumValue, toEthereumAddress } from '../../../helpers'

export interface Erc20TransferParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  precision?: number
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
  to,
  value,
  gasPrice,
  gasLimit,
  nonce,
}: Erc20TransferParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [to, valueString],
    method: 'transfer',
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
  const { to, from, contract } = action

  const abiType = matchKnownAbiTypes(contract)
  if (abiType.erc20 && contract?.method === 'transfer') {
    const returnData: Erc20TransferParams = {
      contractAddress: to,
      from,
      to: toEthereumAddress(Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string),
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 1) as string,
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC20Transfer,
      args: returnData,
      partial,
    }
  }

  return null
}
