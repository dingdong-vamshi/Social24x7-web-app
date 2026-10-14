import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Conversation } from '../features/chat/repository';
import type { Post } from '../features/social/repository';
import { createSocialShareRepository } from '../features/social/shareRepository';
import { SharedPostMessage, ShareToChatPanel } from '../features/social/ShareToChat';
const mock = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../features/chat/repository', async original => ({ ...await original<object>(), createChatRepository: () => ({ listConversations: mock.list, getConversation: mock.get }) }));
const viewer = '11111111-1111-4111-8111-111111111111', conversationId = '22222222-2222-4222-8222-222222222222', postId = '33333333-3333-4333-8333-333333333333', clientId = '44444444-4444-4444-8444-444444444444';
const conversation = { id: conversationId, name: 'Controlled QA chat', kind: 'personal', conversation_participants: [{ user_id: viewer }] } as Conversation;
const post = { id: postId, body: 'Post preview', author_username: 'qa', author_display_name: 'QA' } as Post;
function fixture() {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const key of ['select', 'eq', 'single', 'maybeSingle']) query[key] = vi.fn(() => query);
  query.then = vi.fn((resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }));
  const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: viewer, app_metadata: {} } }, error: null }) }, from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({ data: { id: 'message' }, error: null }) };
  return { query, client, repository: createSocialShareRepository(client as unknown as SupabaseClient, viewer) };
}
beforeEach(() => { vi.clearAllMocks(); mock.list.mockResolvedValue([conversation]); mock.get.mockResolvedValue(conversation); });
describe('Social shared-post contract', () => {
  it('lists only explicitly eligible personal/group memberships', async () => {
    mock.list.mockResolvedValue([conversation, { ...conversation, kind: 'business' }, { ...conversation, kind: 'group', conversation_participants: [] }]);
    const f = fixture(); expect((await f.repository.conversations(0)).rows).toEqual([conversation]); expect(f.client.rpc).not.toHaveBeenCalled();
  });
  it('sends the original structured product/post payload after confirming current visibility', async () => {
    const f = fixture();
    f.query.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => resolve({ data: null, error: null })).mockImplementationOnce((resolve: (value: unknown) => unknown) => resolve({ data: { id: postId, body: 'Current canonical caption', visibility: 'public' }, error: null }));
    await f.repository.send(conversationId, post, clientId);
    expect(f.query.eq).toHaveBeenCalledWith('visibility', 'public');
    expect(f.client.rpc).toHaveBeenCalledWith('send_personal_message', { target_conversation: conversationId, message_body: 'Shared a post from qa', message_kind: 'product', message_payload: { post: { id: postId, author: 'qa', caption: 'Current canonical caption' } }, message_client_id: clientId });
  });
  it('reconciles delivered shares rather than duplicating them', async () => {
    const f = fixture(); f.query.then.mockImplementation((resolve: (value: unknown) => unknown) => resolve({ data: { id: 'already-delivered' }, error: null }));
    await f.repository.send(conversationId, post, clientId); expect(f.client.rpc).not.toHaveBeenCalled(); expect(f.query.eq).toHaveBeenCalledWith('client_id', clientId);
  });
  it.each(['business', 'nonmember', 'work', 'identity'])('rejects %s before sending', async kind => {
    const f = fixture();
    if (kind === 'business') mock.get.mockResolvedValue({ ...conversation, kind: 'business' });
    if (kind === 'nonmember') mock.get.mockResolvedValue({ ...conversation, conversation_participants: [] });
    if (kind === 'work') f.client.auth.getUser.mockResolvedValue({ data: { user: { id: viewer, app_metadata: { account_type: 'business_employee' } } }, error: null });
    if (kind === 'identity') f.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'other', app_metadata: {} } }, error: null });
    await expect(f.repository.send(conversationId, post, clientId)).rejects.toThrow(); expect(f.client.rpc).not.toHaveBeenCalled();
  });
  it('does not send a deleted/private/unavailable post', async () => {
    const f = fixture(); await expect(f.repository.send(conversationId, post, clientId)).rejects.toThrow('no longer available'); expect(f.client.rpc).not.toHaveBeenCalled();
  });
  it('requires an explicit recipient and send click; retry reuses the same ID', async () => {
    const repository = { conversations: vi.fn().mockResolvedValue({ rows: [conversation], hasNext: false }), send: vi.fn().mockRejectedValueOnce(new Error('Delivery unknown')).mockResolvedValue(undefined) };
    render(<MemoryRouter><ShareToChatPanel post={post} repository={repository} close={() => {}} /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Send selected post' })).toBeDisabled(); expect(repository.send).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Send to conversation'), { target: { value: conversationId } }); expect(repository.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send selected post' })); expect(await screen.findByRole('alert')).toHaveTextContent('Delivery unknown');
    fireEvent.click(screen.getByRole('button', { name: 'Send selected post' })); expect(await screen.findByRole('link', { name: 'Open conversation' })).toHaveAttribute('href', '/account/chat/' + conversationId);
    expect(repository.send.mock.calls[0][2]).toBe(repository.send.mock.calls[1][2]);
  });
  it('renders the structured original message with a local validated destination', () => {
    render(<MemoryRouter><SharedPostMessage payload={{ post: { id: postId, author: 'qa', caption: '<script>not executed</script>' } }} /></MemoryRouter>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/account/social?post=' + postId); expect(screen.getByText('<script>not executed</script>')).toBeInTheDocument();
  });
  it('rejects non-UUID external payload destinations', () => {
    render(<MemoryRouter><SharedPostMessage payload={{ post: { id: 'https://evil.test' } }} /></MemoryRouter>); expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
