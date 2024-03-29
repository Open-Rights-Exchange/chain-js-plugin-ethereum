/* eslint-disable @typescript-eslint/no-unused-vars */
import { Transaction as EthereumJsTx, TxOptions } from '@ethereumjs/tx'
import { bufferToInt, bufferToHex, BN } from 'ethereumjs-util'
import { Interfaces, Models, Helpers, Errors } from '@open-rights-exchange/chain-js'
import Common, { CustomChain } from '@ethereumjs/common'
import { bufferPadStart } from 'pad-buffer'
import { TRANSACTION_FEE_PRIORITY_MULTIPLIERS } from './ethConstants'
import { EthereumChainState } from './ethChainState'
import {
  EthereumPrivateKey,
  EthereumRawTransaction,
  EthereumSignature,
  EthereumTransactionOptions,
  EthereumTransactionHeader,
  EthereumTransactionAction,
  EthereumAddress,
  EthereumAddressBuffer,
  EthereumPublicKey,
  EthereumBlockType,
  EthereumActionHelperInput,
  EthereumSetDesiredFeeOptions,
  EthereumTransactionFee,
  EthUnit,
  EthereumSignatureNative,
  EthereumJSCommonChains,
} from './models'
import {
  convertBufferToHexStringIfNeeded,
  convertEthUnit,
  increaseBNbyPercentage,
  isNullOrEmptyEthereumValue,
  isSameEthHexValue,
  isSameEthPublicKey,
  isValidEthereumAddress,
  isValidEthereumSignature,
  nullifyIfEmptyEthereumValue,
  privateKeyToAddress,
  toEthBuffer,
  toEthereumAddress,
  toEthereumPublicKey,
  toEthereumSignature,
  toEthereumSignatureNative,
} from './helpers'
import { EthereumActionHelper } from './ethAction'
import {
  EthereumMultisigPlugin,
  EthereumMultisigPluginRawTransaction,
  EthereumMultisigPluginTransaction,
} from './plugins/multisig/ethereumMultisigPlugin'
import { mapChainError } from './ethErrors'

export class EthereumTransaction implements Interfaces.Transaction {
  private _actionHelper: EthereumActionHelper

  private _chainState: EthereumChainState

  private _actualCost: Models.ActualCost

  /** estimated fee for transacton (in Wei) - encoded as string to handle big numbers */
  private _desiredFee: string

  /** estimated gas for transacton - encoded as string to handle big numbers */
  private _estimatedGas: string

  private _executionPriority: Models.TxExecutionPriority

  private _maxFeeIncreasePercentage: number

  private _isValidated: boolean

  private _options: EthereumTransactionOptions<any>

  private _multisigPlugin: EthereumMultisigPlugin

  private _multisigTransaction: EthereumMultisigPluginTransaction

  private _parentTransaction: EthereumTransaction

  constructor(
    chainState: EthereumChainState,
    options?: EthereumTransactionOptions<any>,
    multisigPlugin?: EthereumMultisigPlugin,
  ) {
    this._chainState = chainState
    this.applyOptions(options, multisigPlugin)
    // Note: In order to use setTransaction for multisig, we would need to install multisigPlugin (even if we dont pass in options.multisigOptions)
    this._multisigPlugin = multisigPlugin
    if (!Helpers.isNullOrEmpty(options?.multisigOptions)) {
      this.assertHasMultisigPlugin()
    }
  }

  public async init() {
    if (this.multisigPlugin) {
      this._multisigTransaction = await this.multisigPlugin.new.Transaction(this.options?.multisigOptions)
    }
  }

  get multisigPlugin(): EthereumMultisigPlugin {
    return this._multisigPlugin
  }

  get multisigTransaction(): EthereumMultisigPluginTransaction {
    return this._multisigTransaction
  }

  private applyOptions(options: EthereumTransactionOptions<any>, multisigPlugin?: EthereumMultisigPlugin) {
    // TOOD: Validate options
    this._options = options
    this.applyDefaultOptions()
  }

  private applyDefaultOptions() {
    this._maxFeeIncreasePercentage =
      this._options?.maxFeeIncreasePercentage ??
      this._chainState?.chainSettings?.defaultTransactionSettings?.maxFeeIncreasePercentage
    this._executionPriority =
      this._options?.executionPriority ??
      this._chainState?.chainSettings?.defaultTransactionSettings?.executionPriority ??
      Models.TxExecutionPriority.Average
  }

  get ethereumJsChainOptions(): TxOptions {
    let { chain, hardfork } = this.options || {}
    chain = chain ?? this._chainState.chainSettings?.chainForkType?.chainName
    hardfork = hardfork ?? this._chainState.chainSettings?.chainForkType?.hardFork
    const isCommonChain = Object.values(EthereumJSCommonChains).includes(chain)
    if (isCommonChain) return { common: new Common({ chain, hardfork }) }
    return { common: Common.custom(chain as CustomChain) }
  }

  /** Returns whether the transaction is a multisig transaction */
  public get isMultisig(): boolean {
    return !Helpers.isNullOrEmpty(this.options?.multisigOptions)
  }

  /** Whether transaction has been validated - via validate() */
  get isValidated() {
    return this._isValidated
  }

