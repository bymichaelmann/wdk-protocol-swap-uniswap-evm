// Copyright 2026 Michael Mann <michaelmann@murena.io>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import { ethers } from 'ethers'
import { SwapProtocol } from '@tetherto/wdk-wallet/protocols'

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */
/** @typedef {import('@tetherto/wdk-wallet').IWalletAccountReadOnly} IWalletAccountReadOnly */

/** @typedef {import('@tetherto/wdk-wallet/protocols').SwapOptions} SwapOptions */
/** @typedef {import('@tetherto/wdk-wallet/protocols').SwapResult} SwapResult */

// ── Uniswap V3 Contract Addresses ──────────────────────────────────────────────

/**
 * @type {Record<number, string>}
 */
const WETH_ADDRESSES = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum Mainnet
  5: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', // Goerli
  10: '0x4200000000000000000000000000000000000006', // Optimism
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // Polygon
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
  11155111: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14' // Sepolia
}

/**
 * @type {Record<number, string>}
 */
const QUOTER_V2_ADDRESSES = {
  1: '0x61fFE014bA17989E743c5F6cE21bF9697530B21e',
  11155111: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
}

/**
 * @type {Record<number, string>}
 */
const SWAP_ROUTER_02_ADDRESSES = {
  1: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  11155111: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'
}

/** @type {Set<number>} */
const USE_V2_CHAIN_IDS = new Set([5, 11155111])

const DEFAULT_SWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const DEFAULT_QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
const DEFAULT_CHAIN_ID = 1
const DEFAULT_FEE_TIER = 3000 // 0.30%

// ── Contract ABIs ──────────────────────────────────────────────────────────────

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountIn)'
]

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
  'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)'
]

const SWAP_ROUTER_02_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountIn)'
]

const QUOTER_V2_ABI = [
  'function quoteExactInput(bytes path, uint256 amountIn) external view returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)',
  'function quoteExactOutput(bytes path, uint256 amountOut) external view returns (uint256 amountIn, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)'
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)'
]

/**
 * @typedef {Object} UniswapProtocolConfig
 * @property {number | bigint} [swapMaxFee] - The maximum fee amount for swap operations.
 * @property {number} [chainId] - The EVM chain ID (default: 1 = Ethereum mainnet).
 * @property {string} [swapRouter] - The Uniswap V3 SwapRouter address.
 * @property {string} [quoter] - The Uniswap V3 Quoter address.
 * @property {number} [feeTier] - The Uniswap V3 pool fee tier (default: 3000 = 0.30%).
 * @property {boolean} [_useV2] - Read-only flag indicating whether V2 ABIs are active.
 */

export default class UniswapProtocolEvm extends SwapProtocol {
  /**
   * Creates a new read-only interface to the uniswap protocol for the evm blockchain.
   *
   * @overload
   * @param {IWalletAccountReadOnly} account - The wallet account to use to interact with the protocol.
   * @param {UniswapProtocolConfig} [config] - The uniswap protocol configuration.
   */

  /**
   * Creates a new interface to the uniswap protocol for the evm blockchain.
   *
   * @overload
   * @param {IWalletAccount} account - The wallet account to use to interact with the protocol.
   * @param {UniswapProtocolConfig} [config] - The uniswap protocol configuration.
   */
  constructor (account, config = {}) {
    super(account, config)

    /** @protected @type {UniswapProtocolConfig} */
    this._config = config

    /** @protected @type {number} */
    this._chainId = config.chainId ?? DEFAULT_CHAIN_ID

    /** @protected @type {string} */
    this._swapRouterAddress = config.swapRouter ?? DEFAULT_SWAP_ROUTER

    /** @protected @type {string} */
    this._quoterAddress = config.quoter ?? DEFAULT_QUOTER

    /** @protected @type {string} */
    this._quoterAddressV2 = QUOTER_V2_ADDRESSES[this._chainId] ?? QUOTER_V2_ADDRESSES[1]

    /** @protected @type {string} */
    this._swapRouterAddress02 = SWAP_ROUTER_02_ADDRESSES[this._chainId] ?? SWAP_ROUTER_02_ADDRESSES[1]

    /** @protected @type {boolean} */
    this._useV2 = USE_V2_CHAIN_IDS.has(this._chainId)

    /** @protected @type {number} */
    this._feeTier = config.feeTier ?? DEFAULT_FEE_TIER

    /** @protected @type {string} */
    this._wethAddress = WETH_ADDRESSES[this._chainId] ?? ''
  }

  // ── Internal Helpers ─────────────────────────────────────────────────────────

  /**
   * Returns the ethers provider from the underlying wallet account.
   *
   * @protected
   * @returns {import('ethers').Provider | null}
   */
  _getProvider () {
    try {
      return this._account?._account?.provider ?? null
    } catch {
      return null
    }
  }

  /**
   * Returns the ethers signer from the underlying wallet account for write operations.
   *
   * @protected
   * @returns {import('ethers').Signer | null}
   */
  _getSigner () {
    try {
      return this._account?._account ?? null
    } catch {
      return null
    }
  }

