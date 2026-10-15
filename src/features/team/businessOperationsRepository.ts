import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid } from '../chat/repository'

export type ShareOption = { id: string; title?: string; status?: string; price_minor?: number; currency?: string }
export type ReturnOption = { id: string; order_id: string; status: string; reason: string; title: string }
export type ReturnDecision = 'under_review' | 'approved' | 'rejected'
export function createBusinessOperationsRepository(client: SupabaseClient) {
  async function call<T>(name: string, conversation: string, args = {}): Promise<T> {
    if (!isUuid(conversation)) throw new Error('Choose a valid customer conversation.')
    const { data, error } = await client.rpc(name, { target_conversation: conversation, ...args })
    if (error) throw new Error(['PGRST202', '42883'].includes(error.code) ? 'This action awaits operational backend activation. No change was made.' : error.message)
    return data as T
  }
  return {
    listShares: (conversation: string, kind: 'product' | 'order') => call<ShareOption[]>('list_business_share_options', conversation, { share_kind: kind }),
    sendShare: (conversation: string, kind: 'product' | 'order', record: string, clientId: string) => {
      if (!isUuid(record) || !isUuid(clientId)) throw new Error('Select a valid record and retry identifier.')
      return call<string>('send_business_employee_share', conversation, { share_kind: kind, target_record: record, message_client_id: clientId })
    },
    listReturns: (conversation: string) => call<ReturnOption[]>('list_business_customer_returns', conversation),
    reviewReturn: (conversation: string, record: string, decision: ReturnDecision, note: string) => {
      if (!isUuid(record) || !['under_review', 'approved', 'rejected'].includes(decision) || note.length > 1000) throw new Error('Choose a valid return decision and a note of at most 1000 characters.')
      return call<{ status: ReturnDecision; moneyTransferred: false; refundProcessing: string }>('review_business_customer_return', conversation, { target_return: record, decision, review_note: note.trim() || null })
    },
  }
}