  /** Address from which transaction is being sent- from action.from (if provided) or derived from attached signature */
  get senderAddress() {
    return nullifyIfEmptyEthereumValue(this.action?.from) || nullifyIfEmptyEthereumValue(this.signedByAddress)
  }

  /** Address retrieved from attached signature - Returns null if no signature attached */
  get signedByAddress(): EthereumAddress {
    if (Helpers.isNullOrEmpty(this.signatures)) return null
    try {
      // getSenderAddress throws if sig not attached - so we catch that and return null in that case
      return toEthereumAddress(bufferToHex(this.ethereumJsTx.getSenderAddress()?.toBuffer()))
    } catch (error) {
      return null
    }
  }

  /** Public Key retrieved from attached signature - Returns null if no from value or signature attached */
  get signedByPublicKey(): EthereumPublicKey {
    if (Helpers.isNullOrEmpty(this.signatures)) return null
    try {
      // getSenderPublicKey throws if sig not attached - so we catch that and return null in that case
      return toEthereumPublicKey(bufferToHex(this.ethereumJsTx.getSenderPublicKey()))
    } catch (error) {
      return null
    }
  }

  /** Header includes values included in transaction when sent to the chain
   *  These values are set by setRawProperties() is called since it includes gasPrice, gasLimit, etc.
   */
  get header(): EthereumTransactionHeader {
    this.assertHasRaw()
    const { nonce, gasPrice, gasLimit } = this.raw
    return {
      nonce: Helpers.nullifyIfEmpty(bufferToHex(nonce)),
      gasLimit: Helpers.nullifyIfEmpty(bufferToHex(gasLimit)),
      gasPrice: Helpers.nullifyIfEmpty(bufferToHex(gasPrice)),
    }
  }

  /** Options provided when the transaction class was created */
  get options(): EthereumTransactionOptions<any> {
    return this._options
  }

