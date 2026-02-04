import { Application, Router } from "@oak/oak";

const app = new Application();
const router = new Router();

/**
 * 房间结构：
 * roomId -> Map<peerId, WebSocket>
 */
const rooms = new Map<string, Map<string, WebSocket>>();

/**
 * 生成 6 位随机房间号
 */
function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 创建房间
 */
router.post("/room", (ctx) => {
  let roomId: string;

  do {
    roomId = generateRoomId();
  } while (rooms.has(roomId) && rooms.get(roomId)?.size != 0);

  rooms.set(roomId, new Map());

  ctx.response.body = {
    roomId,
  };
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
});

/**
 * WebSocket 信令入口
 * ws://host/ws?roomId=xxxxxx
 */
router.get("/ws", (ctx) => {
  const roomId = ctx.request.url.searchParams.get("roomId")!;
  if (!roomId || !rooms.has(roomId)) {
    ctx.throw(400, "Invalid roomId");
  }

  const ws = ctx.upgrade();
  const peers = rooms.get(roomId)!;
  const peerId = crypto.randomUUID();

  peers.set(peerId, ws);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "welcome", payload: { id: peerId } }));
    for (const [otherId, peer] of peers) {
      if (otherId !== peerId && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "join", from: peerId }));
      }
    }
  };

  ws.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (typeof message !== "object" || message === null) {
      return;
    }

    const payload = { ...message, from: peerId };
    if (payload.to) {
      const target = peers.get(payload.to);
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify(payload));
      }
      return;
    }

    // 转发给同房间其他成员
    for (const [otherId, peer] of peers) {
      if (otherId !== peerId && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify(payload));
      }
    }
  };

  ws.onclose = () => {
    peers.delete(peerId);

    // 通知其他成员
    for (const peer of peers.values()) {
      if (peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "leave", from: peerId }));
      }
    }

    // 房间为空时清理
    if (peers.size === 0) {
      rooms.delete(roomId);
    }
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("WebRTC signaling server running on http://localhost:8000");
await app.listen({ port: 8000, hostname: "127.0.0.1" });
