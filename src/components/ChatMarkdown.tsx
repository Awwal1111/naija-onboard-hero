import { Fragment, ReactNode } from 'react'

// Small, dependency-free markdown renderer for AI replies (no HTML injection:
// everything is built as React nodes). Supports headings, bold, italic, inline
// code, fenced code, bullet/numbered lists and http(s) links.

const inline = (text: string, keyPrefix: string): ReactNode[] => {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${keyPrefix}-${i++}`
    if (t.startsWith('**') || t.startsWith('__')) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) {
      const mm = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(t)!
      out.push(<a key={k} href={mm[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{mm[1]}</a>)
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export const ChatMarkdown = ({ text }: { text: string }) => {
  const lines = (text || '').split('\n')
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let code: string[] | null = null

  const flushList = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
        {list.items.map((it, n) => <li key={n}>{inline(it, `li${blocks.length}-${n}`)}</li>)}
      </Tag>
    )
    list = null
  }

  lines.forEach((raw, idx) => {
    if (raw.trim().startsWith('```')) {
      if (code) {
        blocks.push(<pre key={`c${idx}`} className="overflow-x-auto rounded bg-muted p-2 text-xs"><code>{code.join('\n')}</code></pre>)
        code = null
      } else { flushList(); code = [] }
      return
    }
    if (code) { code.push(raw); return }

    const bullet = /^\s*[*\-•]\s+(.*)$/.exec(raw)
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(raw)
    if (bullet || num) {
      const ordered = !!num
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] } }
      list.items.push((bullet || num)![1])
      return
    }
    flushList()
    if (!raw.trim()) return
    const h = /^(#{1,4})\s+(.*)$/.exec(raw)
    if (h) blocks.push(<p key={`h${idx}`} className="font-semibold">{inline(h[2], `h${idx}`)}</p>)
    else blocks.push(<p key={`p${idx}`}>{inline(raw, `p${idx}`)}</p>)
  })
  if (code) blocks.push(<pre key="cend" className="overflow-x-auto rounded bg-muted p-2 text-xs"><code>{(code as string[]).join('\n')}</code></pre>)
  flushList()

  return <div className="text-sm space-y-2 break-words">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>
}
