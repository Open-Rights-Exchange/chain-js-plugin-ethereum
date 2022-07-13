// ! Tests need additional configuration. This configuration needs to be done by those who understand this lib better.
// ! But that must be the pattern of the tests.
import { toEthereumAddress, toEthereumTxData } from '../../../helpers'
import { erc20Abi } from '../../abis/erc20Abi'
import { composeAction, decomposeAction } from './value_transfer'

const getComposedAction = () => ({
  to: toEthereumAddress('0x27105356f6c1ede0e92020e6225e46dc1f496b81'),
  from: toEthereumAddress('0x0000000000000000000000000000000000000000'),
  value: '0x00',
  data: toEthereumTxData('0xcc872b660000000000000000000000000000000000000000000000000000000000000014'),
  contract: {
    abi: erc20Abi,
    parameters: ['0x27105356f6c1ede0e92020e6225e46dc1f496b81', '20000000000000000000'], // 20 with 18 decimals of precision
    method: 'approve',
  },
})

const getDefaultArgs = () => ({
  contractAddress: '0x27105356f6c1ede0e92020e6225e46dc1f496b81',
  spender: '0x27105356f6c1ede0e92020e6225e46dc1f496b81',
  precision: 18,
  value: '20',
})

test('Compose ValueTransfer object', () => {
  const args: any = getDefaultArgs()
  const actAction = composeAction(args)
  expect(actAction).toEqual(getComposedAction())
})

test('Decomposes ValueTransfer object', () => {
  const expAction = {
    chainActionType: 'ValueTransfer',
    args: {
      toAccountName: toEthereumAddress('0x27105356F6C1ede0e92020e6225E46DC1F496b81'),
      fromAccountName: toEthereumAddress('0x0000000000000000000000000000000000000000'),
      amount: '10',
      symbol: 'wei',
    },
  }
  const actAction = decomposeAction(getComposedAction())
  expect(actAction).toEqual(expAction)
})

test('Compose and Decompose ValueTransfer', () => {
  const action = composeAction(getDefaultArgs() as any)
  const decomposed = decomposeAction(action)

  expect(decomposed.args).toEqual(getDefaultArgs())
})
