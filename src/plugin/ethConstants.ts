import { Models } from '@open-rights-exchange/chain-js'
import { EthUnit } from './models'
// import { IndexedObject } from '../../models'
import { toEthereumAddress } from './helpers/cryptoModelHelpers'

// sign transaction default parameters
export const TRANSACTION_ENCODING = 'utf8'
export const DEFAULT_TRANSACTION_EXPIRY_IN_SECONDS = 30
export const DEFAULT_TRANSACTION_BLOCKS_BEHIND_REF_BLOCK = 3
export const CHAIN_BLOCK_FREQUENCY = 0.5 // time between blocks produced in seconds
export const ACCOUNT_NAME_MAX_LENGTH = 12

// transaction confirmation default parameters
export const DEFAULT_BLOCKS_TO_CHECK = 20
export const DEFAULT_CHECK_INTERVAL = 500
export const DEFAULT_GET_BLOCK_ATTEMPTS = 10

// default unit for ETH transfers
export const DEFAULT_ETH_UNIT = EthUnit.Wei

// address realted
export const ZERO_HEX = '0x00'
export const ZERO_ADDRESS = toEthereumAddress('0x0000000000000000000000000000000000000000')
export const EMPTY_DATA = '0x'
export const SENTINEL_ADDRESS = toEthereumAddress('0x0000000000000000000000000000000000000001')
export const EMPTY_HEX = '0x'

// token related
export const NATIVE_CHAIN_TOKEN_SYMBOL = 'ETH'
/** The chain address of the default token/currency contract (if any) */
export const NATIVE_CHAIN_TOKEN_ADDRESS: any = null
export const NATIVE_CHAIN_TOKEN_PRECISION = 18

export const TRANSACTION_FEE_PRIORITY_MULTIPLIERS: Models.TransactionFeePriorityMultipliers = {
  [Models.TxExecutionPriority.Slow]: 0.96,
  [Models.TxExecutionPriority.Average]: 1.0,
  [Models.TxExecutionPriority.Fast]: 1.12,
}

/** Transaction expiration constraints */
export const ETHEREUM_TRANSACTION_EXPIRATION_OPTIONS: Models.TransactionExpirationOptions = {
  transactionsExpirationType: Models.TransactionExpirationType.None,
}
