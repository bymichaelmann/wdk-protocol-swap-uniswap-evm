// Integration test stub for on-chain verification against a mainnet fork.
// Requires a mainnet RPC URL (e.g. Alchemy, Infura, local hardhat fork).
//
// To run:
//   1. Set FORK_RPC_URL to a mainnet RPC endpoint
//   2. Run: FORK_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY npx jest tests/integration.test.js
//
// Or with a local hardhat fork:
//   1. npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY --fork-block-number 25267176
//   2. Run: npx jest tests/integration.test.js

import { ethers } from 'ethers'
import UniswapProtocolEvm from '../index.js'

const BLOCK_NUMBER = 25267176
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

describe.skip('UniswapProtocolEvm integration (manual, requires fork)', () => {
  let provider
  let protocol

  beforeAll(() => {
    const forkUrl = process.env.FORK_RPC_URL
    if (forkUrl) {
      provider = new ethers.JsonRpcProvider(forkUrl)
    } else {
      // Default: local hardhat fork
      provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
    }
  })

  test('quote exact input against mainnet fork', async () => {
    // Read-only account from provider
    const account = {
      getAddress: async () => '0x0000000000000000000000000000000000000001',
      _account: { provider }
    }

    protocol = new UniswapProtocolEvm(account, { chainId: 1 })

    const quote = await protocol.quoteSwap({
      tokenIn: USDC,
      tokenOut: WETH,
      tokenInAmount: 1000000n // 1 USDC
    })

    console.log('Quote result:', quote)
    expect(quote.tokenOutAmount).toBeGreaterThan(0n)
    expect(typeof quote.tokenOutAmount).toBe('bigint')
  })

  test('quote exact output against mainnet fork', async () => {
    const account = {
      getAddress: async () => '0x0000000000000000000000000000000000000001',
      _account: { provider }
    }

    protocol = new UniswapProtocolEvm(account, { chainId: 1 })

    const quote = await protocol.quoteSwap({
      tokenIn: USDC,
      tokenOut: WETH,
      tokenOutAmount: ethers.parseEther('0.001') // 0.001 WETH
    })

    console.log('Quote result:', quote)
    expect(quote.tokenInAmount).toBeGreaterThan(0n)
    expect(typeof quote.tokenInAmount).toBe('bigint')
  })
})
