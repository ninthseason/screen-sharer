import { type Accessor, createEffect, type Setter, Show } from "solid-js";
import { LovelyButton } from "./LovelyButton.tsx";

type WsMessage = {
    type:
        | "welcome"
        | "join"
        | "leave"
        | "offer"
        | "answer"
        | "new-ice-candidate";
};

export function RoomControls(
    props: {
        roomId: Accessor<string>;
        targetRoomId: Accessor<string>;
        ws: Accessor<WebSocket | undefined>;
        pc: Accessor<RTCPeerConnection | undefined>;
        setRoomId: Setter<string>;
        setTargetRoomId: Setter<string>;
        setWs: Setter<WebSocket | undefined>;
        setPc: Setter<RTCPeerConnection | undefined>;
    },
) {
    const roomId = props.roomId;
    const setRoomId = props.setRoomId;
    const targetRoomId = props.targetRoomId;
    const setTargetRoomId = props.setTargetRoomId;
    createEffect(() => {
        localStorage.setItem("targetRoomId", targetRoomId());
    });

    async function createRoom() {
        const resp = await fetch(
            `${import.meta.env.VITE_SIGNAL_HTTP}/room`,
            {
                method: "post",
            },
        );
        const respj = await resp.json();
        console.log(respj);
        const ws = new WebSocket(
            `${import.meta.env.VITE_SIGNAL_WS}/ws?roomId=${respj.roomId}`,
        );
        props.setWs!(ws);
        ws.onmessage = async (e) => {
            const dataj = JSON.parse(e.data) as WsMessage;
            console.log(dataj.type);
            if (dataj.type === "welcome") {
                setRoomId(respj.roomId);
            } else if (dataj.type === "join") {
                const offer = await props.pc()?.createOffer();
                ws.send(JSON.stringify(offer));
            } else if (dataj.type === "answer") {
                // deno-lint-ignore no-explicit-any
                const remoteDesc = new RTCSessionDescription(dataj as any);
                await props.pc()!.setRemoteDescription(remoteDesc);
            }
        };

        ws.onclose = () => {
            setRoomId("");
        };
    }

    function joinRoom() {
        const ws = new WebSocket(
            `${import.meta.env.VITE_SIGNAL_WS}/ws?roomId=${targetRoomId()}`,
        );
        const pc = new RTCPeerConnection();
        pc.addEventListener("track", (event) => {
            const [remoteStream] = event.streams;
            (document.querySelector("#vid") as HTMLVideoElement).srcObject =
                remoteStream;
        });
        props.setWs!(ws);
        ws.onmessage = async (e) => {
            const dataj = JSON.parse(e.data) as WsMessage;
            console.log(dataj.type);
            if (dataj.type === "welcome") {
                setRoomId(targetRoomId());
            } else if (dataj.type === "offer") {
                // deno-lint-ignore no-explicit-any
                const remoteDesc = new RTCSessionDescription(dataj as any);
                await pc.setRemoteDescription(remoteDesc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                props.ws()!.send(JSON.stringify(answer));
            } else if (dataj.type === "new-ice-candidate") {
                // deno-lint-ignore no-explicit-any
                await pc.addIceCandidate((dataj as any).payload);
            }
        };

        ws.onclose = () => {
            setRoomId("");
        };
    }

    function exitRoom() {
        props.ws()?.close();
    }

    return (
        <div class="flex gap-1">
            <div class="animate-bounce">你好，世界</div>
            <div>
                房间号:{" "}
                <span class="text-[#85E900]">
                    {roomId() === "" ? "未加入" : roomId()}
                </span>
            </div>
            <Show
                when={roomId() === ""}
                fallback={
                    <LovelyButton onclick={exitRoom}>退出房间</LovelyButton>
                }
            >
                <input
                    class="bg-[#1C2918] border px-1 w-30"
                    type="text"
                    placeholder="输入房间号"
                    oninput={(e) => {
                        setTargetRoomId(e.target.value);
                    }}
                    value={targetRoomId()}
                />
                <LovelyButton onclick={joinRoom}>加入房间</LovelyButton>
                <LovelyButton onclick={createRoom}>创建房间</LovelyButton>
            </Show>
        </div>
    );
}
