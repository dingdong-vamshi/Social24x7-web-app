import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extendedSocialRepository, validateSocialMedia, type Story } from '../features/social/extendedRepository';
import { RichProfile, Stories } from '../features/social/ExpandedSocial';
import type { SocialRepository } from '../features/social/repository';

const viewerId = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const key of ['select', 'eq', 'gt', 'order', 'limit', 'range', 'insert', 'single']) query[key] = vi.fn(() => query);
  query.then = vi.fn((resolve: (result: unknown) => unknown) => resolve({ data: { id: 'created' }, error: null, count: 0 }));
  const storage = { upload: vi.fn().mockResolvedValue({ error: null }), remove: vi.fn().mockResolvedValue({ error: null }), createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://media.test/story' }, error: null }) };
  const client = { from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({ data: [], error: null }), storage: { from: vi.fn(() => storage) } };
  const check = vi.fn().mockResolvedValue(undefined);
  return { query, storage, client, check, repo: extendedSocialRepository(client as unknown as SupabaseClient, viewerId, check) };
}
describe('Canonical social media contracts', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])('accepts supported media %s', type => {
    expect(validateSocialMedia(new File(['media'], 'input', { type })).mediaType).toBe(type.startsWith('video') ? 'video' : 'image');
  });
  it('rejects executable/SVG, empty and oversized media before uploading', () => {
    expect(() => validateSocialMedia(new File(['x'], 'bad.svg', { type: 'image/svg+xml' }))).toThrow('Choose');
    expect(() => validateSocialMedia(new File([], 'empty.png', { type: 'image/png' }))).toThrow('non-empty');
    const large = new File(['x'], 'large.mp4', { type: 'video/mp4' });
    Object.defineProperty(large, 'size', { value: 51 * 1024 * 1024 });
    expect(() => validateSocialMedia(large)).toThrow('50 MB');
  });
  it('publishes only after identity check using original owner/post bucket contract', async () => {
    const f = fixture(), file = new File(['photo'], '../../unsafe.png', { type: 'image/png' });
    await f.repo.publishMedia(' photo caption ', file);
    expect(f.check).toHaveBeenCalled();
    expect(f.client.storage.from).toHaveBeenCalledWith('social-posts');
    const path = f.storage.upload.mock.calls[0][0];
    expect(path).toMatch(new RegExp('^' + viewerId + '/post/[a-f0-9-]+\\.png$'));
    expect(f.storage.upload).toHaveBeenCalledWith(path, file, expect.objectContaining({ upsert: false, contentType: 'image/png' }));
    expect(f.query.insert).toHaveBeenCalledWith(expect.objectContaining({ author_id: viewerId, body: 'photo caption', media_paths: [path], visibility: 'public' }));
  });
  it('does not upload or insert after identity denial', async () => {
    const f = fixture(); f.check.mockRejectedValue(new Error('Identity changed'));
    await expect(f.repo.publishMedia('x', new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toThrow('Identity changed');
    expect(f.client.from).not.toHaveBeenCalled(); expect(f.storage.upload).not.toHaveBeenCalled();
  });
  it('cleans only the just-created media object after insertion failure', async () => {
    const f = fixture();
    f.query.then.mockImplementation((resolve: (result: unknown) => unknown) => resolve({ data: null, error: new Error('Insert denied') }));
    await expect(f.repo.publishMedia('x', new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toThrow('Insert denied');
    expect(f.storage.remove).toHaveBeenCalledWith([f.storage.upload.mock.calls[0][0]]);
  });
  it('uses stories table defaults for expiry and preserves original text/background contract', async () => {
    const f = fixture(); await f.repo.createStory(' Hello story ', 'forest');
    expect(f.client.from).toHaveBeenCalledWith('stories');
    expect(f.query.insert).toHaveBeenCalledWith({ author_id: viewerId, content_type: 'text', media_path: null, media_type: null, thumbnail_path: null, text_content: 'Hello story', background_style: 'forest', visibility: 'public' });
    expect(f.client.storage.from).not.toHaveBeenCalled();
  });
  it('rejects invalid text and backgrounds without inserting', async () => {
    const f = fixture(); await expect(f.repo.createStory('', 'forest')).rejects.toThrow('Enter a story');
    await expect(f.repo.createStory('Hello', 'unsupported')).rejects.toThrow('background'); expect(f.client.from).not.toHaveBeenCalled();
  });
  it('constrains private story delivery to expiry and isolates missing objects', async () => {
    const f = fixture();
    f.query.then.mockImplementation((resolve: (result: unknown) => unknown) => resolve({ data: [{ id: 'story', author_id: viewerId, content_type: 'media', media_path: viewerId + '/story/a.png', expires_at: new Date(Date.now() + 120_000).toISOString() }], error: null }));
    f.storage.createSignedUrl.mockResolvedValue({ data: null, error: new Error('Object not found') });
    const stories = await f.repo.stories();
    expect(f.query.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(f.storage.createSignedUrl.mock.calls[0][1]).toBeLessThanOrEqual(120);
    expect(stories[0].unavailable).toBe(true); expect(stories[0].mediaUrl).toBeNull();
  });
  it('rejects invalid profile IDs before querying', async () => {
    const f = fixture(); await expect(f.repo.profileStats('invalid')).rejects.toThrow('Invalid'); await expect(f.repo.connections('invalid', 'followers')).rejects.toThrow('Invalid'); expect(f.client.from).not.toHaveBeenCalled();
  });
  it('loads follows with the correct directional ownership columns', async () => {
    const f = fixture(); f.query.then.mockImplementation((resolve: (result: unknown) => unknown) => resolve({ data: [], error: null }));
    await f.repo.connections(viewerId, 'followers'); expect(f.query.select).toHaveBeenCalledWith('follower_id'); expect(f.query.eq).toHaveBeenCalledWith('following_id', viewerId);
    await f.repo.connections(viewerId, 'following'); expect(f.query.select).toHaveBeenCalledWith('following_id'); expect(f.query.eq).toHaveBeenCalledWith('follower_id', viewerId);
  });
});

const story: Story = { id: 'story', author_id: viewerId, content_type: 'text', text_content: 'A real test story', background_style: 'forest', media_type: null, media_path: null, mediaUrl: null, expires_at: '2099-01-01T00:00:00Z', created_at: '2026-10-14T00:00:00Z', author: { id: viewerId, display_name: 'QA author', username: 'qa' } };
let repo: SocialRepository;
beforeEach(() => {
  repo = { viewerId, stories: vi.fn().mockResolvedValue([story]), createStory: vi.fn().mockResolvedValue(undefined), profile: vi.fn().mockResolvedValue(story.author), profileStats: vi.fn().mockResolvedValue({ posts: 1, followers: 2, following: 3 }), following: vi.fn().mockResolvedValue(false), avatar: vi.fn().mockResolvedValue(null), profilePosts: vi.fn().mockResolvedValue([]), recommendations: vi.fn().mockResolvedValue([]), connections: vi.fn().mockResolvedValue([]), comments: vi.fn().mockResolvedValue([]) } as unknown as SocialRepository;
});
describe('Expanded social UI isolated verification', () => {
  it('opens and closes real supplied text stories without marking an unimplemented interaction', async () => {
    render(<MemoryRouter><Stories repository={repo} base="/account/social" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /QA author/ }));
    expect(screen.getByText('A real test story')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close story' }));
    expect(screen.queryByLabelText('Story viewer')).not.toBeInTheDocument();
  });
  it('preserves story text on failed save and retries the same contract', async () => {
    vi.mocked(repo.createStory).mockRejectedValueOnce(new Error('Story not saved'));
    render(<MemoryRouter><Stories repository={repo} base="/account/social" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Add story' })); fireEvent.change(screen.getByLabelText('Story text'), { target: { value: 'Retained story' } }); fireEvent.click(screen.getByRole('button', { name: 'Publish story' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Story not saved'); expect(screen.getByLabelText('Story text')).toHaveValue('Retained story');
    fireEvent.click(screen.getByRole('button', { name: 'Publish story' })); expect(await screen.findByText('Your story has been published.')).toBeInTheDocument();
  });
  it('shows profile counts/connections and honest original highlight limitation', async () => {
    render(<MemoryRouter><RichProfile repository={repo} base="/account/social" id={viewerId} viewerId={viewerId} renderPost={() => null} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '2 followers' })); expect(await screen.findByText('No followers yet.')).toBeInTheDocument(); expect(repo.connections).toHaveBeenCalledWith(viewerId, 'followers');
    fireEvent.click(screen.getByRole('button', { name: 'Highlights' })); expect(screen.getByText(/Saved highlights were a preview/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit profile' })).toHaveAttribute('href', '/account');
  });
  it('distinguishes a recommendation read failure from no recommendations', async () => {
    vi.mocked(repo.recommendations).mockRejectedValue(new Error('Recommendations denied'));
    render(<MemoryRouter><RichProfile repository={repo} base="/account/social" id={viewerId} viewerId={viewerId} renderPost={() => null} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Recommended' })); expect(await screen.findByRole('alert')).toHaveTextContent('Recommendations denied'); expect(screen.queryByText('No recommended products yet.')).not.toBeInTheDocument();
  });
});
