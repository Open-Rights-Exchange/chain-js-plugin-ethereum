import { EthereumTransaction } from '../plugin/ethTransaction'
import { connectChain, goerliEndpoints, goerliChainOptions } from '../plugin/examples/helpers/networks'
import { toEthereumAddress, toEthereumPrivateKey } from '../plugin/helpers'
import { EthereumTransactionOptions } from '../plugin/models'
import { EthereumGnosisMultisigTransactionOptions } from '../plugin/plugins/multisig/gnosisSafeV1/models'
import { GnosisSafeMultisigPlugin } from '../plugin/plugins/multisig/gnosisSafeV1/plugin'
import { getSignatures } from './mockups/multisig'

jest.setTimeout(30000)

// const multisigOwner = '0x31DF49653c72933A4b99aF6fb5d5b77Cc169346a'
const multisigOwnerPrivateKey = '0xbafee378c528ac180d309760f24378a2cfe47d175691966d15c83948e4a7faa6'

// const multisigOwner2 = '0x76d1b5dCFE51dbeB3C489977Faf2643272AaD901'
const multisigOwnerPrivateKey2 = '0x9c58fafab2feb46838efdba78e108d2be13ec0064496889677f32044acf0bbc6'

describe('Ethereum ParentTransaction Tests', () => {
  const multisigOptions: EthereumGnosisMultisigTransactionOptions = {
    multisigAddress: toEthereumAddress('0xE5B218cc277BB9907d91B3B8695931963b411f2A'), // 0x6E94F570f5639bAb0DD3d9ab050CAf1Ad45BB764 for goerli
  }
  const transactionOptions: EthereumTransactionOptions<EthereumGnosisMultisigTransactionOptions> = {
    chain: 'ropsten',
    hardfork: 'istanbul',
    multisigOptions,
  }
  const sampleAction = {
    to: toEthereumAddress('0xA200c9fe7F747E10dBccA5f85A0A126c9bffe400'),
    // from: '0xfE331024D0D8b1C41B6d6203426f4B717E5C8aF3',
    value: 2000,
    gasLimit: '1000000',
  }
  const gnosisSafePlugin = new GnosisSafeMultisigPlugin()

  let transaction: EthereumTransaction

  it('sign and get strigified signatures', async () => {
    const chain = await connectChain(goerliEndpoints, goerliChainOptions)
    await chain.installPlugin(gnosisSafePlugin)

    transaction = await chain.new.Transaction(transactionOptions)

    transaction.actions = [sampleAction]

    await transaction.prepareToBeSigned()
    await transaction.validate()

    await transaction.sign([toEthereumPrivateKey(multisigOwnerPrivateKey)])

    await transaction.sign([toEthereumPrivateKey(multisigOwnerPrivateKey2)])

    expect(transaction.signatures).toHaveLength(2)
  })

  it('set signatures', async () => {
    const chain = await connectChain(goerliEndpoints, goerliChainOptions)
    await chain.installPlugin(gnosisSafePlugin)

    transaction = await chain.new.Transaction(transactionOptions)

    transaction.actions = [sampleAction]

    await transaction.prepareToBeSigned()
    await transaction.validate()

    await transaction.addSignatures(getSignatures)

    expect(transaction.signatures).toHaveLength(2)
  })
})
