# wdk-protocol-swap-uniswap-evm

WDK module to make EVM BIP-32 wallets interact with the Uniswap V3 swap protocol.

This module interacts directly with the **Uniswap V3 on-chain contracts** (SwapRouter and Quoter) via ethers.js — no external API is required. It supports exact-input and exact-output token swaps for any ERC-20 token pairs that have a Uniswap V3 pool.

## Installation

```bash
npm install wdk-protocol-swap-uniswap-evm
```

## Default Addresses (Ethereum Mainnet)

| Contract       | Address                                      |
|----------------|----------------------------------------------|
| SwapRouter     | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| Quoter         | `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6` |
| WETH           | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |

## Usage

### Basic swap (USDC → WETH)

```javascript
import UniswapProtocolEvm from 'wdk-protocol-swap-uniswap-evm'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'

// Create wallet and get account
const wallet = new WalletManagerEvm('your mnemonic...')
const account = await wallet.getAccount()

// Create swap protocol
const swapProtocol = new UniswapProtocolEvm(account, {
  swapMaxFee: 100000000000000000n // optional: max gas cost in wei
})

// Get a quote (sell exact amount of USDC)
const quote = await swapProtocol.quoteSwap({
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',  // USDC
  tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  tokenInAmount: 1000000n // 1 USDC (6 decimals)
})

console.log('Expected WETH out:', quote.tokenOutAmount)

// Execute swap
const result = await swapProtocol.swap({
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  tokenInAmount: 1000000n
})

console.log('Swap result:', result)
// { hash: '0x...', fee: 100000n, tokenInAmount: 1000000n, tokenOutAmount: ... }
```

### Exact output swap (buy exactly N tokens)

```javascript
// Buy exactly 0.1 WETH, paying whatever USDC is needed
const quote = await swapProtocol.quoteSwap({
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  tokenOutAmount: 100000000000000000n // 0.1 WETH (18 decimals)
})

console.log('USDC needed:', quote.tokenInAmount)
```

## API Reference

### UniswapProtocolEvm

#### Constructor

```javascript
new UniswapProtocolEvm(account, config?)
```

- `account` — Wallet account (`IWalletAccount` for full access or `IWalletAccountReadOnly` for read-only)
- `config` — Optional configuration
  - `chainId` — EVM chain ID (default: `1` for Ethereum mainnet)
  - `swapRouter` — Uniswap V3 SwapRouter contract address
  - `quoter` — Uniswap V3 Quoter contract address
  - `feeTier` — Uniswap V3 pool fee tier (default: `3000` = 0.30%)
  - `slippageBps` — Slippage tolerance in basis points (default: `0`). Example: `50` = 0.5%.
  - `swapMaxFee` — Maximum allowed gas cost (in wei) — throws if exceeded

#### Methods

- `swap(options)` — Execute a token swap (requires write-capable account)
- `quoteSwap(options)` — Get a quote for a swap (works with read-only accounts)

### SwapOptions

| Field           | Type            | Required | Description                                  |
|-----------------|-----------------|----------|----------------------------------------------|
| `tokenIn`       | `string`        | yes      | Address of the token to sell                 |
| `tokenOut`      | `string`        | yes      | Address of the token to buy                  |
| `tokenInAmount` | `bigint`        | see note | Amount of input tokens to sell (base units)  |
| `tokenOutAmount`| `bigint`        | see note | Amount of output tokens to buy (base units)  |
| `to`            | `string`        | no       | Recipient address (defaults to account)      |

**Note:** Exactly one of `tokenInAmount` (sell/exact-input) or `tokenOutAmount` (buy/exact-output) must be provided.

### SwapResult

| Field            | Type     | Description                           |
|------------------|----------|---------------------------------------|
| `hash`           | `string` | Transaction hash                      |
| `fee`            | `bigint` | Actual gas cost (wei)                 |
| `tokenInAmount`  | `bigint` | Amount of input tokens sold           |
| `tokenOutAmount` | `bigint` | Amount of output tokens bought        |

## Configuration

```javascript
// Custom chain (Polygon)
const polygonProtocol = new UniswapProtocolEvm(account, {
  chainId: 137,
  swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  feeTier: 3000,
  swapMaxFee: 500000000000000n // 0.0005 ETH max gas
})
```

## Supported Chains

The module supports any EVM chain where Uniswap V3 is deployed. The WETH address is automatically resolved for:
- Ethereum Mainnet (1)
- Optimism (10)
- Polygon (137)
- Arbitrum (42161)
- Sepolia (11155111)

## Important Notes

- Tokens must be **ERC-20** compliant. Native ETH wrapping/unwrapping is not directly handled by this module, but native ETH swaps (via the zero address) pass the value as `tx.value`.
- This module uses **on-chain Uniswap V3 contracts** directly — no external API or indexer is required.
- Token approval for the SwapRouter is handled automatically when needed.
- Slippage tolerance is configurable via the `slippageBps` option (0 = no slippage protection). For production swaps, a value of 50-100 bps (0.5%-1%) is recommended to prevent sandwich attacks.

## Development

```bash
npm install
npm test
npm run lint
npm run build:types
```

## License

Apache-2.0
