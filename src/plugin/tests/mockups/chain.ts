import Common from '@ethereumjs/common'

export const chainOptions = {
  common: new Common({ chain: 'ropsten', hardfork: 'istanbul' }),
}
