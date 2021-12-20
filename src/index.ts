import * as HelpersEthereum from './plugin/helpers'
import * as ModelsEthereum from './plugin/models'
import * as TemplateModelsEthereum from './plugin/templates/models'
import Plugin from './plugin/ChainEthereumV1'

export { HelpersEthereum, ModelsEthereum, TemplateModelsEthereum, Plugin }

// Not quite sure why tests/error.test.ts refernces eosjs

// Note the NPM package bn.js is referenced from a number of package.
// web3-utils etc. The web-* packages were all pinned to version 1.3.6
// This seemed to be the only reliable way to prevent the conflict for now
