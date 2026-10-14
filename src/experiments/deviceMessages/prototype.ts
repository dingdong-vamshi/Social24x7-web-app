/** ISOLATED PROTOTYPE. No Supabase client, production route, or deletion job imports this module. */
export interface Device { account: string; device: string }
export interface Envelope { id: string; body: string; sender: string; conversation: string; createdAt: number }
export interface Delivery { envelope: Envelope; digest: string; target: Device }
interface Stored { id: string; digest: string; iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer; pendingAck: boolean }
const scope = (d: Device) => JSON.stringify([d.account, d.device]);
const encode = (text: string) => new TextEncoder().encode(text);
export async function digest(envelope: Envelope) {
  const value = await crypto.subtle.digest('SHA-256', encode(JSON.stringify([envelope.id, envelope.body, envelope.sender, envelope.conversation, envelope.createdAt])));
  return Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');
}
export const newDeviceKey = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

/** Key provisioning/unlock is deliberately injected, not persisted beside ciphertext. */
export class EncryptedInbox {
  private constructor(private db: IDBDatabase, readonly device: Device, private key: CryptoKey | null) {}
  static async open(device: Device, key: CryptoKey, factory: IDBFactory = indexedDB) {
    if (!device.account || !device.device || key.extractable || key.algorithm.name !== 'AES-GCM') throw new Error('An account-bound device and non-exportable AES-GCM key are required.');
    const request = factory.open('social24-isolated-inbox-v1:' + scope(device), 1);
    request.onupgradeneeded = () => request.result.createObjectStore('inbox', { keyPath: 'id' });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Inbox upgrade blocked by another open client.'));
    });
    db.onversionchange = () => db.close();
    return new EncryptedInbox(db, { ...device }, key);
  }
  private unlocked() { if (!this.key) throw new Error('Device inbox is locked.'); return this.key; }
  private aad(id: string) { return encode(JSON.stringify([scope(this.device), id, 1])); }
  private records(): Promise<Stored[]> {
    this.unlocked();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('inbox', 'readonly');
      const request = tx.objectStore('inbox').getAll();
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Inbox read failed.'));
    });
  }
  async store(delivery: Delivery) {
    const key = this.unlocked();
    if (scope(delivery.target) !== scope(this.device) || await digest(delivery.envelope) !== delivery.digest) throw new Error('Delivery identity or content mismatch.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: this.aad(delivery.envelope.id) }, key, encode(JSON.stringify(delivery.envelope)));
    // Transaction completion, NOT request success, is the ACK boundary.
    await new Promise<void>((resolve, reject) => {
      const tx = this.db.transaction('inbox', 'readwrite', { durability: 'strict' });
      const objectStore = tx.objectStore('inbox');
      const existing = objectStore.get(delivery.envelope.id);
      let conflict = false;
      existing.onsuccess = () => {
        if (existing.result && existing.result.digest !== delivery.digest) { conflict = true; tx.abort(); return; }
        if (!existing.result) objectStore.add({ id: delivery.envelope.id, digest: delivery.digest, iv, ciphertext, pendingAck: true } satisfies Stored);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error(conflict ? 'Conflicting replay refused.' : 'Local commit failed; delivery remains unacknowledged.'));
    });
  }
  async pending() { return (await this.records()).filter(row => row.pendingAck).map(({ id, digest }) => ({ id, digest })); }
  async acknowledged(id: string) {
    this.unlocked();
    await new Promise<void>((resolve, reject) => {
      const tx = this.db.transaction('inbox', 'readwrite', { durability: 'strict' });
      const table = tx.objectStore('inbox'), get = table.get(id);
      get.onsuccess = () => { if (get.result) table.put({ ...get.result, pendingAck: false }); };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('ACK checkpoint failed; retry is safe.'));
    });
  }
  async history() {
    const key = this.unlocked();
    const rows = await this.records();
    const entries = await Promise.all(rows.map(async row => {
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: row.iv, additionalData: this.aad(row.id) }, key, row.ciphertext);
      const entry: Envelope = JSON.parse(new TextDecoder().decode(plaintext));
      if (entry.id !== row.id || await digest(entry) !== row.digest) throw new Error('Local integrity check failed.');
      return entry;
    }));
    return entries.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }
  lock() { this.key = null; this.db.close(); }
}

