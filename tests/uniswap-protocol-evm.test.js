import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { ethers } from 'ethers'
import UniswapProtocolEvm from '../index.js'

// ── Test Helpers ───────────────────────────────────────────────────────────────

const TOKEN_IN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
const TOKEN_OUT = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
const ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890'

/**
 * Encodes a uint256 value for ethers ABI decoding.
 * @param {bigint | number} value
 * @returns {string}
 */
function encodeUint256 (value) {
  return ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [value])
}

/**
 * Creates a mock ethers Provider with useful defaults.
 * @param {object} [overrides]
 * @returns {object}
 */
function createMockProvider (overrides = {}) {
  return {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1n }),
    call: jest.fn().mockResolvedValue(encodeUint256(1000000000000000000000000n)),
    estimateGas: jest.fn().mockResolvedValue(50000n),
    getFeeData: jest.fn().mockResolvedValue({ gasPrice: 10n }),
    ...overrides
  }
}

/**
 * Creates a mock read-only wallet account.
 * @param {object} [providerOverrides]
 * @returns {object}
 */
function createMockReadOnlyAccount (providerOverrides = {}) {
  return {
    getAddress: jest.fn().mockResolvedValue(ACCOUNT_ADDRESS),
    getTokenBalance: jest.fn().mockResolvedValue(1000000n),
    getBalance: jest.fn().mockResolvedValue(1000000000000000000n),
    getTransactionReceipt: jest.fn().mockResolvedValue(null),
    quoteSendTransaction: jest.fn().mockResolvedValue({ fee: 0n }),
    quoteTransfer: jest.fn().mockResolvedValue({ fee: 0n }),
    verify: jest.fn().mockResolvedValue(true),
    _account: {
      provider: createMockProvider(providerOverrides)
    }
  }
}

/**
 * Creates a mock full wallet account (supports write operations).
 * @param {object} [providerOverrides]
 * @returns {object}
 */
