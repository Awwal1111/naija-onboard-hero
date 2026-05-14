// Mt Pelerin on/off ramp integration
// The customer key (_ctkn) is a PUBLIC integration identifier embedded in
// every iframe URL — it is not a secret and is safe to include in client code.
export const MT_PELERIN_CTKN = '6efaf1ac-aec0-4ad6-abcb-dcca479fab62'

export type MtPelerinTab = 'buy' | 'sell' | 'swap'

interface MtPelerinUrlOptions {
  tab?: MtPelerinTab
  tabs?: MtPelerinTab[]
  /** Destination wallet address (on-ramp) or source (off-ramp) */
  addr?: string
  /** Crypto to receive (on-ramp) e.g. 'USDT', 'CUSD', 'CELO' */
  bdc?: string
  /** Crypto to sell (off-ramp) */
  bsc?: string
  /** Allowed cryptos, comma-separated */
  crys?: string
  /** Network e.g. 'celo_mainnet' */
  net?: string
  /** Allowed networks, comma-separated */
  nets?: string
  /** Fiat currency e.g. 'USD', 'NGN', 'EUR' */
  ccrys?: string
  lang?: string
}

export function buildMtPelerinUrl(opts: MtPelerinUrlOptions = {}): string {
  const params = new URLSearchParams()
  params.set('_ctkn', MT_PELERIN_CTKN)
  params.set('type', 'direct-link')
  params.set('lang', opts.lang || 'en')
  params.set('tabs', (opts.tabs || ['buy', 'sell', 'swap']).join(','))
  if (opts.tab) params.set('tab', opts.tab)
  if (opts.addr) params.set('addr', opts.addr)
  if (opts.bdc) params.set('bdc', opts.bdc)
  if (opts.bsc) params.set('bsc', opts.bsc)
  if (opts.crys) params.set('crys', opts.crys)
  if (opts.net) params.set('net', opts.net)
  if (opts.nets) params.set('nets', opts.nets)
  if (opts.ccrys) params.set('ccrys', opts.ccrys)
  return `https://widget.mtpelerin.com/?${params.toString()}`
}