interface Queued { envelope: Envelope | null; digest: string; targets: Set<string>; acked: Set<string>; expiresAt: number; allAckedAt: number | null }
export interface QueueTransport { pull(): Promise<{ deliveries: Delivery[]; gaps: string[] }>; ack(id: string, digest: string): Promise<void> }

/** In-memory fake SERVER only. Authentication is simulated with a pre-authorized device binding. */
export class SimulatedQueue {
  private messages = new Map<string, Queued>();
  constructor(private authorized: Device[], private now: () => number = Date.now) {}
  async enqueue(envelope: Envelope, targets: Device[], ttl: number) {
    if (!targets.length || ttl <= 0 || targets.some(d => !this.authorized.some(a => scope(a) === scope(d)))) throw new Error('Unauthorized or empty delivery set.');
    const hash = await digest(envelope), existing = this.messages.get(envelope.id);
    if (existing) {
      if (existing.digest !== hash || JSON.stringify([...existing.targets].sort()) !== JSON.stringify([...new Set(targets.map(scope))].sort())) throw new Error('Idempotency conflict.');
      return;
    }
    this.messages.set(envelope.id, { envelope: { ...envelope }, digest: hash, targets: new Set(targets.map(scope)), acked: new Set(), expiresAt: this.now() + ttl, allAckedAt: null });
  }
  connect(device: Device): QueueTransport {
    const target = { ...device }, binding = scope(target);
    const check = () => { if (!this.authorized.some(d => scope(d) === binding)) throw new Error('Device is unauthorized or revoked.'); };
    check();
    return {
      pull: async () => {
        check();
        const deliveries: Delivery[] = [], gaps: string[] = [];
        for (const [id, row] of this.messages) {
          if (!row.targets.has(binding)) continue;
          // Tombstones are visible even to previously ACKed devices after reinstall.
          if (!row.envelope) { gaps.push(id + ': server content retired; recover from another device or backup'); continue; }
          if (this.now() >= row.expiresAt) { gaps.push(id + ': delivery window expired; content retained pending policy'); continue; }
          deliveries.push({ envelope: { ...row.envelope }, digest: row.digest, target });
        }
        return { deliveries, gaps };
      },
      ack: async (id, hash) => {
        check();
        const row = this.messages.get(id);
        if (!row || !row.targets.has(binding) || row.digest !== hash) throw new Error('Invalid delivery ACK.');
        row.acked.add(binding);
        if (row.acked.size === row.targets.size && row.allAckedAt === null) row.allAckedAt = this.now();
      },
    };
  }
  revoke(device: Device) { this.authorized = this.authorized.filter(d => scope(d) !== scope(device)); }
  // Simulation requires explicit invocation; no timers, production transport or SQL.
  retireAcknowledged(graceMs: number) {
    if (graceMs < 0) throw new Error('Invalid retention grace period.');
    for (const row of this.messages.values()) if (row.allAckedAt !== null && this.now() >= row.allAckedAt + graceMs) row.envelope = null;
  }
  hasContent(id: string) { return !!this.messages.get(id)?.envelope; }
}

export async function synchronize(inbox: EncryptedInbox, transport: QueueTransport) {
  const { deliveries, gaps } = await transport.pull();
  for (const delivery of deliveries) await inbox.store(delivery);
  const local = new Set((await inbox.history()).map(e => e.id));
  for (const receipt of await inbox.pending()) {
    await transport.ack(receipt.id, receipt.digest);
    await inbox.acknowledged(receipt.id);
  }
  return { stored: deliveries.length, gaps: gaps.filter(gap => !local.has(gap.split(':')[0])) };
}
