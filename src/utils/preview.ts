export const PREVIEW_NOTICE_EVENT = 'social24x7:preview-notice'

export function announcePreviewAction(message = 'This Phase 1 preview does not change production data.') {
  window.dispatchEvent(new CustomEvent(PREVIEW_NOTICE_EVENT, { detail: message }))
}
