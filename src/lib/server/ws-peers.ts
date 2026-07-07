/**
 * In-memory peer registry per room. Peers are `ws` WebSocket instances (or any
 * object with a `send` method). Works within a single Node process — the same
 * guarantee the original app had.
 *
 * The registry lives on globalThis so the Next.js Route Handlers bundle and
 * the custom server (server.js) share the same instance.
 */

export interface WsPeer {
  id: string;
  send(data: string): void;
}

const globalWithPeers = globalThis as typeof globalThis & {
  __wsPeersByRoom?: Map<string, Set<WsPeer>>;
};

const peersByRoom: Map<string, Set<WsPeer>> = (globalWithPeers.__wsPeersByRoom ??=
  new Map());

export function registerWsPeer(peer: WsPeer, roomName: string): void {
  let peers = peersByRoom.get(roomName);
  if (!peers) {
    peers = new Set();
    peersByRoom.set(roomName, peers);
  }
  peers.add(peer);
}

export function unregisterWsPeer(peer: WsPeer, roomName: string): void {
  const peers = peersByRoom.get(roomName);
  if (!peers) return;
  peers.delete(peer);
  if (peers.size === 0) peersByRoom.delete(roomName);
}

export function roomPeerCount(roomName: string): number {
  return peersByRoom.get(roomName)?.size ?? 0;
}

/** Push an event to every connected peer in the room (optionally excluding one). */
export function pushToRoom(
  roomName: string,
  event: string,
  data: unknown,
  excludePeer?: WsPeer,
): void {
  const payload = JSON.stringify({ event, data });
  const peers = peersByRoom.get(roomName);
  if (!peers) return;

  for (const peer of peers) {
    if (peer === excludePeer) continue;
    try {
      peer.send(payload);
    } catch {
      // peer may have disconnected
    }
  }
}
