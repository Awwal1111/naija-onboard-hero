import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';

const CELO_MAINNET_RPC = 'https://forno.celo.org';
const CELO_ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org'; // Testnet
const USE_TESTNET = false; // PRODUCTION: Using mainnet for real transactions

const RPC_URL = USE_TESTNET ? CELO_ALFAJORES_RPC : CELO_MAINNET_RPC;

const cUSD_ADDRESS = USE_TESTNET 
  ? '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' // Alfajores cUSD
  : '0x765DE816845861e75A25fCA122bb6898B8B1282a'; // Mainnet cUSD

export const useCeloWallet = () => {
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | ethers.Wallet | null>(null);
  const [address, setAddress] = useState<string>('');
  const [celoBalance, setCeloBalance] = useState<string>('0');
  const [cUsdBalance, setCUsdBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Check if wallet exists in localStorage
      const encryptedWallet = localStorage.getItem('celo_wallet');
      
      if (encryptedWallet) {
        try {
          // Decrypt and load wallet
          const password = await getOrCreatePassword();
          const decrypted = CryptoJS.AES.decrypt(encryptedWallet, password).toString(CryptoJS.enc.Utf8);
          
          if (!decrypted) {
            console.error('Failed to decrypt wallet, creating new one');
            await createNewWallet();
            return;
          }
          
          const walletData = JSON.parse(decrypted);
          
          if (!walletData.privateKey || !walletData.address) {
            console.error('Invalid wallet data, creating new one');
            await createNewWallet();
            return;
          }
          
          const walletInstance = new ethers.Wallet(walletData.privateKey, provider);
          console.log('✅ Loaded existing wallet:', walletInstance.address);
          setWallet(walletInstance);
          setAddress(walletInstance.address);
          
          // Ensure wallet address is saved to profile
          await saveWalletToProfile(walletInstance.address);
          
          await updateBalances(walletInstance);
        } catch (decryptError) {
          console.error('Error decrypting wallet, creating new one:', decryptError);
          // Clear corrupted data
          localStorage.removeItem('celo_wallet');
          await createNewWallet();
        }
      } else {
        // Create new wallet
        console.log('No existing wallet found, creating new one');
        await createNewWallet();
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      toast.error('Failed to initialize wallet');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreatePassword = async (): Promise<string> => {
    // In production, this should use user's PIN or password
    // For now, using a device-specific identifier
    let password = localStorage.getItem('wallet_key');
    if (!password) {
      password = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('wallet_key', password);
    }
    return password;
  };

  const createNewWallet = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const newWallet = ethers.Wallet.createRandom(provider);
      
      console.log('🔑 Creating new wallet:', newWallet.address);
      
      // Encrypt and save
      const password = await getOrCreatePassword();
      const walletData = {
        address: newWallet.address,
        privateKey: newWallet.privateKey
      };
      
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(walletData),
        password
      ).toString();
      
      localStorage.setItem('celo_wallet', encrypted);
      console.log('💾 Wallet encrypted and saved to localStorage');
      
      setWallet(newWallet);
      setAddress(newWallet.address);
      
      await updateBalances(newWallet);
      
      // Save wallet address to profile - CRITICAL for deposits to work
      await saveWalletToProfile(newWallet.address);
      
      toast.success('New Celo wallet created on Mainnet!');
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error('Failed to create wallet');
    }
  };

  const saveWalletToProfile = async (walletAddress: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ Cannot save wallet: User not authenticated');
        return;
      }

      console.log(`💾 Calling create-user-wallet edge function for user ${user.id}`);

      // Call the edge function to create user wallet with encryption
      const { data, error } = await supabase.functions.invoke('create-user-wallet', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('❌ Error calling create-user-wallet:', error);
        toast.error('Failed to initialize secure wallet');
        return;
      }

      if (data?.success) {
        console.log('✅ User wallet created successfully:', data.address);
        console.log(`[WALLET_CREATED] User: ${user.id}, Address: ${data.address}`);
        
        // Update local address if different
        if (data.address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.log('⚠️ Server-side wallet address differs from local, syncing...');
          setAddress(data.address);
        }
      }
    } catch (error) {
      console.error('❌ Error in saveWalletToProfile:', error);
      toast.error('Failed to initialize secure wallet');
    }
  };

  const updateBalances = async (walletInstance: ethers.HDNodeWallet | ethers.Wallet) => {
    try {
      // Get CELO balance
      const celoBalance = await walletInstance.provider!.getBalance(walletInstance.address);
      setCeloBalance(ethers.formatEther(celoBalance));

      // Get cUSD balance
      const cUsdContract = new ethers.Contract(
        cUSD_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        walletInstance.provider
      );
      
      const cUsdBalance = await cUsdContract.balanceOf(walletInstance.address);
      setCUsdBalance(ethers.formatEther(cUsdBalance));
    } catch (error) {
      console.error('Error updating balances:', error);
    }
  };

  const sendCUSD = async (toAddress: string, amount: string) => {
    if (!wallet) throw new Error('Wallet not initialized');

    try {
      const cUsdContract = new ethers.Contract(
        cUSD_ADDRESS,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function balanceOf(address) view returns (uint256)'
        ],
        wallet
      );

      const amountInWei = ethers.parseEther(amount);
      
      // Check balance
      const balance = await cUsdContract.balanceOf(wallet.address);
      if (balance < amountInWei) {
        throw new Error('Insufficient cUSD balance');
      }

      const tx = await cUsdContract.transfer(toAddress, amountInWei);
      toast.info('Transaction submitted, waiting for confirmation...');
      
      const receipt = await tx.wait();
      await updateBalances(wallet);
      
      return receipt.hash;
    } catch (error: any) {
      console.error('Error sending cUSD:', error);
      throw new Error(error.message || 'Failed to send cUSD');
    }
  };

  const sendCELO = async (toAddress: string, amount: string) => {
    if (!wallet) throw new Error('Wallet not initialized');

    try {
      const amountInWei = ethers.parseEther(amount);
      
      // Check balance
      const balance = await wallet.provider!.getBalance(wallet.address);
      if (balance < amountInWei) {
        throw new Error('Insufficient CELO balance');
      }

      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: amountInWei
      });
      
      toast.info('Transaction submitted, waiting for confirmation...');
      const receipt = await tx.wait();
      await updateBalances(wallet);
      
      return receipt!.hash;
    } catch (error: any) {
      console.error('Error sending CELO:', error);
      throw new Error(error.message || 'Failed to send CELO');
    }
  };

  const refreshBalances = async () => {
    if (wallet) {
      await updateBalances(wallet);
    }
  };

  const exportPrivateKey = async (userPin: string): Promise<string> => {
    if (!wallet) throw new Error('Wallet not initialized');
    
    // In production, verify PIN before exporting
    return wallet.privateKey;
  };

  return {
    wallet,
    address,
    celoBalance,
    cUsdBalance,
    loading,
    sendCUSD,
    sendCELO,
    refreshBalances,
    exportPrivateKey,
    isTestnet: USE_TESTNET
  };
};
