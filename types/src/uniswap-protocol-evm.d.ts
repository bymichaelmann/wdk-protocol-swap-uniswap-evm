/**
 * @typedef {Object} UniswapProtocolConfig
 * @property {number | bigint} [swapMaxFee] - The maximum fee amount for swap operations.
 * @property {number} [chainId] - The EVM chain ID (default: 1 = Ethereum mainnet).
 * @property {string} [swapRouter] - The Uniswap V3 SwapRouter address.
 * @property {string} [quoter] - The Uniswap V3 Quoter address.
 * @property {number} [feeTier] - The Uniswap V3 pool fee tier (default: 3000 = 0.30%).
 * @property {number} [slippageBps] - Slippage tolerance in basis points (default: 0). 50 = 0.5%.
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
    constructor(account: IWalletAccountReadOnly, config?: UniswapProtocolConfig);
    /**
     * Creates a new interface to the uniswap protocol for the evm blockchain.
     *
     * @overload
     * @param {IWalletAccount} account - The wallet account to use to interact with the protocol.
     * @param {UniswapProtocolConfig} [config] - The uniswap protocol configuration.
     */
    constructor(account: IWalletAccount, config?: UniswapProtocolConfig);
    /** @protected @type {number} */
    protected _chainId: number;
    /** @protected @type {string} */
    protected _swapRouterAddress: string;
    /** @protected @type {string} */
    protected _quoterAddress: string;
    /** @protected @type {string} */
    protected _quoterAddressV2: string;
    /** @protected @type {string} */
    protected _swapRouterAddress02: string;
    /** @protected @type {boolean} */
    protected _useV2: boolean;
    /** @protected @type {number} */
    protected _feeTier: number;
    /** @protected @type {number} */
    protected _slippageBps: number;
    /** @protected @type {string} */
    protected _wethAddress: string;
    /**
     * Returns the ethers provider from the underlying wallet account.
     *
     * @protected
     * @returns {import('ethers').Provider | null}
     */
    protected _getProvider(): import("ethers").Provider | null;
    /**
     * Returns the ethers signer from the underlying wallet account for write operations.
     *
     * @protected
     * @returns {import('ethers').Signer | null}
     */
    protected _getSigner(): import("ethers").Signer | null;
    /**
     * Creates an ethers Contract instance for an ERC-20 token.
     *
     * @protected
     * @param {string} tokenAddress - The ERC-20 token address.
     * @param {import('ethers').Signer | import('ethers').Provider} [runner] - The signer or provider.
     * @returns {import('ethers').Contract}
     */
    protected _getERC20Contract(tokenAddress: string, runner?: import("ethers").Signer | import("ethers").Provider): import("ethers").Contract;
    /**
     * Creates an ethers Contract instance for the Uniswap V3 SwapRouter.
     *
     * @protected
     * @param {import('ethers').Signer} [signer] - The signer to use for write operations.
     * @param {boolean} [useV2=false] - Use the SwapRouter02 ABI and address.
     * @returns {import('ethers').Contract}
     */
    protected _getSwapRouter(signer?: import("ethers").Signer, useV2?: boolean): import("ethers").Contract;
    /**
     * Creates an ethers Contract instance for the Uniswap V3 Quoter.
     *
     * @protected
     * @param {import('ethers').Provider} [provider] - The provider to use for reading.
     * @param {boolean} [useV2=false] - Use the QuoterV2 ABI and address.
     * @returns {import('ethers').Contract}
     */
    protected _getQuoter(provider?: import("ethers").Provider, useV2?: boolean): import("ethers").Contract;
    /**
     * Returns the deadline timestamp (30 minutes from now).
     *
     * @protected
     * @returns {number}
     */
    protected _getDeadline(): number;
    /**
     * Estimates the total gas cost for a swap transaction.
     *
     * @protected
     * @param {{ to: string, value: bigint, data: string }} tx - The transaction to estimate.
     * @returns {Promise<bigint>} The estimated fee in wei.
     */
    protected _estimateFee(tx: {
        to: string;
        value: bigint;
        data: string;
    }): Promise<bigint>;
}
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type IWalletAccountReadOnly = import("@tetherto/wdk-wallet").IWalletAccountReadOnly;
export type SwapOptions = import("@tetherto/wdk-wallet/protocols").SwapOptions;
export type SwapResult = import("@tetherto/wdk-wallet/protocols").SwapResult;
export type UniswapProtocolConfig = {
    /**
     * - The maximum fee amount for swap operations.
     */
    swapMaxFee?: number | bigint;
    /**
     * - The EVM chain ID (default: 1 = Ethereum mainnet).
     */
    chainId?: number;
    /**
     * - The Uniswap V3 SwapRouter address.
     */
    swapRouter?: string;
    /**
     * - The Uniswap V3 Quoter address.
     */
    quoter?: string;
    /**
     * - The Uniswap V3 pool fee tier (default: 3000 = 0.30%).
     */
    feeTier?: number;
    /**
     * - Slippage tolerance in basis points (default: 0). 50 = 0.5%.
     */
    slippageBps?: number;
    /**
     * - Read-only flag indicating whether V2 ABIs are active.
     */
    _useV2?: boolean;
};
import { SwapProtocol } from '@tetherto/wdk-wallet/protocols';
