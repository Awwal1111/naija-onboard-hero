// MiniPay Detection and Integration Utilities using Viem
import { createWalletClient, custom, formatUnits, parseUnits, encodeFunctionData, type Hex } from 'viem';
import { celo } from 'viem/chains';

// ERC20 Transfer ABI
const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

// Contract addresses on Celo Mainnet
export const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const;
export const USDT_ADDRESS = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as const;
export const USDC_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as const;

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

/**
 * SYNCHRONOUS MiniPay detection - NO async operations
 * Safe to call during component initialization
 */
export const detectMiniPaySync = (): { isMiniPay: boolean; hasProvider: boolean } => {
  if (typeof window === 'undefined') {
    return { isMiniPay: false, hasProvider: false }
  }
  
  try {
    const hasProvider = !!window.ethereum
    
    // Primary check: MiniPay sets this flag
    if (window.ethereum?.isMiniPay === true) {
      return { isMiniPay: true, hasProvider: true }
    }
    
    // Secondary check: User agent contains minipay or opera mini
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('minipay') || userAgent.includes('opera mini')) {
      return { isMiniPay: true, hasProvider }
    }
    
    // Tertiary check: Has ethereum but not MetaMask (likely MiniPay) on mobile
    if (window.ethereum && !window.ethereum.isMetaMask) {
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
      if (isMobile) {
        return { isMiniPay: true, hasProvider: true }
      }
    }
    
    return { isMiniPay: false, hasProvider }
  } catch {
    return { isMiniPay: false, hasProvider: false }
  }
}

/**
 * Detect if the app is running inside MiniPay browser
 * MiniPay injects window.ethereum with isMiniPay = true
 * @deprecated Use detectMiniPaySync for initialization
 */
export const isMiniPayEnvironment = (): boolean => {
  return detectMiniPaySync().isMiniPay
};

/**
 * Check if wallet provider exists (window.ethereum)
 */
export const hasWalletProvider = (): boolean => {
  return detectMiniPaySync().hasProvider
};

/**
 * Create viem wallet client for MiniPay/Celo
 */
export const createMiniPayWalletClient = () => {
  if (!window.ethereum) return null;
  
  return createWalletClient({
    chain: celo,
    transport: custom(window.ethereum)
  });
};

/**
 * Get connected wallet address using viem
 * In MiniPay, the wallet is auto-connected
 * NOTE: This is an ASYNC function - only call on user action!
 */
export const getMiniPayAccount = async (): Promise<string | null> => {
  try {
    const client = createMiniPayWalletClient();
    if (!client) return null;
    
    const addresses = await client.getAddresses();
    return addresses[0] || null;
  } catch (error) {
    console.error('[MiniPay] Failed to get account:', error);
    return null;
  }
};

/**
 * Request account access (for non-MiniPay environments)
 * NOTE: This is an ASYNC function - only call on user action!
 */
export const connectMiniPay = async (): Promise<string | null> => {
  if (!window.ethereum) return null;
  
  try {
    // Request accounts - in MiniPay this returns immediately
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    }) as string[];
    
    return accounts[0] || null;
  } catch (error) {
    console.error('[MiniPay] Failed to connect:', error);
    return null;
  }
};

/**
 * Get cUSD balance for an address using raw eth_call
 */
export const getMiniPayCUSDBalance = async (address: string): Promise<string> => {
  if (!window.ethereum) return '0';
  
  try {
    // balanceOf(address) function selector + padded address
    const data = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
    
    const balance = await window.ethereum.request({
      method: 'eth_call',
      params: [{ to: CUSD_ADDRESS, data }, 'latest']
    }) as string;
    
    const balanceWei = BigInt(balance);
    return formatUnits(balanceWei, 18);
  } catch (error) {
    console.error('[MiniPay] Failed to get cUSD balance:', error);
    return '0';
  }
};

/**
 * Get USDT balance for an address
 */
export const getMiniPayUSDTBalance = async (address: string): Promise<string> => {
  if (!window.ethereum) return '0';
  
  try {
    const data = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
    
    const balance = await window.ethereum.request({
      method: 'eth_call',
      params: [{ to: USDT_ADDRESS, data }, 'latest']
    }) as string;
    
    const balanceWei = BigInt(balance);
    return formatUnits(balanceWei, 6); // USDT has 6 decimals
  } catch (error) {
    console.error('[MiniPay] Failed to get USDT balance:', error);
    return '0';
  }
};

/**
 * Send cUSD payment via MiniPay using viem
 */
export const sendCUSDViaMiniPay = async (
  toAddress: string, 
  amountInCUSD: number
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  if (!window.ethereum) {
    return { success: false, error: 'Wallet not available' };
  }
  
  try {
    // Get connected account
    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' 
    }) as string[];
    
    const fromAddress = accounts[0];
    if (!fromAddress) {
      return { success: false, error: 'No connected account' };
    }
    
    // Encode the transfer function call
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [
        toAddress as `0x${string}`,
        parseUnits(amountInCUSD.toString(), 18)
      ]
    });
    
    // Send legacy transaction (MiniPay only supports legacy)
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: fromAddress,
        to: CUSD_ADDRESS,
        data,
        gas: '0x30d40' // 200000 gas limit
      }]
    }) as string;
    
    return { success: true, txHash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    console.error('[MiniPay] cUSD Transaction failed:', error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Send USDT payment via MiniPay
 */
export const sendUSDTViaMiniPay = async (
  toAddress: string, 
  amountInUSDT: number
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  if (!window.ethereum) {
    return { success: false, error: 'Wallet not available' };
  }
  
  try {
    // Get connected account
    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' 
    }) as string[];
    
    const fromAddress = accounts[0];
    if (!fromAddress) {
      return { success: false, error: 'No connected account' };
    }
    
    // Encode the transfer function call - USDT has 6 decimals
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [
        toAddress as `0x${string}`,
        parseUnits(amountInUSDT.toString(), 6)
      ]
    });
    
    // Send legacy transaction (MiniPay only supports legacy)
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: fromAddress,
        to: USDT_ADDRESS,
        data,
        gas: '0x30d40' // 200000 gas limit
      }]
    }) as string;
    
    return { success: true, txHash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    console.error('[MiniPay] USDT Transaction failed:', error);
    return { success: false, error: errorMessage };
  }
};

/**
 * MiniPay-optimized transaction for deposits (sends to user wallet, not master)
 */
export const depositViaMiniPay = async (
  userWalletAddress: string,
  amountInNGN: number,
  exchangeRate: number = 1600, // NGN per USD
  token: 'cusd' | 'usdt' = 'cusd'
): Promise<{ success: boolean; txHash?: string; ncAmount?: number; error?: string }> => {
  const amountInStable = amountInNGN / exchangeRate;
  
  let result;
  if (token === 'usdt') {
    result = await sendUSDTViaMiniPay(userWalletAddress, amountInStable);
  } else {
    result = await sendCUSDViaMiniPay(userWalletAddress, amountInStable);
  }
  
  if (result.success) {
    return {
      ...result,
      ncAmount: amountInNGN // 1:1 NC to NGN
    };
  }
  
  return result;
};