import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { NavItem } from './WorkspaceShell'
import { flyoutPosition } from './flyout-position'

/** Real navigation links, one portalled disclosure, no inline expansion. */
export function WorkspaceNavigation({ items, collapsed, pathname, onNavigate }: { items: NavItem[]; collapsed: boolean; pathname: string; onNavigate: () => void }) {
  const [open, setOpen] = useState<{ path: string; keyboard: boolean; hover: boolean } | null>(null)
  const [position, setPosition] = useState<ReturnType<typeof flyoutPosition> | null>(null)
  const triggers = useRef(new Map<string, HTMLButtonElement>())
  const panel = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = useId()
  const item = items.find(entry => entry.path === open?.path)
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current) }
  const closeLater = () => { cancelClose(); timer.current = setTimeout(() => setOpen(null), 220) }
  const show = (path: string, keyboard = false, hover = false) => {
    cancelClose()
    const anchor = triggers.current.get(path)?.getBoundingClientRect()
    if (anchor) setPosition(flyoutPosition(anchor, 250, 360, window.innerWidth, window.innerHeight))
    setOpen({ path, keyboard, hover })
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const anchor = triggers.current.get(open.path)?.getBoundingClientRect()
      if (anchor && panel.current) setPosition(flyoutPosition(anchor, 250, panel.current.scrollHeight, window.innerWidth, window.innerHeight))
    }
    update()
    if (open.keyboard) panel.current?.querySelector('a')?.focus()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const inside = (target: EventTarget | null) => target instanceof Node && (panel.current?.contains(target) || triggers.current.get(open.path)?.contains(target))
    const outside = (event: Event) => { if (!inside(event.target)) setOpen(null) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(null); triggers.current.get(open.path)?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <>
    {items.map(entry => {
      const active = entry.children?.some(child => pathname === child.path || (child.path.endsWith('/products') && pathname.startsWith(child.path + '/edit/')))
      if (!entry.children) return <NavLink key={entry.path} to={entry.path} end={entry.path.split('/').length === 3} onClick={onNavigate} title={collapsed ? entry.label : undefined} aria-label={collapsed ? entry.label : undefined} onPointerEnter={event => { if (event.pointerType === 'mouse') { cancelClose(); setOpen(null) } }}>{entry.icon}{!collapsed && <><span>{entry.label}</span>{entry.soon && <small className="workspace-soon">Soon</small>}</>}</NavLink>
      return <div className={`workspace-nav-group ${active ? 'current-group' : ''}`} key={entry.path}>
        <button ref={node => { if (node) triggers.current.set(entry.path, node); else triggers.current.delete(entry.path) }} className="workspace-nav-toggle" aria-label={`${entry.label} submenu`} aria-expanded={open?.path === entry.path} aria-controls={open?.path === entry.path ? id : undefined}
          onPointerEnter={event => { if (event.pointerType === 'mouse') show(entry.path, false, true) }} onPointerLeave={event => { if (event.pointerType === 'mouse') closeLater() }}
          onClick={event => { if (open?.path === entry.path && !open.hover) setOpen(null); else show(entry.path, event.detail === 0) }}
          onKeyDown={event => { if (['ArrowRight', 'ArrowDown'].includes(event.key) || (event.key === 'Tab' && !event.shiftKey && open?.path === entry.path)) { event.preventDefault(); show(entry.path, true) } }} title={collapsed ? entry.label : undefined}>
          {entry.icon}{!collapsed && <><span>{entry.label}</span><ChevronRight size={15}/></>}
        </button>
      </div>
    })}
    {item?.children && createPortal(<nav ref={panel} id={id} aria-label={`${item.label} navigation`} className="workspace-nav-flyout" style={position ?? { visibility: 'hidden' }}
      onPointerEnter={cancelClose} onPointerLeave={event => { if (event.pointerType === 'mouse') closeLater() }}
      onKeyDown={event => {
        const links = Array.from(panel.current?.querySelectorAll('a') ?? [])
        const index = links.indexOf(document.activeElement as HTMLAnchorElement)
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length
          links[next]?.focus()
        }
        if (event.key === 'Tab' && ((event.shiftKey && index === 0) || (!event.shiftKey && index === links.length - 1))) {
          event.preventDefault()
          const trigger = triggers.current.get(item.path)
          const navigation = Array.from(trigger?.closest('nav')?.querySelectorAll<HTMLElement>('a,button') ?? [])
          const next = navigation[navigation.indexOf(trigger!) + 1]
          setOpen(null)
          if (event.shiftKey) trigger?.focus(); else (next ?? trigger)?.focus()
        }
      }}>
      <strong>{item.label}</strong>
      {item.children.map(child => <NavLink key={child.path} to={child.path} end aria-label={child.soon ? `${child.label} Soon` : undefined} onClick={() => { cancelClose(); setOpen(null); onNavigate() }}><span>{child.label}</span>{child.soon && <small>Soon</small>}</NavLink>)}
    </nav>, document.body)}
  </>
}
