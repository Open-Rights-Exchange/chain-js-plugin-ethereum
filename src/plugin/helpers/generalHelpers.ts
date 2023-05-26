import { toBuffer, BN } from 'ethereumjs-util'
import { Helpers } from '@open-rights-exchange/chain-js'
import { utils } from 'ethers'
import { ERC20_TYPES } from '../templates/abis/erc20Abi'
import { EthereumActionContract, EthereumAddress, EthereumPrivateKey, EthereumPublicKey } from '../models'
// import { ensureHexPrefix, ensureHexPrefixForPublicKey } from '../../../helpers'

/** Attempts to transform a value to a standard Buffer class */
export function toEthBuffer(data: string | BN | Buffer | number): Buffer {
  return toBuffer(data)
}

export function matchKnownAbiTypes(contract: EthereumActionContract) {
  const isERC20Abi = ERC20_TYPES.every(type => {
    return contract.abi?.find((abiField: any) => {
      return abiField.name === type.name && abiField.type === type.type
    })
  })

  return {
    erc20: isERC20Abi,
  }
}

/** Compare two '0x' pre-fixed eth values (e.g. address or private key)
 * adds 0x if missing, also aligns case (to lowercase) */
export function isSameEthHexValue(
  value1: EthereumAddress | EthereumPrivateKey,
  value2: EthereumAddress | EthereumPrivateKey,
) {
  return Helpers.ensureHexPrefix(value1) === Helpers.ensureHexPrefix(value2)
}

/** Compare two '0x' or '0x40' pre-fixed eth public keys (djusts for lowercase too) */
export function isSameEthPublicKey(value1: EthereumPublicKey, value2: EthereumPublicKey) {
  return Helpers.ensureHexPrefixForPublicKey(value1) === Helpers.ensureHexPrefixForPublicKey(value2)
}

type GasOptions = {
  gasPrice?: string
  gasLimit?: string
  nonce?: string
}

/** Returns an object with gasPrice, gasLimit, nonce - but excludes any of these if empty */
export function removeEmptyValuesFromGasOptions(gasPrice?: string, gasLimit?: string, nonce?: string): GasOptions {
  const gasOptions: GasOptions = {
    gasPrice,
    gasLimit,
    nonce,
  }
  Helpers.removeEmptyValuesInJsonObject(gasOptions)
  return gasOptions
}

/** use BN math functions to increase value by percentage */
export function increaseBNbyPercentage(baseValue: BN, percentageIncrease: number): BN {
  const percentageIncreaseBN = new BN(percentageIncrease, 10)
  const toAdd = baseValue.mul(percentageIncreaseBN).div(new BN(100, 10))
  return baseValue.add(toAdd)
}

/** Check if the given value is a string or instance of string */
export function isAString(value: any): boolean {
  if (!value) return false
  return typeof value === 'string' || value instanceof String
}

/** Checks if string is a valid hex string - optional '0x' prefix - Note: ethers.isHexString requires '0x' prefix */
export function isHexString(value: any): Boolean {
  if (!isAString(value)) return false
  const match = value.match(/^(0x|0X)?[a-fA-F0-9]+$/i)
  return !!match
}

/**
 * Converts string into UInt8Array
 */
export function convertStringToUInt8Array(dataString: string) {
  let dataBytes: Uint8Array

  if (isHexString(dataString)) {
    dataBytes = utils.arrayify(dataString, {
      allowMissingPrefix: true,
    }) // convert hex string (e.g. 'A0D045') to UInt8Array - '0x' prefix is optional
  } else {
    dataBytes = utils.toUtf8Bytes(dataString) // from 'any UTF8 string' to Uint8Array
  }
  return dataBytes
}
