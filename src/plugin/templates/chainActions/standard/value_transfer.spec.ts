import { EthereumChainSettings } from 'src/plugin/models'
import { composeAction, decomposeAction } from './value_transfer'

const getComposedAction = () => ({
  from: '0x81a83975c9ed8c56c45154e42967d084ac58a17d',
  to: '0x27105356F6C1ede0e92020e6225E46DC1F496b81',
  value: '0xa',
})

const getDefaultArgs = () => ({
  fromAccountName: '0x81a83975c9ed8c56c45154e42967d084ac58a17d',
  toAccountName: '0x27105356F6C1ede0e92020e6225E46DC1F496b81',
  amount: '10',
})

test('Compose ValueTransfer object', () => {
  const args: any = getDefaultArgs()
  const actAction = composeAction(args, {} as EthereumChainSettings)
  expect(actAction).toEqual(getComposedAction())
})

test('Decomposes ValueTransfer object', () => {
  const expAction = {
    chainActionType: 'ValueTransfer',
    args: {
      toAccountName: '0x27105356F6C1ede0e92020e6225E46DC1F496b81',
      fromAccountName: '0x81a83975c9ed8c56c45154e42967d084ac58a17d',
      amount: '10',
      symbol: 'wei',
    },
  }
  // @ts-ignore
  const actAction = decomposeAction(getComposedAction())
  expect(actAction).toEqual(expAction)
})

test('Compose and Decompose ValueTransfer', () => {
  const action = composeAction(getDefaultArgs() as any, {} as EthereumChainSettings)
  const decomposed = decomposeAction(action)

  // ! Ideally, these should be equal, but this case is not like that.
  // expect(decomposed.args).toEqual(getDefaultArgs())

  const { symbol, ...decomposedArgs } = decomposed.args
  expect(decomposedArgs).toEqual(getDefaultArgs())
})

test('Compose and Decompose ValueTransfer using custom chain settings', () => {})
test.skip('Compose ValueTransfer object using custom chain settings', () => {})