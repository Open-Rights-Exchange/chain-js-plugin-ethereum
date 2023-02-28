/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interfaces, Models, Errors } from '@open-rights-exchange/chain-js'
import { EthereumChainState } from './ethChainState'
import { EthereumPrivateKey, EthereumTransactionOptions } from './models'
import { EthereumMultisigPlugin } from './plugins/multisig/ethereumMultisigPlugin'
import { signTypedData, validateSignTypedDataInput } from './stringSignMethods/sign-typed-data'

export class EthereumSignString implements Interfaces.SignString {
  constructor(data: any, options?: EthereumTransactionOptions<any>) {
    this.applyOptions(options)
    this.applyData(data)
    this.setSignMethod()
  }

  private _isValidated: boolean

  private _signMethod: string

  private _options: EthereumTransactionOptions<any>

  private _data: any

  private applyOptions(options: EthereumTransactionOptions<any>) {
    // TOOD: Validate options
    this._options = options
  }

  private applyData(data: any) {
    this._data = data
  }

  /** Options provided when the SignString class was created */
  get options(): EthereumTransactionOptions<any> {
    return this._options
  }

  /** Date provided when the SignString class was created */
  get data(): EthereumTransactionOptions<any> {
    return this._data
  }

  /* Set the signmethod and ensure that is lowercase */
  private setSignMethod() {
    const signMethod = this.options?.signMethod.toLowerCase()
    this._signMethod = signMethod
  }

  get signMethod() {
    return this._signMethod
  }

  /** Whether transaction has been validated - via validate() */
  get isValidated() {
    return this._isValidated
  }

  /** Verifies that the structure of the signature request is valid.
   *  Throws if any problems */
  public async validate(): Promise<Models.SignStringValidateResult> {
    let result: Models.SignStringValidateResult
    switch (this.signMethod) {
      case 'etherum.sign-typed-data':
        result = await validateSignTypedDataInput()
        this._isValidated = true
        break
      default:
        Errors.throwNewError(`signMethod not recognized. signMethod provided = ${this.signMethod}`)
        break
    }
    return result
  }

  /** Throws if not validated */
  private assertIsValidated(): void {
    if (!this._isValidated) {
      Errors.throwNewError('SignString not validated. Call signString.validate() first.')
    }
  }

  /** Sign the string or structured data */
  public async sign(privateKeys: EthereumPrivateKey[]): Promise<Models.SignStringSignResult> {
    this.assertIsValidated()
    let result: Models.SignStringSignResult
    try {
      switch (this.signMethod) {
        case 'etherum.sign-typed-data':
          result = await signTypedData(privateKeys, this.data)
          break
        default:
          Errors.throwNewError(`signMethod not recognized. signMethod provided = ${this.signMethod}`)
          break
      }
    } catch (error) {
      Errors.throwNewError('Erorr in signString.sign() - ', error)
    }

    return result
  }
}