function createMockAccount (providerOverrides = {}) {
  const provider = createMockProvider(providerOverrides)
  return {
    getAddress: jest.fn().mockResolvedValue(ACCOUNT_ADDRESS),
    getTokenBalance: jest.fn().mockResolvedValue(1000000n),
    getBalance: jest.fn().mockResolvedValue(1000000000000000000n),
    getTransactionReceipt: jest.fn().mockResolvedValue(null),
    quoteSendTransaction: jest.fn().mockResolvedValue({ fee: 0n }),
    quoteTransfer: jest.fn().mockResolvedValue({ fee: 0n }),
    verify: jest.fn().mockResolvedValue(true),
    sendTransaction: jest.fn().mockResolvedValue({ hash: '0xabc123', fee: 100000n }),
    sign: jest.fn().mockResolvedValue('0xsig'),
    signTransaction: jest.fn().mockResolvedValue('0xtx'),
    transfer: jest.fn().mockResolvedValue({ hash: '0xdef', fee: 50000n }),
    toReadOnlyAccount: jest.fn(),
    dispose: jest.fn(),
    _account: {
      provider,
      getAddress: jest.fn().mockResolvedValue(ACCOUNT_ADDRESS)
    }
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UniswapProtocolEvm', () => {
  describe('constructor', () => {
    test('sets default addresses', () => {
      const account = createMockReadOnlyAccount()
      const protocol = new UniswapProtocolEvm(account)

      expect(protocol._swapRouterAddress).toBe('0xE592427A0AEce92De3Edee1F18E0157C05861564')
      expect(protocol._quoterAddress).toBe('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6')
      expect(protocol._chainId).toBe(1)
      expect(protocol._feeTier).toBe(3000)
    })

    test('accepts custom config', () => {
      const account = createMockReadOnlyAccount()
      const customRouter = '0x1111111111111111111111111111111111111111'
      const customQuoter = '0x2222222222222222222222222222222222222222'

      const protocol = new UniswapProtocolEvm(account, {
        swapRouter: customRouter,
        quoter: customQuoter,
        chainId: 137,
        feeTier: 100,
        swapMaxFee: 500n
      })

      expect(protocol._swapRouterAddress).toBe(customRouter)
      expect(protocol._quoterAddress).toBe(customQuoter)
      expect(protocol._chainId).toBe(137)
      expect(protocol._feeTier).toBe(100)
      expect(protocol._config.swapMaxFee).toBe(500n)
    })
  })

  describe('quoteSwap', () => {
    test('returns quote for exact input swap', async () => {
      // Mock the quoter to return 500000 tokenOut for 1000000 tokenIn
      const mockProvider = createMockProvider({
        call: jest.fn().mockResolvedValue(encodeUint256(500000n))
      })
      const account = createMockReadOnlyAccount({ call: mockProvider.call })
      const protocol = new UniswapProtocolEvm(account)

      const quote = await protocol.quoteSwap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })

      expect(quote.tokenInAmount).toBe(1000000n)
      expect(quote.tokenOutAmount).toBe(500000n)
      expect(quote.fee).toBe(0n)
      expect(quote.hash).toBeUndefined()
    })

    test('returns quote for exact output swap', async () => {
      // Mock the quoter to return 2000000 tokenIn needed for 1000000 tokenOut
      const mockProvider = createMockProvider({
        call: jest.fn().mockResolvedValue(encodeUint256(2000000n))
      })
      const account = createMockReadOnlyAccount({ call: mockProvider.call })
      const protocol = new UniswapProtocolEvm(account)

      const quote = await protocol.quoteSwap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenOutAmount: 1000000n
      })

      expect(quote.tokenInAmount).toBe(2000000n)
      expect(quote.tokenOutAmount).toBe(1000000n)
      expect(quote.fee).toBe(0n)
      expect(quote.hash).toBeUndefined()
    })

    test('works with read-only account', async () => {
      const account = createMockReadOnlyAccount()
      const protocol = new UniswapProtocolEvm(account)

      const quote = await protocol.quoteSwap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })

      // Should return a valid quote without needing a signer
      expect(quote.tokenInAmount).toBe(1000000n)
      expect(typeof quote.tokenOutAmount).toBe('bigint')
    })

    test('throws if account is not connected to a provider', async () => {
      const account = {
        getAddress: jest.fn().mockResolvedValue(ACCOUNT_ADDRESS),
        _account: {} // no provider
      }

      const protocol = new UniswapProtocolEvm(account)

      await expect(protocol.quoteSwap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })).rejects.toThrow('UniswapV3: account is not connected to a provider')
    })
  })

  describe('swap', () => {
    test('successfully executes exact input swap', async () => {
      const account = createMockAccount()
      const protocol = new UniswapProtocolEvm(account)

      const result = await protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })

      expect(result.hash).toBe('0xabc123')
      expect(result.fee).toBe(100000n)
      expect(result.tokenInAmount).toBe(1000000n)
      expect(typeof result.tokenOutAmount).toBe('bigint')
    })

    test('successfully executes exact output swap', async () => {
      const account = createMockAccount()
      const protocol = new UniswapProtocolEvm(account)

      const result = await protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenOutAmount: 1000000n
      })

      expect(result.hash).toBe('0xabc123')
      expect(result.fee).toBe(100000n)
      expect(result.tokenOutAmount).toBe(1000000n)
      expect(typeof result.tokenInAmount).toBe('bigint')
    })

    test('fails when fee exceeds swapMaxFee', async () => {
      // Mock a high gas estimate that exceeds swapMaxFee
      const mockProvider = createMockProvider({
        estimateGas: jest.fn().mockResolvedValue(50000000n), // high gas
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: 10n }) // 500M wei fee
      })
      const account = createMockAccount({
        estimateGas: mockProvider.estimateGas,
        getFeeData: mockProvider.getFeeData
      })
      const protocol = new UniswapProtocolEvm(account, { swapMaxFee: 50n })

      await expect(protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })).rejects.toThrow('UniswapV3: swap fee')
    })

    test('throws if account does not support write operations', async () => {
      // Account without _account (no signer)
      const account = {
        getAddress: jest.fn().mockResolvedValue(ACCOUNT_ADDRESS)
        // no _account property
      }

      const protocol = new UniswapProtocolEvm(account)

      await expect(protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })).rejects.toThrow('UniswapV3: account does not support write operations')
    })

    test('throws if account is not connected to a provider', async () => {
      // Account with _account but no provider
      const account = {
        getAddress: jest.fn().mockResolvedValue(ACCOUNT_ADDRESS),
        sendTransaction: jest.fn(),
        _account: {} // no provider
      }

      const protocol = new UniswapProtocolEvm(account)

      await expect(protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })).rejects.toThrow('UniswapV3: account is not connected to a provider')
    })
  })

  describe('_getProvider and _getSigner', () => {
    test('_getProvider returns provider from account', () => {
      const provider = createMockProvider()
      const account = { _account: { provider } }
      const protocol = new UniswapProtocolEvm(account)

      expect(protocol._getProvider()).toBe(provider)
    })

    test('_getProvider returns null when account has no _account', () => {
      const account = {}
      const protocol = new UniswapProtocolEvm(account)

      expect(protocol._getProvider()).toBeNull()
    })

    test('_getSigner returns signer from account', () => {
      const signer = { provider: createMockProvider() }
      const account = { _account: signer }
      const protocol = new UniswapProtocolEvm(account)

      expect(protocol._getSigner()).toBe(signer)
    })

    test('_getSigner returns null when account has no _account', () => {
      const account = {}
      const protocol = new UniswapProtocolEvm(account)

      expect(protocol._getSigner()).toBeNull()
    })
  })

  describe('V2 path (chainId=11155111)', () => {
    test('quoteSwap exactInput with V2 path', async () => {
      const amount = 500000n
      const gasEstimate = 100000n
      const encodedResult = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint160[]', 'uint32[]', 'uint256'],
        [amount, [], [], gasEstimate]
      )

      const mockProvider = createMockProvider({
        call: jest.fn().mockResolvedValue(encodedResult)
      })
      const account = createMockReadOnlyAccount({ call: mockProvider.call })
      const protocol = new UniswapProtocolEvm(account, { chainId: 11155111 })

      const quote = await protocol.quoteSwap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })

      expect(quote.tokenInAmount).toBe(1000000n)
      expect(quote.tokenOutAmount).toBe(amount)
      expect(quote.fee).toBe(0n)
      expect(quote.hash).toBeUndefined()
    })

    test('quoteSwap exactOutput with V2 path', async () => {
      const amountIn = 2000000n
      const gasEstimate = 100000n
      const encodedResult = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint160[]', 'uint32[]', 'uint256'],
        [amountIn, [], [], gasEstimate]
      )

      const mockProvider = createMockProvider({
        call: jest.fn().mockResolvedValue(encodedResult)
      })
      const account = createMockReadOnlyAccount({ call: mockProvider.call })
      const protocol = new UniswapProtocolEvm(account, { chainId: 11155111 })

      const quote = await protocol.quoteSwap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenOutAmount: 1000000n
      })

      expect(quote.tokenInAmount).toBe(amountIn)
      expect(quote.tokenOutAmount).toBe(1000000n)
      expect(quote.fee).toBe(0n)
      expect(quote.hash).toBeUndefined()
    })

    test('swap exactInput with V2 path', async () => {
      const amount = 500000n
      const gasEstimate = 100000n
      const encodedResult = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint160[]', 'uint32[]', 'uint256'],
        [amount, [], [], gasEstimate]
      )

      // Return tuple for quoter call, then large allowance for ERC20 check
      const callMock = jest.fn()
        .mockResolvedValueOnce(encodedResult)
        .mockResolvedValue(encodeUint256(1000000000000000000000000n))

      const mockProvider = createMockProvider({
        call: callMock
      })
      const account = createMockAccount({ call: mockProvider.call })
      const protocol = new UniswapProtocolEvm(account, { chainId: 11155111 })

      const result = await protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenInAmount: 1000000n
      })

      expect(result.hash).toBe('0xabc123')
      expect(result.fee).toBe(100000n)
      expect(result.tokenInAmount).toBe(1000000n)
      expect(result.tokenOutAmount).toBe(amount)

      // Verify the swap params pass through correctly
      expect(callMock).toHaveBeenCalled()
    })

    test('swap exactOutput with V2 path', async () => {
      const amountIn = 2000000n
      const gasEstimate = 100000n
      const encodedResult = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint160[]', 'uint32[]', 'uint256'],
        [amountIn, [], [], gasEstimate]
      )

      // Return tuple for quoter call, then large allowance for ERC20 check
      const callMock = jest.fn()
        .mockResolvedValueOnce(encodedResult)
        .mockResolvedValue(encodeUint256(1000000000000000000000000n))

      const mockProvider = createMockProvider({
        call: callMock
      })
      const account = createMockAccount({ call: mockProvider.call })
      const protocol = new UniswapProtocolEvm(account, { chainId: 11155111 })

      const result = await protocol.swap({
        tokenIn: TOKEN_IN,
        tokenOut: TOKEN_OUT,
        tokenOutAmount: 1000000n
      })

      expect(result.hash).toBe('0xabc123')
      expect(result.fee).toBe(100000n)
      expect(result.tokenOutAmount).toBe(1000000n)
      expect(result.tokenInAmount).toBe(amountIn)

      // Verify the swap params pass through correctly
      expect(callMock).toHaveBeenCalled()
    })
  })
})
