import { type Accessor, createEffect, type Setter, Show } from "solid-js";
import { LovelyButton } from "./LovelyButton.tsx";

type WsMessage = {
    type:
        | "welcome"
        | "join"
        | "leave"
        | "offer"
        | "answer"
        | "new-ice-candidate"
        | "share-stopped";
    from?: string;
    to?: string;
    // deno-lint-ignore no-explicit-any
    payload?: any;
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
        setIsHost: Setter<boolean>;
    },
) {
    let hostPeerId = "";
    createEffect(() => {
        localStorage.setItem("targetRoomId", props.targetRoomId());
    });

    async function createRoom() {
        const resp = await fetch(
            `${import.meta.env.VITE_SIGNAL_HTTP}/room`,
            {
                method: "post",
            },
        );
        const respj = await resp.json();
        // console.log(respj);
        const ws = new WebSocket(
            `${import.meta.env.VITE_SIGNAL_WS}/ws?roomId=${respj.roomId}`,
        );
        props.setWs(ws);
        props.setIsHost(true);
        ws.addEventListener("message", (e) => {
            const dataj = JSON.parse(e.data) as WsMessage;
            console.log(dataj.type);
            if (dataj.type === "welcome") {
                props.setRoomId(respj.roomId);
            }
        });

        ws.onclose = () => {
            props.setRoomId("");
            props.setPc(undefined);
            hostPeerId = "";
            props.setIsHost(false);
        };
    }

    function joinRoom() {
        const ws = new WebSocket(
            `${import.meta.env.VITE_SIGNAL_WS}/ws?roomId=${props.targetRoomId()}`,
        );
        const pc = new RTCPeerConnection();
        const video = document.querySelector("#vid") as HTMLVideoElement;
        pc.addEventListener("track", (event) => {
            const [remoteStream] = event.streams;
            video.srcObject = remoteStream;
        });
        pc.addEventListener("icecandidate", (event) => {
            if (!event.candidate || hostPeerId === "") return;
            ws.send(
                JSON.stringify({
                    type: "new-ice-candidate",
                    to: hostPeerId,
                    payload: event.candidate,
                }),
            );
        });
        props.setWs(ws);
        props.setPc(pc);
        props.setIsHost(false);
        ws.addEventListener("message", async (e) => {
            const dataj = JSON.parse(e.data) as WsMessage;
            console.log(dataj.type);
            if (dataj.type === "welcome") {
                props.setRoomId(props.targetRoomId());
                return;
            }
            if (dataj.type === "share-stopped") {
                video.srcObject = null;
                return;
            }
            if (dataj.type === "offer") {
                hostPeerId = dataj.from ?? hostPeerId;
                const remoteDesc = new RTCSessionDescription(
                    // deno-lint-ignore no-explicit-any
                    dataj.payload as any,
                );
                await pc.setRemoteDescription(remoteDesc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                props.ws()!.send(
                    JSON.stringify({
                        type: "answer",
                        to: hostPeerId,
                        payload: answer,
                    }),
                );
                return;
            }
            if (dataj.type === "new-ice-candidate") {
                await pc.addIceCandidate(dataj.payload);
            }
        });

        ws.onclose = () => {
            props.setRoomId("");
            props.setPc(undefined);
            hostPeerId = "";
            props.setIsHost(false);
        };
    }

    function exitRoom() {
        props.ws()?.send(JSON.stringify({ type: "share-stopped" }));
        props.ws()?.close();
        props.setIsHost(false);
    }

    return (
        <div class="flex gap-1">
            <div class="animate-bounce">你好，世界</div>
            <div>
                房间号:{" "}
                <span class="text-[#85E900]">
                    {props.roomId() === "" ? "未加入" : props.roomId()}
                </span>
            </div>
            <Show
                when={props.roomId() === ""}
                fallback={
                    <LovelyButton onclick={exitRoom}>退出房间</LovelyButton>
                }
            >
                <input
                    class="bg-[#1C2918] border px-1 w-30"
                    type="text"
                    placeholder="输入房间号"
                    oninput={(e) => {
                        props.setTargetRoomId(e.target.value);
                    }}
                    value={props.targetRoomId()}
                />
                <LovelyButton onclick={joinRoom}>加入房间</LovelyButton>
                <LovelyButton onclick={createRoom}>创建房间</LovelyButton>
            </Show>
        </div>
    );
}
