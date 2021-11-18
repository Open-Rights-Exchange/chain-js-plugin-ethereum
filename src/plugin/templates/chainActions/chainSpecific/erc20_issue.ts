import {
  EthereumAddress,
  EthereumChainActionType,
  EthereumTransactionAction,
  EthereumDecomposeReturn,
} from '../../../models'
import { erc20Abi } from '../../abis/erc20Abi'
//import { getArrayIndexOrNull, toTokenValueString } from '../../../../../helpers'
import { isNullOrEmptyEthereumValue } from '../../../helpers'
import { Interfaces, Models, ChainFactory, Helpers, PluginInterfaces, Crypto, Errors } from '@open-rights-exchange/chainjs'


export interface Erc20IssueParams {
  contractAddress: EthereumAddress
  from?: EthereumAddress
  precision?: number
  value: string
}

export const composeAction = ({ contractAddress, from, precision, value }: Erc20IssueParams) => {
  const valueString = Helpers.toTokenValueString(value, 10, precision)
  const contract = {
    abi: erc20Abi,
    parameters: [valueString],
    method: 'issue',
  }
  return {
    to: contractAddress,
    from,
    contract,
  }
}

export const decomposeAction = (action: EthereumTransactionAction): EthereumDecomposeReturn => {
  const { to, from, contract } = action
  if (contract?.abi === erc20Abi && contract?.method === 'issue') {
    const returnData: Erc20IssueParams = {
      contractAddress: to,
      from,
      value: Helpers.getArrayIndexOrNull(contract?.parameters, 0) as string,
    }
    const partial = !returnData?.from || isNullOrEmptyEthereumValue(to)
    return {
      chainActionType: EthereumChainActionType.ERC20Issue,
      args: returnData,
      partial,
    }
  }

  return null
}