  /** Raw transaction body - all values are Buffer types */
  get raw(): EthereumRawTransaction {
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      return this.multisigTransaction.rawTransaction
    }
    return this._actionHelper?.raw
  }

  /** Whether the raw transaction body has been set (via setting action or setTransaction()) */
  get hasRaw(): boolean {
    return !!this.raw
  }

  /** Ethereum chain module, returns a transaction instance that provides helper functions to sign, serialize etc... */
  get ethereumJsTx(): EthereumJsTx {
    return new EthereumJsTx(this.raw, this.ethereumJsChainOptions)
  }

  /** Ethereum doesn't have any native multi-sig functionality */
  get supportsMultisigTransaction(): boolean {
    return true
  }

  /** Ethereum transaction action (transfer & contract functions)
   * Returns null or an array with exactly one action
   */
  public get actions(): EthereumTransactionAction[] {
    const { action } = this
    if (!action) {
      return null
    }
    return [action]
  }

  /** Private property for the Ethereum contract action - uses _actionHelper */
  private get action(): EthereumTransactionAction {
    if (!this?._actionHelper?.action) return null
    const action = { ...this._actionHelper?.action, contract: this._actionHelper?.contract }
    return action
  }

  /** Sets actions array
   * Array length has to be exactly 1 because ethereum doesn't support multiple actions
   */
  public set actions(actions: EthereumTransactionAction[]) {
    this.assertNoSignatures()
    this._actionHelper = null
    this._isValidated = false
    if (Helpers.isNullOrEmpty(actions)) {
      return
    }
    if (!Helpers.isArrayLengthOne(actions)) {
      Errors.throwNewError('Ethereum transaction.actions only accepts an array of exactly 1 action')
    }
    this.addAction(actions[0])
  }

  /** Add action to the transaction body
   *  throws if transaction.actions already has a value
   *  Ignores asFirstAction parameter since only one action is supported in ethereum */
  public addAction(action: EthereumTransactionAction, asFirstAction?: boolean): void {
    this.assertNoSignatures()
    if (!Helpers.isNullOrEmpty(this._actionHelper)) {
      Errors.throwNewError(
        'addAction failed. Transaction already has an action. Use transaction.actions to replace existing action.',
      )
    }
    this._actionHelper = new EthereumActionHelper(action, this.ethereumJsChainOptions)
    this._isValidated = false
  }

  /**
   *  Updates 'raw' transaction properties using the actions attached
   *  Creates and sets private _ethereumJsTx (web3 EthereumJsTx object)
   *  Also adds header values (nonce, gasPrice, gasLimit) if not already set in action
   */
  private setRawProperties(): void {
    this.assertIsConnected()
    this.assertHasAction()
    this.assertHasFeeSetting()
    if (!this._actionHelper) {
      Errors.throwNewError('Failed to set raw transaction properties. Transaction has no actions.')
    }
    const { gasLimit: gasLimitOptions, gasPrice: gasPriceOptions, nonce: nonceOptions } = this._options || {}
    const { gasPrice: gasPriceAction, gasLimit: gasLimitAction, nonce: nonceAction } = this._actionHelper.action

    // Convert gas price returned from getGasPrice to Gwei
    const gasPrice =
      Helpers.nullifyIfEmpty(gasPriceAction) ||
      Helpers.nullifyIfEmpty(gasPriceOptions) ||
      this._chainState.currentGasPriceInWei
    const gasLimit = Helpers.nullifyIfEmpty(gasLimitAction) || Helpers.nullifyIfEmpty(gasLimitOptions)
    const nonce = Helpers.nullifyIfEmpty(nonceAction) || Helpers.nullifyIfEmpty(nonceOptions)
    // update action helper with updated nonce and gas values
    const trxBody: EthereumActionHelperInput = {
      ...this._actionHelper.action,
      nonce,
      gasPrice,
      gasLimit,
      contract: this._actionHelper.contract,
    }
    this._actionHelper = new EthereumActionHelper(trxBody, this.ethereumJsChainOptions)
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      // TODO: this.multisigTransaction.clearRaw()
    }
  }

  /** Set the body of the transaction using Hex raw transaction data */
  async setTransaction(transaction: EthereumActionHelperInput | EthereumMultisigPluginRawTransaction): Promise<void> {
    this.assertIsConnected()
    this.assertNoSignatures()
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      await this.multisigTransaction.setTransaction(transaction)
      await this.updateMultisigParentTransaction()
    }
    if (transaction) {
      this._actionHelper = new EthereumActionHelper(transaction, this.ethereumJsChainOptions)
      this._isValidated = false
    }
  }

  /**
   * Checks to see if gasPrice or GasLimit have  been set at either the Action or the Transactino level
   * The value set at the Action Level takes precidence and will overwrite the value set at the transaction level
   * If it is found that GasPrice of GasLimit is set at the transaction or Action level, then explicitGasPriceOrGasLimitIsProvided is set to true
   */
  getExplictlySetGasPriceAndGasLimit() {
    const { gasLimit: gasLimitOptions, gasPrice: gasPriceOptions } = this._options || {}
    const { gasLimit: gasLimitAction, gasPrice: gasPriceAction } = this._actionHelper.action
    const explicitGasPriceValue = gasPriceOptions || gasPriceAction
    const explicitGasLimitValue = gasLimitOptions || gasLimitAction

    let explicitGasPriceOrGasLimitIsProvided = true
    if (isNullOrEmptyEthereumValue(explicitGasPriceValue) && isNullOrEmptyEthereumValue(explicitGasLimitValue)) {
      explicitGasPriceOrGasLimitIsProvided = false
    }

    return { explicitGasPriceValue, explicitGasLimitValue, explicitGasPriceOrGasLimitIsProvided }
  }

  /**
   *  Updates nonce and gas fees (if necessary) - these values must be present
   */
  public async prepareToBeSigned(): Promise<void> {
    this.assertIsConnected()
    this.assertHasAction()

    if (!this.requiresParentTransaction) {
      const { explicitGasPriceValue, explicitGasLimitValue, explicitGasPriceOrGasLimitIsProvided } =
        this.getExplictlySetGasPriceAndGasLimit()

      // If no GasPrice or GasLimit were provided in options or the action, then get and set the suggested fee.
      // Else we need to consider recieving just the GasLimit or just the GasPrice.
      if (!explicitGasPriceOrGasLimitIsProvided) {
        // set gasLimit if not already set, set it using the execution Priority specified for this transaction
        // NOTE: we don't set fees here if we'll have a parent trnsaction. That will happen when the parent tx is set
        const { feeStringified } = await this.getSuggestedFee(this._executionPriority)
        await this.setDesiredFee(feeStringified)
      } else {
        const { feeStringifiedCustom, overideOptions } =
          await this.getExplicitGasFeeOrLimitAndCalculateSuggestedFeeIfNotexplicitlyProvided(
            explicitGasPriceValue,
            explicitGasLimitValue,
          )
        await this.setDesiredFee(feeStringifiedCustom, overideOptions)
      }
    }
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      await this.multisigTransaction.setTransaction(this._actionHelper.action)
    } else {
      await this.setNonceIfEmpty(this.senderAddress)
    }
    this.setRawProperties()
  }

  /**
   *  If an explicit gasPrice was provided then set gasPriceOverride to that value
   *  If not then calculate a suggested fee
   *  If a explicit GasLimit was supplied then set that in the overide options
   */
  private async getExplicitGasFeeOrLimitAndCalculateSuggestedFeeIfNotexplicitlyProvided(
    explicitGasPriceValue: string,
    explicitGasLimitValue: string,
  ): Promise<{ feeStringifiedCustom: string; overideOptions: EthereumSetDesiredFeeOptions }> {
    // When gasPriceOverride is supplied as an option to setDesiredFee(), that is the gasPrice that will be used.
    // Since the suggested fee has no impact in that case, we'll set a 0 fee
    let feeStringifiedCustom = '{ "fee": "0" }'
    const overideOptions: EthereumSetDesiredFeeOptions = {}
    // If we have a GasPrice that was supplied in the options or the transaction us that.
    // Else we need to calculate a suggestedFee and overwrite the above 0 fee.
    if (explicitGasPriceValue) {
      overideOptions.gasPriceOverride = explicitGasPriceValue
    } else {
      // If no gasPrice was explicity set then we'll need to calculate a suggesed fee.
      const { feeStringified } = await this.getSuggestedFee(this._executionPriority)
      feeStringifiedCustom = feeStringified
    }
    // Add the GasLimit to the overide options if it was provided.
    if (explicitGasLimitValue) {
      const gasLimitBN = this._chainState.web3.utils.toBN(explicitGasLimitValue)
      overideOptions.gasLimitOverride = gasLimitBN.toString(10)
    }
    return { feeStringifiedCustom, overideOptions }
  }

  /** calculates a unique nonce value for the tx (if not already set) by using the chain transaction count for a given address */
  async setNonceIfEmpty(fromAddress: EthereumAddress | EthereumAddressBuffer) {
    if (Helpers.isNullOrEmpty(fromAddress)) return
    this.assertHasRaw()
    const address = toEthereumAddress(convertBufferToHexStringIfNeeded(fromAddress))

    if (isNullOrEmptyEthereumValue(this.raw?.nonce)) {
      const txCount = await this._chainState.getTransactionCount(address, EthereumBlockType.Pending)
      this._actionHelper.nonce = txCount.toString()
    }
  }

  // validation

  /** Verifies that raw trx exists, sets nonce (using sender's address) if not already set
   *  Throws if any problems */
  public async validate(): Promise<void> {
    if (!this.hasRaw) {
      Errors.throwNewError(
        'Transaction validation failure. Transaction has no action. Set action or use setTransaction().',
      )
    }
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      this.multisigTransaction.validate()
    } else {
      const { gasPrice, gasLimit } = this.ethereumJsTx
      // if we have a parent Tx, it should have fees set, not this 'child' tx
      if (!this.requiresParentTransaction) {
        if (isNullOrEmptyEthereumValue(gasPrice) || isNullOrEmptyEthereumValue(gasLimit)) {
          Errors.throwNewError(
            'Transaction validation failure. Missing gasPrice or gasLimit. Call prepareToBeSigned() to auto-set.',
          )
        }
      }
    }
    // make sure the from address is a valid Eth address
    this.assertFromIsValid()
    this._isValidated = true
  }

  // signatures

  /** Get signature attached to transaction - returns null if no signature */
  get signatures(): EthereumSignature[] {
    let signatures: EthereumSignature[] = []
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      signatures = this.multisigTransaction.signatures
    } else {
      const { v, r, s } = this._actionHelper?.raw || {}
      if (Helpers.isNullOrEmpty(v) || Helpers.isNullOrEmpty(r) || Helpers.isNullOrEmpty(s)) {
        return null // return null instead of empty array
      }
      const signature = toEthereumSignatureNative({
        v: bufferToInt(v),
        r: bufferPadStart(r, 32), // The validate signature logic expects 32 bytes. Some r and s values can result in 31 bytes - pad the number to ensure it's seen as valid.
        s: bufferPadStart(s, 32), // The validate signature logic expects 32 bytes. Some r and s values can result in 31 bytes - pad the number to ensure it's seen as valid.
      })
      signatures = [toEthereumSignature(signature)] // cast to stringifed sig
    }
    return signatures
  }

  /** Add signature to raw transaction - Accepts array with exactly one signature */
  addSignatures = async (signatures: EthereumSignature[]): Promise<void> => {
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      await this.multisigTransaction.addSignatures(signatures)
      await this.updateMultisigParentTransaction()
      return
    }
    // add a regular signature (not multisig)
    if (Helpers.isNullOrEmpty(signatures) && this.hasRaw) {
      this._actionHelper.signature = { v: null, r: null, s: null } as EthereumSignatureNative
    } else if (!Helpers.isArrayLengthOne(signatures)) {
      Errors.throwNewError('Ethereum addSignature function only allows signatures array length of 1')
    } else {
      this.assertHasRaw()
      const signature = signatures[0]
      this.assertValidSignature(signature)
      this._actionHelper.signature = toEthereumSignatureNative(signature)
    }
  }

  /** Throws if signatures isn't properly formatted */
  private assertValidSignature = (signature: EthereumSignature) => {
    if (!isValidEthereumSignature(signature)) {
      Errors.throwNewError(`Not a valid signature : ${signature}`, 'signature_invalid')
    }
  }

  /** Whether there is an attached signature */
  get hasAnySignatures(): boolean {
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      return !Helpers.isNullOrEmpty(this.multisigTransaction.signatures)
    }
    return !Helpers.isNullOrEmpty(this.signatures)
  }

  /** Throws if any signatures are attached */
  private assertNoSignatures() {
    if (this.hasAnySignatures) {
      Errors.throwNewError(
        'You cant modify the body of the transaction without invalidating the existing signatures. Remove the signatures first.',
      )
    }
  }

  /** Throws if transaction is missing any signatures */
  private assertHasSignature(): void {
    if (!this.hasAnySignatures) {
      Errors.throwNewError('Missing Signature', 'transaction_missing_signature')
    }
  }

  /** Whether there is an attached signature for the provided publicKey */
  public hasSignatureForPublicKey = (publicKey: EthereumPublicKey): boolean => {
    return isSameEthPublicKey(this.signedByPublicKey, publicKey)
  }

  /** Whether there is an attached signature for the publicKey of the address */
  public async hasSignatureForAuthorization(authorization: EthereumAddress): Promise<boolean> {
    return isSameEthHexValue(this.signedByAddress, authorization)
  }

  /** Whether signature is attached to transaction (and/or whether the signature is correct)
   * If a specific action.from is specifed, ensure that attached signature matches its address/public key */
  public get hasAllRequiredSignatures(): boolean {
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      return Helpers.isNullOrEmpty(this.multisigTransaction.missingSignatures)
    }
    // if action.from exists, make sure it matches the attached signature
    if (!this.isFromEmptyOrNullAddress()) {
      return isSameEthHexValue(this.signedByAddress, this.action?.from)
    }
    // if no specific action.from, just confirm any signature is attached
    return this.hasAnySignatures
  }

  /** Throws if transaction is missing any signatures */
  private assertHasAllRequiredSignature(): void {
    // If a specific action.from is specifed, ensure that a signature is attached that matches its address/public key
    if (!this.hasAllRequiredSignatures) {
      Errors.throwNewError('Missing at least one required Signature', 'transaction_missing_signature')
    }
  }

  /** Returns address, for which, a matching signature must be attached to transaction
   *  ... always an array of length 1 because ethereum only supports one signature
   *  If no action.from is set, and no signature attached, throws an error since from addr cant be determined
   *  Throws if action.from is not a valid address */
  public get missingSignatures(): EthereumAddress[] {
    this.assertIsValidated()
    let missingSignatures = []
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      missingSignatures = this.multisigTransaction.missingSignatures
    } else {
      if (Helpers.isNullOrEmpty(this.requiredAuthorization)) {
        Errors.throwNewError('Cant determine signatures required - set a from address or attach a signature')
      }
      missingSignatures = this.hasAllRequiredSignatures ? null : [this.requiredAuthorization] // if no values, return null instead of empty array
    }
    return missingSignatures
  }

  /** A transction in the pending pool can be cancelled */
  public get supportsCancel() {
    return true
  }

  /** Ethereum does not require chain resources for a transaction */
  public get supportsResources(): boolean {
    return false
  }

  /** Ethereum transactions do not require chain resources */
  public async resourcesRequired(): Promise<Models.TransactionResources> {
    Helpers.notSupported('Ethereum does not require transaction resources')
    return null // quiets linter
  }

  /** Gets estimated cost in units of gas to execute this transaction (at current chain rates) */
  async updateEstimatedGas(): Promise<{ gas: string }> {
    let gas: string
    this.assertHasAction()
    this.assertFromIsValid()
    try {
      const input = {
        to: isNullOrEmptyEthereumValue(this.action.to) ? null : this.action.to,
        from: this.senderAddress, // from is required for estimateGas
        value: isNullOrEmptyEthereumValue(this.action.value) ? 0 : this.action.value,
        data: isNullOrEmptyEthereumValue(this.action.data) ? null : this.action.data,
        chain: this.ethereumJsChainOptions?.common?.chainName(),
        fork: this.ethereumJsChainOptions?.common?.hardfork(),
      }
      gas = (await this._chainState.web3.eth.estimateGas(input)).toString()
      this._estimatedGas = gas
    } catch (err) {
      Errors.throwNewError(`Transaction cost estimation failure. ${err}`)
    }
    return { gas }
  }

  /** Gets the estimated gas cost for this transaction in Wei
   *  if refresh = true, get updated cost from chain */
  async getEstimatedGas(refresh: boolean = false) {
    if (Helpers.isNullOrEmpty(this._estimatedGas) || refresh) {
      await this.updateEstimatedGas()
    }
    return this._estimatedGas
  }

  /** Fee multipliers effective for this transaction - uses default values if not set via transaction options  */
  get feeMultipliers() {
    const { feeMultipliers: feeMultiplier } = this.options || {}
    const multipliers = feeMultiplier ? { ...feeMultiplier } : TRANSACTION_FEE_PRIORITY_MULTIPLIERS
    return multipliers
  }

  /** Get the suggested Eth fee (in Wei) for this transaction */
  public async getSuggestedFee(
    priority: Models.TxExecutionPriority = Models.TxExecutionPriority.Average,
  ): Promise<{ estimationType: Models.ResourceEstimationType; feeStringified: string }> {
    try {
      // fees for 'child' transaction are always null (if we set here, this value will be used instead of re-caclulating for parent)
      if (this.requiresParentTransaction) {
        return { estimationType: Models.ResourceEstimationType.Exact, feeStringified: null } // exactly no fees are required
      }
      this.assertHasAction()
      const gasPriceString = await this._chainState.getCurrentGasPriceFromChain()
      const gasPriceinWeiBN = new BN(gasPriceString)
      const multiplier = this.feeMultipliers[priority]
      const multiplierPercentage = multiplier * 100 - 100
      const gasPriceinWeiBNWithMultiplierApplied = increaseBNbyPercentage(gasPriceinWeiBN, multiplierPercentage) // apply the multiplier specified in the options
      // multiply estimated fee times gas price
      const estimatedGas = await this.getEstimatedGas()
      const feeInWei = gasPriceinWeiBNWithMultiplierApplied.mul(new BN(estimatedGas, 10))
      const feeStringified = JSON.stringify({ fee: feeInWei.toString() })
      return { estimationType: Models.ResourceEstimationType.Estimate, feeStringified } // estimated since gas price can change
    } catch (error) {
      const chainError = mapChainError(error)
      throw chainError
    }
  }

  /** get the desired fee (in Ether) to spend on sending the transaction */
  public async getDesiredFee(): Promise<string> {
    if (!this._desiredFee) return null
    return convertEthUnit(this._desiredFee, EthUnit.Wei, EthUnit.Ether)
  }

  /** set the fee that you would like to pay (in Wei) - this will set the gasPrice and gasLimit (based on maxFeeIncreasePercentage)
   *  If gasLimitOverride is provided, gasPrice will be calculated and gasLimit will be set to gasLimitOverride
   *  desiredFeeStringified is stringified JSON object object of type: { fee: '123' } where string value is in Wei
   *  clear fees by passing in desiredFeeStringified = null
   */
  public async setDesiredFee(desiredFeeStringified: string, options?: EthereumSetDesiredFeeOptions) {
    try {
      this.assertNoSignatures()
      this.assertHasAction()
      const desiredFeeJson = Helpers.tryParseJSON(desiredFeeStringified) as EthereumTransactionFee
      // clear fee
      if (!desiredFeeJson || desiredFeeJson?.fee === null) {
        this._desiredFee = null
        this._actionHelper.gasPrice = null
        this._actionHelper.gasLimit = null
        return
      }
      if (!Helpers.isAString(desiredFeeJson?.fee)) {
        throw new Error(
          'desiredFeeStringified invalid: Expected stringified object of type: { fee: "123" } where string value is in Wei',
        )
      }
      const { gasLimitOverride, gasPriceOverride } = options || {}
      const desiredFeeWei = desiredFeeJson.fee
      this._desiredFee = desiredFeeWei

      // If gasPriceOverride is provided then there's no need to do any math. Just use the value.
      let gasPriceString = null
      let gasRequiredBn = null
      if (gasPriceOverride) {
        gasPriceString = gasPriceOverride // It is expected that gasPriceOverride will be in Gwei
      } else {
        // The desired fee = the total the user would like to pay
        // We need to divide desired fee by the # of gas units required to run the txn. The result is a per gas unit cost
        gasRequiredBn = new BN((await this.updateEstimatedGas())?.gas, 10) // Get the total # of gas units
        const desiredFeeWeiBn = new BN(desiredFeeWei, 10)
        const gasPriceWeiBn = desiredFeeWeiBn.div(gasRequiredBn) // Div the desiredFee / gas units required to get a per unit cost
        gasPriceString = gasPriceWeiBn.toString()
      }

      // If gasLimitOverride is provided then there's no need to do any math. Just use the value.
      let gasLimitString = null
      if (gasLimitOverride) {
        gasLimitString = gasLimitOverride
      } else {
        // The intrinsic gas for a transaction is the amount of gas that the transaction uses before any code runs. It is a constant “transaction fee” (currently 21000 gas) plus a fee for every byte of data supplied with the transaction (4 gas for a zero byte, 68 gas for non-zeros).
        // Note: If you don't add 4 or 68 (depending if your txn has data) you'll get the following error 'intrinsic gas too low'
        let byteFee: BN = new BN(4)
        if (this.action.data) {
          byteFee = new BN(68)
        }
        // If gasPriceOverride was provided then we would not have estimated the gas usage
        if (gasRequiredBn === null) {
          gasRequiredBn = new BN((await this.updateEstimatedGas())?.gas, 10)
        }
        const gasRequiredWithIntrinsicBn = gasRequiredBn.add(byteFee)
        const gasRequiredWithIntrinsicAndBnAndMaxFeeIncreasePercentageApplied = increaseBNbyPercentage(
          gasRequiredWithIntrinsicBn,
          this.maxFeeIncreasePercentage,
        ) // apply the multiplier specified in the options
        gasLimitString = gasRequiredWithIntrinsicAndBnAndMaxFeeIncreasePercentageApplied.toString(10)
      }

      this._actionHelper.gasPrice = gasPriceString
      this._actionHelper.gasLimit = gasLimitString
    } catch (error) {
      const chainError = mapChainError(error)
      throw chainError
    }
  }

  /** Hash of transaction - signature must be present to determine transactionId */
  public get transactionId(): string {
    if (!this.hasAnySignatures) {
      return null
      // throwNewError('Cant determine transaction ID - missing transaction signature')
    }
    return Helpers.ensureHexPrefix(this.ethereumJsTx.hash().toString('hex'))
  }

  /** Returns fee after transaction execution is done in wei format */
  public get actualCost(): Models.ActualCost {
    return this._actualCost
  }

  /** get the actual cost (in Ether) for executing the transaction */
  private async setActualCost() {
    const transaction = await this._chainState.getExecutedTransactionById(this.transactionId)
    if (!transaction) {
      return
    }
    this._actualCost = {
      fee: (parseInt(this.action.gasPrice, 16) * transaction?.gasUsed || 0).toString(10),
    }
  }

  public get maxFeeIncreasePercentage(): number {
    return this._maxFeeIncreasePercentage || 0
  }

  /** The maximum percentage increase over the desiredGas */
  public set maxFeeIncreasePercentage(percentage: number) {
    if (percentage < 0) {
      Errors.throwNewError('maxFeeIncreasePercentage can not be a negative value')
    }
    this._maxFeeIncreasePercentage = percentage
  }

  /** throws if required fee properties aren't set */
  private assertHasFeeSetting(): void {
    if (Helpers.isNullOrEmpty(this._maxFeeIncreasePercentage)) {
      Errors.throwNewError('MaxFeeIncreasePercentage must be set (included in Transaction options or set directly)')
    }
  }

  /** Get the execution priority for the transaction - higher value attaches more fees */
  public get executionPriority(): Models.TxExecutionPriority {
    return this._executionPriority
  }

  public set executionPriority(value: Models.TxExecutionPriority) {
    this._executionPriority = value
  }

  // Authorizations

  /** Returns address specified by actions[].from property
   * throws if actions[].from is not a valid address - needed to determine the required signature */
  public get requiredAuthorizations(): EthereumAddress[] {
    return [this.requiredAuthorization]
  }

  /** Return the one signature address required */
  private get requiredAuthorization(): EthereumAddress {
    this.assertFromIsValid()
    return this.senderAddress
  }

  /** Buffer encoding of transaction data/hash to sign */
  public get signBuffer(): Buffer {
    this.assertIsValidated()
    if (this.isMultisig) return this.multisigTransaction.signBuffer
    return this.ethereumJsTx.getMessageToSign()
  }

  private async signAndAddSignatures(privateKey: string) {
    const privateKeyBuffer = toEthBuffer(Helpers.ensureHexPrefix(privateKey))
    const ethJsTx = this.ethereumJsTx
    const signedTrx = ethJsTx.sign(privateKeyBuffer)
    const signature = {
      v: bufferToInt(signedTrx.v?.toBuffer()),
      r: bufferPadStart(signedTrx.r?.toBuffer(), 32), // The validate signature logic expects 32 bytes. Some r and s values can result in 31 bytes - pad the number to ensure it's seen as valid.
      s: bufferPadStart(signedTrx.s?.toBuffer(), 32), // The validate signature logic expects 32 bytes. Some r and s values can result in 31 bytes - pad the number to ensure it's seen as valid.
    } as EthereumSignatureNative
    await this.addSignatures([signature])
  }

  /** Returns realted parent (to multisig) transaction (if appropriate for this tx)
   * For a multisig tx, the parent is the tx sent to the mutlsig contract on the chain
   * Throws if parent is not yet set or isnt required - use requiresParentTransaction() and hasParentTransaction() to check first */
  public get parentTransaction(): EthereumTransaction {
    this.assertHasParentTransaction()
    return this._parentTransaction
  }

  /** Whether parent transaction has been set yet */
  public get hasParentTransaction(): boolean {
    return !!this._parentTransaction
  }

  /** Wether multisigPlugin requires transaction body to be wrapped in a parent transaction */
  public get requiresParentTransaction(): boolean {
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      return this.multisigTransaction.requiresParentTransaction
    }
    // Ethereum natively does not require parent transaction
    return false
  }

  /** Sign the transaction body with private key and add to attached signatures
   *  If Multisig, i gives priority for multisigSign until no plugin.missingSignatures is empty
   *  Then it automatically signs parent transaction with the first element of the privateKeys array
   *  This parent signature can be overriden by calling sign after all multisig signing is done.
   */
  public async sign(privateKeys: EthereumPrivateKey[]): Promise<void> {
    if (Helpers.isNullOrEmpty(privateKeys)) {
      Errors.throwNewError('privateKeys[] cannot be empty')
    }
    const [firstPrivateKey] = privateKeys

    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      if (!Helpers.isNullOrEmpty(this.multisigTransaction?.missingSignatures)) {
        await this.multisigTransaction.sign(privateKeys)
        await this.updateMultisigParentTransaction()
      }
    } else {
      if (!Helpers.isArrayLengthOne(privateKeys)) {
        Errors.throwNewError('If ethereum transaction is not multisig, sign() requires privateKeys array of length one')
      }

      await this.setNonceIfEmpty(privateKeyToAddress(firstPrivateKey))
      await this.signAndAddSignatures(firstPrivateKey)
    }
  }
  // send

  /** Broadcast a signed transaction to the chain
   *  waitForConfirm specifies whether to wait for a transaction to appear in a block before returning */
  public async send(
    waitForConfirm: Models.ConfirmType = Models.ConfirmType.None,
    communicationSettings?: Models.ChainSettingsCommunicationSettings,
  ): Promise<any> {
    this.assertIsValidated()
    this.assertHasAllRequiredSignature()
    // Serialize the entire transaction for sending to chain (prepared transaction that includes signatures { v, r , s })
    const signedTransaction = bufferToHex(this.ethereumJsTx.serialize())
    const response = await this._chainState.sendTransaction(signedTransaction, waitForConfirm, communicationSettings)
    if (waitForConfirm !== Models.ConfirmType.None) {
      await this.setActualCost()
    }
    return response
  }

  /** Updates the multisig parent transaction for this transaction - if enough signatures are attached
   * ParentTransaction is the transaction sent to chain - e.g. sent to multisig contract.
   * Action (e.g transfer token) is embedded as data in parent transaction
   */
  async updateMultisigParentTransaction(): Promise<void> {
    // Ethereum raw transaction includes both action related properties (to, value, data)
    //  and option related properties (gasLimit, gasPrice)
    //  multisig plugin may (including default Gnosis) encapsulate multisig transaction into 'data' (contract call)
    //  so Transaction class needs to fill in the optional fields for the parent transaction using actionHelper
    // we can only create the parent after enough signatures are present
    if (!this.hasAllRequiredSignatures && this._parentTransaction) {
      this._parentTransaction = null // clear _parentTransaction if no longer have enough sigs
      return
    }
    if (!this.hasAllRequiredSignatures) return

    if (Helpers.isNullOrEmpty(this.multisigTransaction?.parentRawTransaction)) {
      return
    }
    const rawParent = {
      gasLimit: this._actionHelper?.raw?.gasLimit,
      gasPrice: this._actionHelper?.raw?.gasPrice,
      ...this.multisigTransaction?.parentRawTransaction,
    }
    const txOptions: EthereumTransactionOptions<any> = {
      ...this._options,
      multisigOptions: null,
    }
    this._parentTransaction = new EthereumTransaction(this._chainState, txOptions, null)
    await this._parentTransaction.setTransaction(rawParent)
    await this._parentTransaction.prepareToBeSigned()
    await this._parentTransaction.validate()
  }

  // helpers

  /** Throws if parentTransaction isnt supported or missing */
  assertHasParentTransaction() {
    if (!this.requiresParentTransaction) {
      Errors.throwNewError('ParentTransaction is not supported')
    }
    if (!this.hasParentTransaction) {
      Errors.throwNewError(
        'ParentTransaction is not yet set. It is set by multisigPlugin when enough signatures are attached. Check required signatures using transaction.missingSignatures().',
      )
    }
  }

  /** Throws if not yet connected to chain - via chain.connect() */
  private assertIsConnected(): void {
    if (!this._chainState?.isConnected) {
      Errors.throwNewError('Not connected to chain')
    }
  }

  /** Throws if not validated */
  private assertIsValidated(): void {
    this.assertIsConnected()
    this.assertHasRaw()
    if (!this._isValidated) {
      Errors.throwNewError('Transaction not validated. Call transaction.validate() first.')
    }
  }

  /** Whether action.from (if present) is a valid ethereum address - also checks that from is provided if data was */
  private assertFromIsValid(): void {
    // Checking from field removed. Because of multisih account creation
    // if (
    //   !this.isMultisig &&
    //   !isNullOrEmptyEthereumValue(this?.action?.data) &&
    //   isNullOrEmptyEthereumValue(this?.action?.from)
    // ) {
    //   throwNewError('Transaction action.from must be provided to call a contract (since action.data was provided).')
    // }
    if (!this.isFromEmptyOrNullAddress() && !isValidEthereumAddress(this?.action?.from)) {
      Errors.throwNewError('Transaction action.from address is not valid.')
    }
  }

  /** Throws if an action isn't attached to this transaction */
  private assertHasAction() {
    if (Helpers.isNullOrEmpty(this._actionHelper)) {
      Errors.throwNewError(
        'Transaction has no action. You can set the action using transaction.actions or setTransaction().',
      )
    }
  }

  /** Throws if no raw transaction body */
  private assertHasRaw(): void {
    if (!this.hasRaw) {
      Errors.throwNewError('Transaction doesnt have a transaction body. Set action or use setTransaction().')
    }
  }

  /** If multisig plugin is required, make sure its initialized */
  private assertHasMultisigPlugin() {
    if (!this.multisigPlugin) {
      Errors.throwNewError('EthereumTransaction error - multisig plugin is missing (required for multisigOptions)')
    }
  }

  /** If multisig plugin is required, make sure its initialized */
  private assertMultisigPluginIsInitialized() {
    this.assertHasMultisigPlugin()
    if (!this.multisigPlugin?.isInitialized) {
      Errors.throwNewError('EthereumTransaction error - multisig plugin is not initialized')
    }
  }

  private isFromAValidAddressOrEmpty(): boolean {
    return this.isFromEmptyOrNullAddress() || isValidEthereumAddress(this?.action?.from)
  }

  /** Whether the from address is null or empty */
  private isFromEmptyOrNullAddress(): boolean {
    return isNullOrEmptyEthereumValue(this?.action?.from)
  }

  /** JSON representation of transaction data */
  public toJson(): any {
    return { header: this.header, actions: this.actions, raw: this.raw, signatures: this.signatures }
  }

  /** Ensures that the value comforms to a well-formed signature */
  public toSignature(value: any): EthereumSignature {
    if (this.isMultisig) {
      this.assertMultisigPluginIsInitialized()
      return this.multisigTransaction.toSignature(value)
    }

    return toEthereumSignature(value) // returns stringified sig
  }

  /** Whether transaction has expired */
  public async isExpired(): Promise<boolean> {
    Helpers.notSupported('Ethereum transactions dont expire')
    return null
  }

  /** Date (and time) when transaction can first be sent to the chain (before which the transaction will fail) */
  public async validOn(): Promise<Date> {
    Helpers.notSupported('Ethereum transactions dont have a valid from date')
    return null
  }

  /** Whether transaction has expired */
  public async expiresOn(): Promise<Date> {
    Helpers.notSupported('Ethereum transactions dont expire')
    return null
  }

  // ------------------------ Ethereum Specific functionality -------------------------------
  // Put any Ethereum chain specific feature that aren't included in the standard Transaction interface below here  */
  // calling code can access these functions by first casting the generic object into an eos-specific flavor
  // e.g.   let ethTransaction = (transaction as EthTransaction);
  //        ethTransaction.anyEthSpecificFunction();
}
