import { bufferToHex, BN } from 'ethereumjs-util'
import { Transaction as EthereumJsTx } from 'ethereumjs-tx'
import { Models, Helpers, Errors } from '@open-rights-exchange/chain-js'
import {
  convertBufferToHexStringIfNeeded,
  isNullOrEmptyEthereumValue,
  generateDataFromContractAction,
  isValidEthereumAddress,
  toEthereumTxData,
  toEthBuffer,
  toWeiString,
  toEthereumAddress,
} from './helpers'
import {
  EthereumActionContract,
  EthereumActionHelperInput,
  EthereumAddress,
  EthereumRawTransactionAction,
  EthereumTxData,
  EthereumTransactionAction,
  EthUnit,
  EthereumSignatureNative,
} from './models'
import { ZERO_HEX, ZERO_ADDRESS } from './ethConstants'

export type ActionChainOptions = {
  chain: string
  hardfork: string
}

/** Helper class to ensure transaction actions properties are set correctly */
export class EthereumActionHelper {
  // properties stored as hex stings (not raw Buffers)
  private _nonce: string

  private _gasLimit: string

  private _gasPrice: string

  private _data: EthereumTxData

  private _to: EthereumAddress

  private _value: string | number | BN

  private _from: EthereumAddress

  private _contract: EthereumActionContract

  private _v: string

  private _r: string

  private _s: string

  private _chainOptions: ActionChainOptions

  /** Creates a new Action from 'human-readable' transfer or contract info
   *  OR from 'raw' data property
   *  Allows access to human-readable properties (method, parameters) or raw data (hex) */
  constructor(actionInput: EthereumActionHelperInput, chainOptions: ActionChainOptions) {
    this._chainOptions = chainOptions
    this.assertAndValidateEthereumActionInput(actionInput)
  }

  /** apply rules for imput params, set class private properties, throw if violation */
  private assertAndValidateEthereumActionInput(actionInput: EthereumActionHelperInput) {
    const {
      nonce,
      gasPrice: gasPriceInput,
      gasLimit: gasLimitInput,
      from,
      to,
      data,
      value: valueInput,
      v,
      r,
      s,
      contract,
    } = actionInput

    let gasPrice

    if (Helpers.isABuffer(gasPriceInput)) {
      gasPrice = convertBufferToHexStringIfNeeded(gasPriceInput as Buffer)
    } else {
      // if value is hex encoded string, then it doesnt need to be converted (already in units of Wei)
      // otherwise, a decimal string value is expected to be in units of Gwei - we convert to Wei
      const gasPriceInWei = Helpers.hasHexPrefix(gasPriceInput)
        ? gasPriceInput
        : toWeiString(gasPriceInput as string, EthUnit.Gwei)

      // convert decimal strings to hex strings
      gasPrice = Helpers.toHexStringIfNeeded(gasPriceInWei)
    }

    const gasLimit = Helpers.isABuffer(gasLimitInput)
      ? convertBufferToHexStringIfNeeded(gasLimitInput as Buffer)
      : Helpers.toHexStringIfNeeded(gasLimitInput)
    const value = Helpers.isABuffer(valueInput)
      ? convertBufferToHexStringIfNeeded(valueInput as Buffer)
      : Helpers.toHexStringIfNeeded(valueInput)

    // cant provide both contract and data properties
    if (!isNullOrEmptyEthereumValue(contract) && !isNullOrEmptyEthereumValue(data)) {
      if (data !== generateDataFromContractAction(contract)) {
        Errors.throwNewError(
          'Data and contract were both provided but when data is generated from contract, it doesnt match the data passed in.',
        )
      }
    }

    // convert from param into an address string (and chack for validity)
    const fromAddress = toEthereumAddress(convertBufferToHexStringIfNeeded(from))
    if (Helpers.isNullOrEmpty(fromAddress)) {
      this._from = ZERO_ADDRESS
    } else if (isValidEthereumAddress(fromAddress)) {
      this._from = fromAddress
    } else {
      Errors.throwNewError(`From value (${from} is not a valid ethereum address`)
    }

    // set data from provided data or contract properties
    if (!isNullOrEmptyEthereumValue(contract)) {
      this._data = generateDataFromContractAction(contract)
      this._contract = contract
    } else if (!isNullOrEmptyEthereumValue(data)) {
      this._data = toEthereumTxData(data)
    } else this._data = toEthereumTxData(ZERO_HEX)

    // use helper library to consume tranasaction and allow multiple types for input params
    const ethJsTx = new EthereumJsTx(
      {
        nonce,
        gasPrice,
        gasLimit,
        to,
        data: this._data,
        value,
        v,
        r,
        s,
      },
      this._chainOptions,
    )
    this._nonce = bufferToHex(ethJsTx.nonce)
    this._gasLimit = bufferToHex(ethJsTx.gasLimit)
    this._gasPrice = bufferToHex(ethJsTx.gasPrice)
    this._to = toEthereumAddress(bufferToHex(ethJsTx.to))
    this._value = bufferToHex(ethJsTx.value)
    this._data = toEthereumTxData(bufferToHex(ethJsTx.data))
    this._v = bufferToHex(ethJsTx.v)
    this._r = bufferToHex(ethJsTx.r)
    this._s = bufferToHex(ethJsTx.s)
  }

