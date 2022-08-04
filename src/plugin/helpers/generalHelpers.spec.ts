import { BN } from 'ethereumjs-util'
import { increaseBNbyPercentage } from './generalHelpers'

describe('General helpers Tests', () => {
  it('increaseBNbyPercentage - Adding a percentage to a very large number should maintain precision', async () => {
    const maxJSNumber = new BN(1000000000000000, 10)
    const largeNumber = maxJSNumber.add(maxJSNumber)
    const result = increaseBNbyPercentage(largeNumber, 20)
    expect(result.toString()).toEqual('2400000000000000')
  })
})