  /**
   * Creates an ethers Contract instance for an ERC-20 token.
   *
   * @protected
   * @param {string} tokenAddress - The ERC-20 token address.
   * @param {import('ethers').Signer | import('ethers').Provider} [runner] - The signer or provider.
   * @returns {import('ethers').Contract}
   */
  _getERC20Contract (tokenAddress, runner) {
    const provider = runner ?? this._getProvider()
    return new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  }

  /**
   * Creates an ethers Contract instance for the Uniswap V3 SwapRouter.
   *
   * @protected
   * @param {import('ethers').Signer} [signer] - The signer to use for write operations.
   * @param {boolean} [useV2=false] - Use the SwapRouter02 ABI and address.
   * @returns {import('ethers').Contract}
   */
  _getSwapRouter (signer, useV2 = false) {
    const runner = signer ?? this._getSigner() ?? this._getProvider()
    if (useV2) {
      return new ethers.Contract(this._swapRouterAddress02, SWAP_ROUTER_02_ABI, runner)
    }
    return new ethers.Contract(this._swapRouterAddress, SWAP_ROUTER_ABI, runner)
  }

  /**
   * Creates an ethers Contract instance for the Uniswap V3 Quoter.
   *
   * @protected
   * @param {import('ethers').Provider} [provider] - The provider to use for reading.
   * @param {boolean} [useV2=false] - Use the QuoterV2 ABI and address.
   * @returns {import('ethers').Contract}
   */
  _getQuoter (provider, useV2 = false) {
    const runner = provider ?? this._getProvider()
    if (useV2) {
      return new ethers.Contract(this._quoterAddressV2, QUOTER_V2_ABI, runner)
    }
    return new ethers.Contract(this._quoterAddress, QUOTER_ABI, runner)
  }

  /**
   * Returns the deadline timestamp (30 minutes from now).
   *
   * @protected
   * @returns {number}
   */
  _getDeadline () {
    return Math.floor(Date.now() / 1000) + 1800
  }

