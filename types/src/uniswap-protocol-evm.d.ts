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
    /**
     * The uniswap protocol configuration.
     *
     * @protected
     * @type {UniswapProtocolConfig}
     */
    protected _config: UniswapProtocolConfig;
    /**
     * Swaps a pair of tokens.
     *
     * @param {SwapOptions} options - The swap's options.
     * @returns {Promise<SwapResult>} The swap's result.
     */
    swap(options: SwapOptions): Promise<SwapResult>;
    /**
     * Quotes the costs of a swap operation.
     *
     * @param {SwapOptions} options - The swap's options.
     * @returns {Promise<Omit<SwapResult, 'hash'>>} The swap's quote.
     */
    quoteSwap(options: SwapOptions): Promise<Omit<SwapResult, 'hash'>>;
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
};
import { SwapProtocol } from '@tetherto/wdk-wallet/protocols';
