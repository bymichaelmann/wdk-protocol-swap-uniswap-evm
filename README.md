# wdk-protocol-swap-uniswap-evm

WDK module to make evm BIP-32 wallets interact with the uniswap swap protocol.

## Installation

```bash
npm install wdk-protocol-swap-uniswap-evm
```

## Usage

```javascript
import UniswapProtocolEvm from 'wdk-protocol-swap-uniswap-evm'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'

// Create wallet and get account
const wallet = new WalletManagerEvm('your mnemonic...')
const account = await wallet.getAccount()

// Create swap protocol
const swapProtocol = new UniswapProtocolEvm(account)

// Get a quote
const quote = await swapProtocol.quoteSwap({
  tokenIn: 'TOKEN_A_ADDRESS',
  tokenOut: 'TOKEN_B_ADDRESS',
  tokenInAmount: 1000000n // amount in base units
})

console.log('Quote:', quote)

// Execute swap
const result = await swapProtocol.swap({
  tokenIn: 'TOKEN_A_ADDRESS',
  tokenOut: 'TOKEN_B_ADDRESS',
  tokenInAmount: 1000000n
})

console.log('Swap result:', result)
```

## API Reference

### UniswapProtocolEvm

#### Constructor

```javascript
new UniswapProtocolEvm(account, config?)
```

- `account` - Wallet account (full or read-only)
- `config` - Optional configuration
  - `swapMaxFee` - Maximum allowed swap fee

#### Methods

- `swap(options)` - Execute a token swap
- `quoteSwap(options)` - Get a quote for a swap

## Development

```bash
npm install
npm test
npm run lint
```

## License

Apache-2.0
