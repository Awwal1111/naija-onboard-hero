// Mt Pelerin on/off-ramp integration.
// The customer key (_ctkn) is a public integration identifier intended for client-side use.
export const MT_PELERIN_CTKN = '6efaf1ac-aec0-4ad6-abcb-dcca479fab62'

// Mt Pelerin confirmed that this key is registered for this exact hostname.
export const MT_PELERIN_ALLOWED_HOST = 'www.naijalancers.name.ng'

export function isMtPelerinAllowedHost(): boolean {
  if (typeof window === 'undefined') return true
  return window.location.hostname.toLowerCase() === MT_PELERIN_ALLOWED_HOST
}

export type MtPelerinTab = 'buy' | 'sell' | 'swap'

interface MtPelerinUrlOptions {
  tab?: MtPelerinTab
  tabs?: MtPelerinTab[]
  /** Destination wallet address (buy) or source wallet address (sell). */
  addr?: string
  bdc?: string
  bsc?: string
  bsa?: number
  ssc?: string
  sdc?: string
  ssa?: number
  crys?: string
  curs?: string
  dnet?: string
  snet?: string
  pm?: 'card'
  lang?: string
  mode?: 'dark'
  /** Mt Pelerin integration mode. iFrame embeds must use `web`. */
  type?: 'web' | 'popup' | 'webview' | 'direct-link'
  directLink?: boolean
}

export function buildMtPelerinUrl(opts: MtPelerinUrlOptions = {}): string {
  const params = new URLSearchParams()
  params.set('_ctkn', MT_PELERIN_CTKN)
  // Mt Pelerin requires an explicit integration type. The default is `web`
  // for the iframe embed; the standalone fallback uses `direct-link`.
  params.set('type', opts.directLink ? 'direct-link' : (opts.type || 'web'))
  params.set('lang', opts.lang || 'en')
  params.set('tabs', (opts.tabs || ['buy', 'sell', 'swap']).join(','))
  if (opts.tab) params.set('tab', opts.tab)
  if (opts.addr) params.set('addr', opts.addr)
  if (opts.bdc) params.set('bdc', opts.bdc)
  if (opts.bsc) params.set('bsc', opts.bsc)
  if (opts.bsa !== undefined) params.set('bsa', String(opts.bsa))
  if (opts.ssc) params.set('ssc', opts.ssc)
  if (opts.sdc) params.set('sdc', opts.sdc)
  if (opts.ssa !== undefined) params.set('ssa', String(opts.ssa))
  if (opts.crys) params.set('crys', opts.crys)
  if (opts.curs) params.set('curs', opts.curs)
  if (opts.dnet) params.set('dnet', opts.dnet)
  if (opts.snet) params.set('snet', opts.snet)
  if (opts.pm) params.set('pm', opts.pm)
  if (opts.mode) params.set('mode', opts.mode)
  return `https://widget.mtpelerin.com/?${params.toString()}`
}