  /** set gasLimit - value should be a decimal string in units of gas e.g. '21000' */
  set gasLimit(value: string) {
    const valueHex = Helpers.decimalToHexString(value)
    this.updateActionProperty('gasLimit', valueHex)
  }

  /** set gasPrice - value should be a decimal string in units of GWEI e.g. '123' */
  set gasPrice(value: string) {
    const valueHex = Helpers.decimalToHexString(toWeiString(value, EthUnit.Gwei))
    this.updateActionProperty('gasPrice', valueHex)
  }

  /** set nonce - value is a string or Buffer */
  set nonce(value: string) {
    const valueHex = Helpers.decimalToHexString(value)
    this.updateActionProperty('nonce', valueHex)
  }

  /** set signature */
  set signature(signature: EthereumSignatureNative) {
    const actionInput: EthereumTransactionAction & Models.IndexedObject = this.action
    const { v, r, s } = signature
    actionInput.v = v
    actionInput.r = r
    actionInput.s = s
    this.assertAndValidateEthereumActionInput(actionInput)
  }

  /** update a single property in this action */
  private updateActionProperty(propertyName: string, value: any) {
    const actionInput: EthereumTransactionAction & Models.IndexedObject = this.action
    actionInput[propertyName] = value
    this.assertAndValidateEthereumActionInput(actionInput)
  }

  /** Checks is data value is empty or implying 0 */
  get hasData(): boolean {
    return !isNullOrEmptyEthereumValue(this._data)
  }

  /** Action properties (encoded as hex string for most fields)
   *  Returns null for any 'empty' Eth values e.g. (0x00...00) */
  public get action(): EthereumTransactionAction {
    const returnValue = {
      nonce: isNullOrEmptyEthereumValue(this._nonce) ? null : this._nonce,
      gasLimit: isNullOrEmptyEthereumValue(this._gasLimit) ? null : this._gasLimit,
      gasPrice: isNullOrEmptyEthereumValue(this._gasPrice) ? null : this._gasPrice,
      to: isNullOrEmptyEthereumValue(this._to) ? null : this._to,
      from: isNullOrEmptyEthereumValue(this._from) ? null : this._from,
      data: isNullOrEmptyEthereumValue(this._data) ? null : toEthereumTxData(this._data),
      value: isNullOrEmptyEthereumValue(this._value) ? null : this._value,
      v: isNullOrEmptyEthereumValue(this._v) ? null : this._v,
      r: isNullOrEmptyEthereumValue(this._r) ? null : this._r,
      s: isNullOrEmptyEthereumValue(this._s) ? null : this._s,
    }
    Helpers.removeEmptyValuesInJsonObject(returnValue)
    return returnValue
  }

  /** Action properties in raw form (encoded as Buffer) */
  public get raw(): EthereumRawTransactionAction {
    const returnValue = {
      nonce: Helpers.nullifyIfEmpty(toEthBuffer(this._nonce)),
      gasLimit: Helpers.nullifyIfEmpty(toEthBuffer(this._gasLimit)),
      gasPrice: Helpers.nullifyIfEmpty(toEthBuffer(this._gasPrice)),
      to: Helpers.nullifyIfEmpty(toEthBuffer(this._to)),
      from: Helpers.nullifyIfEmpty(toEthBuffer(this._from)),
      data: Helpers.nullifyIfEmpty(toEthBuffer(this._data)),
      value: Helpers.nullifyIfEmpty(toEthBuffer(this._value)),
      v: Helpers.nullifyIfEmpty(toEthBuffer(this._v)),
      r: Helpers.nullifyIfEmpty(toEthBuffer(this._r)),
      s: Helpers.nullifyIfEmpty(toEthBuffer(this._s)),
    }
    Helpers.removeEmptyValuesInJsonObject(returnValue)
    return returnValue
  }

  /** Action properties including raw data */
  public get contract(): EthereumActionContract {
    return this._contract
  }
}
