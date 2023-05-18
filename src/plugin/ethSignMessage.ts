/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interfaces, Models, Errors } from '@open-rights-exchange/chain-js'
import {
  EthereumPrivateKey,
  EthereumTransactionOptions,
  PersonalSignDataInput,
  SignMessageOptions,
  SignMethod,
  SignTypedDataInput,
} from './models'
import { personalSign, validatePersonalSignInput } from './stringSignMethods/personal-sign'
import { signTypedData, validateSignTypedDataInput } from './stringSignMethods/sign-typed-data'

export class EthereumSignMessage implements Interfaces.SignMessage {
  constructor(message:  SignTypedDataInput | PersonalSignDataInput, options?: SignMessageOptions) {
    this.applyOptions(options)
    this.applyMessage(message)
    this.setSignMethod()
    this._isValidated = false
  }

  private _isValidated: boolean

  private _signMethod: string

  private _options: SignMessageOptions

  private _message:  SignTypedDataInput | PersonalSignDataInput

  private applyOptions(options: SignMessageOptions) {
    this._options = options ? options : { signMethod: SignMethod.Default}
  }

  private applyMessage(_message: SignTypedDataInput | PersonalSignDataInput) {
    this._message = _message
  }

  /** Options provided when the SignMessage class was created */
  get options(): SignMessageOptions {
    return this._options
  }

  /** Message provided when the SignMessage class was created */
  get message(): SignTypedDataInput | PersonalSignDataInput {
    return this._message
  }

  /* Set the signMethod and ensure that is lowercase */
  private setSignMethod() {
    const signMethod = this.options?.signMethod.toLowerCase()
    this._signMethod = signMethod
  }

  get signMethod() {
    return this._signMethod
  }

  /** Whether data structure has been validated - via validate() */
  get isValidated() {
    return this._isValidated
  }

  /** Verifies that the structure of the signature request is valid.
   *  Throws if any problems */
  public async validate(): Promise<Models.SignMessageValidateResult> {
    let result: Models.SignMessageValidateResult
    switch (this.signMethod) {
      case SignMethod.EthereumSignTypedData:
        result = await validateSignTypedDataInput(this.message as unknown as SignTypedDataInput)
        this._isValidated = result.valid
        break
      case SignMethod.Default:
        result = await validatePersonalSignInput(this.message as unknown as PersonalSignDataInput)
        this._isValidated = result.valid
        break
      default:
        Errors.throwNewError(`signMethod not recognized. signMethod provided = ${this.signMethod} not in ${Object.values(SignMethod)}`)
        break
    }
    return result
  }

  /** Throws if not validated */
  private assertIsValidated(): void {
    if (!this._isValidated) {
      Errors.throwNewError('SignMessage not validated. Call SignMessage.validate() first.')
    }
  }

  /** Sign the string or structured data */
  public async sign(privateKeys: EthereumPrivateKey[]): Promise<Models.SignMessageResult> {
    this.assertIsValidated()
    let result: Models.SignMessageResult
    try {
      switch (this.signMethod) {
        case SignMethod.EthereumSignTypedData:
          result = await signTypedData(privateKeys, this.message as unknown as SignTypedDataInput)
          break
        case SignMethod.Default:
          result = await personalSign(privateKeys, this.message as unknown as PersonalSignDataInput)
          break
        case SignMethod.EthereumSign:
          // Note that this is the same thing as personal-sign. Added to reduce confusion.
          result = await personalSign(privateKeys, this.message as unknown as PersonalSignDataInput)
          break
        default:
          Errors.throwNewError(`signMethod not recognized. signMethod provided = ${this.signMethod} not in ${Object.values(SignMethod)}`)
          break
      }
    } catch (error) {
      Errors.throwNewError('Erorr in SignMessage.sign() - ', error)
    }

    return result
  }
}
