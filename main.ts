import { Application, Router } from "@oak/oak";

const app = new Application();
const router = new Router();

/**
 * 房间结构：
 * roomId -> Set<WebSocket>
 */
const rooms = new Map<string, Set<WebSocket>>();

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

  rooms.set(roomId, new Set());

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

  peers.add(ws);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "welcome" }));
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "join" }));
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

    // 转发给同房间其他成员
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify(message));
      }
    }
  };

  ws.onclose = () => {
    peers.delete(ws);

    // 通知其他成员
    for (const peer of peers) {
      if (peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "leave" }));
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
