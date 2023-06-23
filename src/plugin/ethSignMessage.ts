/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interfaces, Models, Errors } from '@open-rights-exchange/chain-js'
import {
  EthereumPrivateKey,
  EthereumTransactionOptions,
  SignMessagePersonalSignDataInput,
  SignMessageOptions,
  SignMessageMethod,
  SignMessageSignTypedDataInput,
  SignTypedDataInputModel,
} from './models'
import { personalSign, validatePersonalSignInput } from './stringSignMethods/personal-sign'
import {
  composeErrorExampleMessage,
  signTypedData,
  validateSignTypedDataInput,
} from './stringSignMethods/sign-typed-data'
import { tryParseJSON } from '../../../chain-js/src/helpers'

export class EthereumSignMessage implements Interfaces.SignMessage {
  constructor(message: string, options?: SignMessageOptions) {
    this.applyOptions(options)
    this.setSignMethod()
    this.applyMessage(message)
    this._isValidated = false
  }

  private _isValidated: boolean

  private _signMethod: string

  private _options: SignMessageOptions

  private _message: SignMessagePersonalSignDataInput | SignMessageSignTypedDataInput

  private applyOptions(options: SignMessageOptions) {
    this._options = options || { signMethod: SignMessageMethod.Default }
  }

  private applyMessage(message: string) {
    let typedMessage: typeof SignTypedDataInputModel
    switch (this.signMethod) {
      case SignMessageMethod.EthereumSignTypedData:
        typedMessage = tryParseJSON(message)
        if (!typedMessage) {
          const { errorMessage, example } = composeErrorExampleMessage(message)
          const completeMessage = `${errorMessage} - EXAMPLE: ${JSON.stringify(example)}`
          Errors.throwNewError(completeMessage)
        }
        this._message = typedMessage
        break
      case SignMessageMethod.Default:
      default:
        this._message = { stringToSign: message }
    }
  }

  /** Options provided when the SignMessage class was created */
  get options(): SignMessageOptions {
    return this._options
  }

  /** Message provided when the SignMessage class was created */
  get message(): SignMessageSignTypedDataInput | SignMessagePersonalSignDataInput {
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
      case SignMessageMethod.EthereumSignTypedData:
        result = await validateSignTypedDataInput(this.message as unknown as SignMessageSignTypedDataInput)
        this._isValidated = result.valid
        break
      case SignMessageMethod.EthereumSign:
        result = await validatePersonalSignInput(this.message as unknown as SignMessagePersonalSignDataInput)
        this._isValidated = result.valid
        break
      case SignMessageMethod.Default:
        result = await validatePersonalSignInput(this.message as unknown as SignMessagePersonalSignDataInput)
        this._isValidated = result.valid
        break
      default:
        Errors.throwNewError(
          `signMethod not recognized. signMethod provided = ${this.signMethod} not in ${Object.values(
            SignMessageMethod,
          )}`,
        )
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
        case SignMessageMethod.EthereumSignTypedData:
          result = await signTypedData(privateKeys, this.message as unknown as SignMessageSignTypedDataInput)
          break
        case SignMessageMethod.Default:
          result = await personalSign(privateKeys, this.message as unknown as SignMessagePersonalSignDataInput)
          break
        case SignMessageMethod.EthereumSign:
          // Note that this is the same thing as personal-sign. Added to reduce confusion.
          result = await personalSign(privateKeys, this.message as unknown as SignMessagePersonalSignDataInput)
          break
        default:
          Errors.throwNewError(
            `signMethod not recognized. signMethod provided = ${this.signMethod} not in ${Object.values(
              SignMessageMethod,
            )}`,
          )
          break
      }
    } catch (error) {
      Errors.throwNewError('Erorr in SignMessage.sign() - ', error)
    }

    return result
  }
}
