// MiniPay Detection and Integration Utilities

export interface MiniPayProvider {
  isMiniPay: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: MiniPayProvider & {
      isMetaMask?: boolean;
    };
  }
}

/**
 * Detect if the app is running inside MiniPay browser
 */
export const isMiniPayEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for MiniPay-specific provider
  const provider = window.ethereum;
  if (provider?.isMiniPay) return true;
  
  // Check user agent for Opera Mini/MiniPay
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('minipay') || userAgent.includes('opera mini')) return true;
  
  // Check for Celo-specific properties
  if (provider && !provider.isMetaMask) {
    // Additional heuristics for MiniPay detection
    return true;
  }
  
  return false;
};

/**
 * Get MiniPay provider if available
 */
export const getMiniPayProvider = (): MiniPayProvider | null => {
  if (typeof window === 'undefined') return null;
  
  const provider = window.ethereum;
  if (provider?.isMiniPay) return provider;
  
  return null;
};

/**
 * Request account access from MiniPay
 */
export const connectMiniPay = async (): Promise<string | null> => {
  const provider = getMiniPayProvider();
  if (!provider) return null;
  
  try {
    const accounts = await provider.request({ 
      method: 'eth_requestAccounts' 
    }) as string[];
    
    return accounts[0] || null;
  } catch (error) {
    console.error('Failed to connect to MiniPay:', error);
    return null;
  }
};

/**
 * Get current connected account
 */
export const getMiniPayAccount = async (): Promise<string | null> => {
  const provider = getMiniPayProvider();
  if (!provider) return null;
  
  try {
    const accounts = await provider.request({ 
      method: 'eth_accounts' 
    }) as string[];
    
    return accounts[0] || null;
  } catch (error) {
    console.error('Failed to get MiniPay accounts:', error);
    return null;
  }
};

/**
 * Get cUSD balance from MiniPay wallet
 */
export const getMiniPayCUSDBalance = async (address: string): Promise<string> => {
  const provider = getMiniPayProvider();
  if (!provider) return '0';
  
  try {
    // cUSD contract address on Celo mainnet
    const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
    
    // ERC20 balanceOf call
    const data = `0x70a08231000000000000000000000000${address.slice(2)}`;
    
    const balance = await provider.request({
      method: 'eth_call',
      params: [{ to: CUSD_ADDRESS, data }, 'latest']
    }) as string;
    
    // Convert from hex to decimal and format
    const balanceWei = BigInt(balance);
    const balanceFormatted = Number(balanceWei) / 1e18;
    
    return balanceFormatted.toFixed(2);
  } catch (error) {
    console.error('Failed to get cUSD balance:', error);
    return '0';
  }
};

/**
 * Send cUSD payment via MiniPay
 */
export const sendCUSDViaMiniPay = async (
  toAddress: string, 
  amountInCUSD: number
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  const provider = getMiniPayProvider();
  if (!provider) {
    return { success: false, error: 'MiniPay not available' };
  }
  
  try {
    const fromAddress = await getMiniPayAccount();
    if (!fromAddress) {
      return { success: false, error: 'No connected account' };
    }
    
    // cUSD contract address on Celo mainnet
    const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
    
    // Convert amount to wei (18 decimals)
    const amountWei = BigInt(Math.floor(amountInCUSD * 1e18));
    const amountHex = '0x' + amountWei.toString(16).padStart(64, '0');
    
    // ERC20 transfer function signature + params
    const transferData = `0xa9059cbb000000000000000000000000${toAddress.slice(2)}${amountHex.slice(2)}`;
    
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: fromAddress,
        to: CUSD_ADDRESS,
        data: transferData,
        gas: '0x30d40' // 200000 gas limit
      }]
    }) as string;
    
    return { success: true, txHash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    console.error('MiniPay transaction failed:', error);
    return { success: false, error: errorMessage };
  }
};

/**
 * MiniPay-optimized transaction for deposits
 */
export const depositViaMiniPay = async (
  masterWalletAddress: string,
  amountInNGN: number,
  exchangeRate: number = 1600 // NGN per cUSD
): Promise<{ success: boolean; txHash?: string; ncAmount?: number; error?: string }> => {
  const amountInCUSD = amountInNGN / exchangeRate;
  
  const result = await sendCUSDViaMiniPay(masterWalletAddress, amountInCUSD);
  
  if (result.success) {
    return {
      ...result,
      ncAmount: amountInNGN // 1:1 NC to NGN
    };
  }
  
  return result;
};
