export function flyoutPosition(anchor: { right: number; left: number; top: number; bottom: number }, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const inset = 12
  const panelWidth = Math.min(width, viewportWidth - inset * 2)
  const panelHeight = Math.min(height, viewportHeight - inset * 2)
  const beside = anchor.right + 8
  const left = beside + panelWidth <= viewportWidth - inset ? beside : anchor.left - panelWidth - 8 >= inset ? anchor.left - panelWidth - 8 : viewportWidth - panelWidth - inset
  return { left: Math.max(inset, left), top: Math.max(inset, Math.min(anchor.top, viewportHeight - panelHeight - inset)), width: panelWidth, maxHeight: viewportHeight - inset * 2 }
}
