// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { digest, EncryptedInbox, newDeviceKey, SimulatedQueue, synchronize, type Device, type Envelope } from './prototype';

const alice: Device = { account: 'alice', device: 'phone' }, bob: Device = { account: 'bob', device: 'phone' }, bobWeb: Device = { account: 'bob', device: 'web' }, carol: Device = { account: 'carol', device: 'phone' };
const message: Envelope = { id: 'qa-message-1', body: 'Isolated synthetic message', sender: 'alice', conversation: 'qa-conversation', createdAt: 100 };
let factory: IDBFactory, queue: SimulatedQueue, now: number;
beforeEach(() => { factory = new IDBFactory(); now = 100; queue = new SimulatedQueue([alice, bob, bobWeb, carol], () => now); });
const open = async (device = bob) => { const key = await newDeviceKey(); return { key, inbox: await EncryptedInbox.open(device, key, factory) }; };
describe('isolated store-and-forward protocol with real IndexedDB API adapter', () => {
  it('stores a single delivery before acknowledging and retires only after grace', async () => {
    const { inbox } = await open();
    await queue.enqueue(message, [bob], 1000);
    expect(queue.hasContent(message.id)).toBe(true);
    await synchronize(inbox, queue.connect(bob));
    expect(await inbox.history()).toEqual([message]);
    queue.retireAcknowledged(10); expect(queue.hasContent(message.id)).toBe(true);
    now += 10; queue.retireAcknowledged(10); expect(queue.hasContent(message.id)).toBe(false);
    expect((await synchronize(inbox, queue.connect(bob))).gaps).toEqual([]);
    inbox.lock();
  });
  it('retains messages for an offline recipient and hydrates on reconnect', async () => {
    await queue.enqueue(message, [bob], 1000); now += 500; queue.retireAcknowledged(0);
    expect(queue.hasContent(message.id)).toBe(true);
    const { inbox } = await open(); await synchronize(inbox, queue.connect(bob));
    expect(await inbox.history()).toEqual([message]); inbox.lock();
  });
  it('survives refresh/reopen, supports offline history and locks on logout', async () => {
    const { inbox, key } = await open(); await queue.enqueue(message, [bob], 1000);
    await synchronize(inbox, queue.connect(bob)); inbox.lock();
    await expect(inbox.history()).rejects.toThrow('locked');
    const reopened = await EncryptedInbox.open(bob, key, factory);
    expect(await reopened.history()).toEqual([message]); reopened.lock();
  });
  it('deduplicates repeated and concurrent delivery', async () => {
    const { inbox } = await open(); await queue.enqueue(message, [bob], 1000);
    const transport = queue.connect(bob), delivery = (await transport.pull()).deliveries[0];
    await Promise.all([inbox.store(delivery), inbox.store(delivery)]);
    await synchronize(inbox, transport); await synchronize(inbox, transport);
    expect(await inbox.history()).toHaveLength(1); inbox.lock();
  });
  it('retries a lost ACK with a persisted ACK outbox after refresh', async () => {
    const { inbox, key } = await open(); await queue.enqueue(message, [bob], 1000);
    const real = queue.connect(bob);
    await expect(synchronize(inbox, { ...real, ack: async () => { throw new Error('network lost'); } })).rejects.toThrow('network lost');
    expect(await inbox.pending()).toHaveLength(1); queue.retireAcknowledged(0); expect(queue.hasContent(message.id)).toBe(true);
    inbox.lock(); const reopened = await EncryptedInbox.open(bob, key, factory);
    await synchronize(reopened, real); expect(await reopened.pending()).toHaveLength(0);
    expect(await reopened.history()).toHaveLength(1); reopened.lock();
  });
  it('retries safely when server accepted ACK but its response was lost', async () => {
    const { inbox } = await open(); await queue.enqueue(message, [bob], 1000); const real = queue.connect(bob);
    await expect(synchronize(inbox, { ...real, ack: async (id, hash) => { await real.ack(id, hash); throw new Error('ACK response lost'); } })).rejects.toThrow();
    queue.retireAcknowledged(0); await synchronize(inbox, real);
    expect(await inbox.history()).toHaveLength(1); expect(await inbox.pending()).toHaveLength(0); inbox.lock();
  });
  it('waits for every group recipient and every required device including sender copy', async () => {
    await queue.enqueue(message, [alice, bob, bobWeb, carol], 1000);
    for (const device of [bob, bobWeb, carol]) { const { inbox } = await open(device); await synchronize(inbox, queue.connect(device)); inbox.lock(); queue.retireAcknowledged(0); expect(queue.hasContent(message.id)).toBe(true); }
    const { inbox } = await open(alice); await synchronize(inbox, queue.connect(alice)); inbox.lock();
    queue.retireAcknowledged(0); expect(queue.hasContent(message.id)).toBe(false);
  });
  it('does not ACK when local storage fails', async () => {
    const { inbox } = await open(); await queue.enqueue(message, [bob], 1000);
    vi.spyOn(inbox, 'store').mockRejectedValue(new Error('Quota exceeded'));
    const transport = queue.connect(bob), ack = vi.spyOn(transport, 'ack');
    await expect(synchronize(inbox, transport)).rejects.toThrow('Quota');
    expect(ack).not.toHaveBeenCalled(); queue.retireAcknowledged(0); expect(queue.hasContent(message.id)).toBe(true); inbox.lock();
  });
  it('rejects a wrong account, content digest or conflicting replay', async () => {
    const { inbox } = await open(); const hash = await digest(message);
    await expect(inbox.store({ envelope: message, digest: hash, target: carol })).rejects.toThrow('mismatch');
    await expect(inbox.store({ envelope: message, digest: 'wrong', target: bob })).rejects.toThrow('mismatch');
    await inbox.store({ envelope: message, digest: hash, target: bob });
    const changed = { ...message, body: 'different' };
    await expect(inbox.store({ envelope: changed, digest: await digest(changed), target: bob })).rejects.toThrow('Conflicting'); inbox.lock();
  });
  it('does not decrypt or ACK with a different unlock key', async () => {
    const { inbox } = await open(); await queue.enqueue(message, [bob], 1000);
    await inbox.store((await queue.connect(bob).pull()).deliveries[0]); inbox.lock();
    const wrong = await EncryptedInbox.open(bob, await newDeviceKey(), factory);
    const transport = queue.connect(bob), ack = vi.spyOn(transport, 'ack');
    await expect(synchronize(wrong, transport)).rejects.toThrow(); expect(ack).not.toHaveBeenCalled(); wrong.lock();
  });
  it('reports expiry explicitly without silently deleting an offline recipient copy', async () => {
    await queue.enqueue(message, [bob], 10); now += 11;
    const { inbox } = await open(); const result = await synchronize(inbox, queue.connect(bob));
    expect(result.gaps[0]).toContain('expired'); queue.retireAcknowledged(0);
    expect(queue.hasContent(message.id)).toBe(true); inbox.lock();
  });
  it('recovers an erased client while content remains; reports unrecoverable gap after retirement', async () => {
    await queue.enqueue(message, [bob], 1000); const first = await open();
    await synchronize(first.inbox, queue.connect(bob)); first.inbox.lock();
    const reinstalled = await EncryptedInbox.open(bob, await newDeviceKey(), new IDBFactory());
    await synchronize(reinstalled, queue.connect(bob)); expect(await reinstalled.history()).toHaveLength(1); reinstalled.lock();
    queue.retireAcknowledged(0);
    const lost = await EncryptedInbox.open(bob, await newDeviceKey(), new IDBFactory());
    expect((await synchronize(lost, queue.connect(bob))).gaps[0]).toContain('recover');
    expect(await lost.history()).toHaveLength(0); lost.lock();
  });
  it('denies revoked/unknown devices without discarding their pending delivery requirement', async () => {
    await queue.enqueue(message, [bob, carol], 1000); const transport = queue.connect(bob); queue.revoke(bob);
    await expect(transport.pull()).rejects.toThrow('revoked');
    expect(() => queue.connect({ account: 'stranger', device: 'web' })).toThrow('unauthorized');
    queue.retireAcknowledged(0); expect(queue.hasContent(message.id)).toBe(true);
  });
  it('enforces immutable sender idempotency and recipient fan-out', async () => {
    await queue.enqueue(message, [bob], 1000); await queue.enqueue(message, [bob], 1000);
    await expect(queue.enqueue({ ...message, body: 'changed' }, [bob], 1000)).rejects.toThrow('Idempotency');
    await expect(queue.enqueue(message, [carol], 1000)).rejects.toThrow('Idempotency');
    await expect(queue.enqueue(message, [], 1000)).rejects.toThrow('Unauthorized');
  });
});
