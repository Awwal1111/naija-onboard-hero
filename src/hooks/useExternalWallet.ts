import { useCallback, useState } from 'react'
import { encodeFunctionData, parseUnits, type Hex } from 'viem'
import { toast } from 'sonner'

// Celo Mainnet
export const CELO_CHAIN_ID_HEX = '0xa4ec' // 42220
const CELO_CHAIN_PARAMS = {
  chainId: CELO_CHAIN_ID_HEX,
  chainName: 'Celo Mainnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://celoscan.io'],
}

const erc20TransferAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export type WalletKind = 'metamask' | 'valora' | 'injected'

// window.ethereum is declared globally in src/lib/minipay.ts

const isMobile = () =>
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent)

/**
 * Returns an EIP-1193 provider, or opens deep-link to the wallet app on mobile if missing.
 */
function getProvider(kind: WalletKind): any | null {
  if (typeof window === 'undefined') return null
  const eth: any = (window as any).ethereum
  if (!eth) return null

  // EIP-5749 / multi-provider
  const providers: any[] = Array.isArray(eth.providers) ? eth.providers : [eth]

  if (kind === 'metamask') {
    return providers.find((p: any) => p?.isMetaMask && !p?.isBraveWallet) || (eth.isMetaMask ? eth : null)
  }
  if (kind === 'valora') {
    return providers.find((p: any) => p?.isValora) || (eth.isValora ? eth : null) || eth
  }
  return eth
}

export function useExternalWallet() {
  const [account, setAccount] = useState<string>('')
  const [chainId, setChainId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const ensureCeloChain = useCallback(async (provider: any) => {
    const current = (await provider.request({ method: 'eth_chainId' })) as string
    setChainId(current)
    if (current?.toLowerCase() === CELO_CHAIN_ID_HEX) return
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CELO_CHAIN_ID_HEX }],
      })
    } catch (err: any) {
      // 4902: chain not added
      if (err?.code === 4902 || /Unrecognized chain/i.test(err?.message || '')) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [CELO_CHAIN_PARAMS],
        })
      } else {
        throw err
      }
    }
    setChainId(CELO_CHAIN_ID_HEX)
  }, [])

  const connect = useCallback(
    async (kind: WalletKind): Promise<string> => {
      setBusy(true)
      try {
        const provider = getProvider(kind)
        if (!provider) {
          // No injected provider. On mobile, deep-link into the wallet's in-app browser
          // so the user lands back on this page WITH the provider injected.
          if (isMobile()) {
            const here = window.location.host + window.location.pathname + window.location.search
            if (kind === 'metamask') {
              // MetaMask universal link — opens MM app's in-app browser at this URL
              window.location.href = `https://metamask.app.link/dapp/${here}`
            } else if (kind === 'valora') {
              // Valora's modern universal link (DappKit / celo://dappkit was deprecated 2024)
              // wallet.valora.xyz opens the Valora app browser to the given URL
              window.location.href = `https://valoraapp.com/wallet?dappUrl=${encodeURIComponent(window.location.href)}`
            }
            // Give the OS ~1.5s to switch apps; if it doesn't, the throw below shows guidance.
            await new Promise((r) => setTimeout(r, 1500))
          }
          throw new Error(
            kind === 'metamask'
              ? 'MetaMask not detected. If the MetaMask app didn\'t open, install it and reopen this page from inside its browser — or use the Crypto Deposit option to send manually.'
              : kind === 'valora'
                ? 'Valora not detected. If the Valora app didn\'t open, install it and reopen this page from its in-app browser — or use the Crypto Deposit option to send manually.'
                : 'No wallet detected. Use the Crypto Deposit option to send to your address manually.'
          )
        }

        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
        if (!accounts?.length) throw new Error('No account returned by wallet')
        await ensureCeloChain(provider)
        setAccount(accounts[0])
        return accounts[0]
      } catch (err: any) {
        if (err?.code === 4001) throw new Error('You rejected the connection request')
        throw err
      } finally {
        setBusy(false)
      }
    },
    [ensureCeloChain]
  )

  /**
   * Sends an ERC20 transfer (cUSD/USDT) from the connected wallet to `recipient`.
   * Returns the transaction hash once the wallet broadcasts it.
   */
  const sendErc20 = useCallback(
    async (params: {
      kind: WalletKind
      tokenAddress: string
      recipient: string
      amount: string
      decimals?: number
    }): Promise<Hex> => {
      const { kind, tokenAddress, recipient, amount, decimals = 18 } = params
      setBusy(true)
      try {
        const provider = getProvider(kind)
        if (!provider) throw new Error('Wallet provider not available')

        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
        const from = accounts[0]
        if (!from) throw new Error('Wallet not connected')
        await ensureCeloChain(provider)

        const value = parseUnits(amount, decimals)
        const data = encodeFunctionData({
          abi: erc20TransferAbi,
          functionName: 'transfer',
          args: [recipient as Hex, value],
        })

        const txHash = (await provider.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: tokenAddress, data, value: '0x0' }],
        })) as Hex

        return txHash
      } catch (err: any) {
        if (err?.code === 4001) throw new Error('Transaction rejected in wallet')
        throw err
      } finally {
        setBusy(false)
      }
    },
    [ensureCeloChain]
  )

  /**
   * Polls Celo RPC for transaction confirmation. Returns true on success.
   */
  const waitForConfirmation = useCallback(async (txHash: string, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch('https://forno.celo.org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          }),
        })
        const json = await res.json()
        const receipt = json?.result
        if (receipt) {
          if (receipt.status === '0x1') return true
          if (receipt.status === '0x0') throw new Error('Transaction failed on-chain')
        }
      } catch (err) {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, 4000))
    }
    return false
  }, [])

  return { account, chainId, busy, connect, sendErc20, waitForConfirmation, getProvider }
}