  /**
   * Estimates the total gas cost for a swap transaction.
   *
   * @protected
   * @param {{ to: string, value: bigint, data: string }} tx - The transaction to estimate.
   * @returns {Promise<bigint>} The estimated fee in wei.
   */
  async _estimateFee (tx) {
    const provider = this._getProvider()
    if (!provider) {
      return 0n
    }

    try {
      const gasEstimate = await provider.estimateGas(tx)
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice ?? 0n
      return gasEstimate * gasPrice
    } catch {
      return 0n
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Quotes the costs of a swap operation.
   *
   * @param {SwapOptions} options - The swap's options.
   * @returns {Promise<Omit<SwapResult, 'hash'>>} The swap's quote.
   */
  async quoteSwap (options) {
    const provider = this._getProvider()
    if (!provider) {
      throw new Error('UniswapV3: account is not connected to a provider')
    }

    const { tokenIn, tokenOut } = options

    // Determine swap direction
    const isExactInput = options.tokenInAmount !== undefined && options.tokenInAmount !== null

    try {
      const quoter = this._getQuoter(provider, this._useV2)

      if (isExactInput) {
        // Sell exact amount of tokenIn → estimate tokenOut
        const amountIn = BigInt(options.tokenInAmount)

        let amountOut
        if (this._useV2) {
          const path = ethers.solidityPacked(['address', 'uint24', 'address'], [tokenIn, this._feeTier, tokenOut])
          const result = await quoter.quoteExactInput(path, amountIn)
          amountOut = result[0]
        } else {
          // QuoterV1 uses flat parameters
          amountOut = await quoter.quoteExactInputSingle.staticCall(
            tokenIn, tokenOut, this._feeTier, amountIn, 0
          )
        }

        return {
          fee: 0n,
          tokenInAmount: amountIn,
          tokenOutAmount: amountOut
        }
      } else {
        // Buy exact amount of tokenOut → estimate tokenIn needed
        const amountOut = BigInt(options.tokenOutAmount)

        let amountIn
        if (this._useV2) {
          const path = ethers.solidityPacked(['address', 'uint24', 'address'], [tokenIn, this._feeTier, tokenOut])
          const result = await quoter.quoteExactOutput(path, amountOut)
          amountIn = result[0]
        } else {
          // QuoterV1 uses flat parameters
          amountIn = await quoter.quoteExactOutputSingle.staticCall(
            tokenIn, tokenOut, this._feeTier, amountOut, 0
          )
        }

        return {
          fee: 0n,
          tokenInAmount: amountIn,
          tokenOutAmount: amountOut
        }
      }
    } catch (/** @type {any} */ err) {
      throw new Error(`UniswapV3: failed to get quote — ${err.message ?? err}`)
    }
  }

  /**
   * Swaps a pair of tokens.
   *
   * @param {SwapOptions} options - The swap's options.
   * @returns {Promise<SwapResult>} The swap's result.
   */
  async swap (options) {
    const signer = this._getSigner()
    if (!signer) {
      throw new Error('UniswapV3: account does not support write operations')
    }

    const provider = this._getProvider()
    if (!provider) {
      throw new Error('UniswapV3: account is not connected to a provider')
    }

    const { tokenIn, tokenOut } = options
    const isExactInput = options.tokenInAmount !== undefined && options.tokenInAmount !== null

    // 1. Get a quote to estimate the opposite amount
    const quote = await this.quoteSwap(options)
    let { tokenInAmount, tokenOutAmount } = quote

    // For exact output swaps, tokenInAmount from quote is the estimate needed
    // For exact input swaps, tokenOutAmount from quote is the estimate received
    if (isExactInput) {
      tokenInAmount = BigInt(options.tokenInAmount)
    } else {
      tokenOutAmount = BigInt(options.tokenOutAmount)
    }

    // 2. Resolve recipient
    const recipient = options.to ?? await this._account.getAddress()

    // 3. Build swap calldata
    const deadline = this._getDeadline()
    const router = this._getSwapRouter(signer, this._useV2)

    let calldata
    let amountMinimum

    if (isExactInput) {
      amountMinimum = 0n // accept any amount out (real apps should set a slippage tolerance)

      if (this._useV2) {
        // SwapRouter02 omits the deadline field
        calldata = router.interface.encodeFunctionData('exactInputSingle', [{
          tokenIn,
          tokenOut,
          fee: this._feeTier,
          recipient,
          amountIn: tokenInAmount,
          amountOutMinimum: amountMinimum,
          sqrtPriceLimitX96: 0
        }])
      } else {
        calldata = router.interface.encodeFunctionData('exactInputSingle', [{
          tokenIn,
          tokenOut,
          fee: this._feeTier,
          recipient,
          deadline,
          amountIn: tokenInAmount,
          amountOutMinimum: amountMinimum,
          sqrtPriceLimitX96: 0
        }])
      }
    } else {
      amountMinimum = 0n // accept any amount in (real apps should set a slippage tolerance)

      if (this._useV2) {
        // SwapRouter02 omits the deadline field
        calldata = router.interface.encodeFunctionData('exactOutputSingle', [{
          tokenIn,
          tokenOut,
          fee: this._feeTier,
          recipient,
          amountOut: tokenOutAmount,
          amountInMaximum: tokenInAmount,
          sqrtPriceLimitX96: 0
        }])
      } else {
        calldata = router.interface.encodeFunctionData('exactOutputSingle', [{
          tokenIn,
          tokenOut,
          fee: this._feeTier,
          recipient,
          deadline,
          amountOut: tokenOutAmount,
          amountInMaximum: tokenInAmount,
          sqrtPriceLimitX96: 0
        }])
      }
    }

    const tx = {
      to: this._useV2 ? this._swapRouterAddress02 : this._swapRouterAddress,
      value: 0n,
      data: calldata
    }

    // 4. Check swapMaxFee
    const swapMaxFee = this._config.swapMaxFee
    if (swapMaxFee !== undefined && swapMaxFee !== null) {
      const estimatedFee = await this._estimateFee(tx)
      if (estimatedFee > BigInt(swapMaxFee)) {
        throw new Error(`UniswapV3: swap fee (${estimatedFee}) exceeds max (${String(swapMaxFee)})`)
      }
    }

    // 5. Handle token approval for non-native tokens
    // Check if tokenIn is native ETH (zero address) — if so, skip approval
    const isNativeETH = tokenIn === '0x0000000000000000000000000000000000000000' ||
      (this._wethAddress && tokenIn.toLowerCase() === this._wethAddress.toLowerCase())

    if (!isNativeETH) {
      const owner = await this._account.getAddress()

      const routerAddress = this._useV2 ? this._swapRouterAddress02 : this._swapRouterAddress

      try {
        // Encode the allowance call and use provider.call() directly
        const erc20Interface = new ethers.Interface(ERC20_ABI)
        const allowanceData = erc20Interface.encodeFunctionData('allowance', [owner, routerAddress])
        const result = await provider.call({ to: tokenIn, data: allowanceData })
        const [allowance] = erc20Interface.decodeFunctionResult('allowance', result)

        if (allowance < tokenInAmount) {
          // Use signer-based contract for the approve transaction
          const signerContract = this._getERC20Contract(tokenIn, signer)
          const approveTx = await signerContract.approve(routerAddress, tokenInAmount)
          await approveTx.wait()
        }
      } catch (/** @type {any} */ err) {
        throw new Error(`UniswapV3: failed to approve token — ${err.message ?? err}`)
      }
    }

    // 6. Send the swap transaction
    let result
    try {
      result = await this._account.sendTransaction(tx)
    } catch (/** @type {any} */ err) {
      throw new Error(`UniswapV3: swap transaction failed — ${err.message ?? err}`)
    }

    // 7. Return result with actual amounts
    return {
      hash: result.hash,
      fee: result.fee,
      tokenInAmount,
      tokenOutAmount
    }
  }
}
