// Mt Pelerin on/off ramp integration
// The customer key (_ctkn) is a PUBLIC integration identifier embedded in
// every iframe URL — it is not a secret and is safe to include in client code.
export const MT_PELERIN_CTKN = '6efaf1ac-aec0-4ad6-abcb-dcca479fab62'

// Mt Pelerin binds the integration key to ONE registered domain.
// Loading the widget on any other host returns "access denied".
// Our key is registered for the custom domain below — open the widget there.
export const MT_PELERIN_ALLOWED_HOST = 'naijalancers.name.ng'

export function isMtPelerinAllowedHost(): boolean {
  if (typeof window === 'undefined') return true
  return window.location.hostname === MT_PELERIN_ALLOWED_HOST
}

export type MtPelerinTab = 'buy' | 'sell' | 'swap'

interface MtPelerinUrlOptions {
  tab?: MtPelerinTab
  tabs?: MtPelerinTab[]
  /** Destination wallet address (on-ramp) or source (off-ramp) */
  addr?: string
  /** Buy tab destination crypto e.g. 'USDT', 'CUSD', 'CELO' */
  bdc?: string
  /** Buy tab source fiat e.g. 'USD', 'EUR' */
  bsc?: string
  /** Sell tab source crypto */
  ssc?: string
  /** Sell tab destination fiat */
  sdc?: string
  /** Allowed cryptos, comma-separated */
  crys?: string
  /** Allowed fiats, comma-separated */
  curs?: string
  /** Destination network (buy/swap) e.g. 'celo_mainnet' */
  dnet?: string
  /** Source network (sell) e.g. 'celo_mainnet' */
  snet?: string
  lang?: string
  mode?: 'dark'
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
  if (opts.ssc) params.set('ssc', opts.ssc)
  if (opts.sdc) params.set('sdc', opts.sdc)
  if (opts.crys) params.set('crys', opts.crys)
  if (opts.curs) params.set('curs', opts.curs)
  if (opts.dnet) params.set('dnet', opts.dnet)
  if (opts.snet) params.set('snet', opts.snet)
  if (opts.mode) params.set('mode', opts.mode)
  return `https://widget.mtpelerin.com/?${params.toString()}`
}
