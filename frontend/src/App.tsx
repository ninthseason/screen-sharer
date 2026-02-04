import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    type JSX,
    on,
    type Setter,
    Show,
} from "solid-js";

export default function App() {
    const [roomId, setRoomId] = createSignal<string>("");
    const [targetRoomId, setTargetRoomId] = createSignal(
        localStorage.getItem("targetRoomId") ?? "",
    );
    const [turnAddress, setTurnAddress] = createSignal(
        localStorage.getItem("turnAddress") ?? "",
    );
    const [turnUsername, setTurnUsername] = createSignal(
        localStorage.getItem("turnUsername") ?? "",
    );
    const [turnPassword, setTurnPassword] = createSignal(
        localStorage.getItem("turnPassword") ?? "",
    );
    const [ws, setWs] = createSignal<WebSocket>();
    const [pc, setPc] = createSignal<RTCPeerConnection>();
    return (
        <div class="font-cool grid grid-rows-[auto_1fr] place-items-center gap-2 m-2">
            <div class="grid grid-cols-3 gap-2">
                <div class="place-self-end">
                    <TurnControls
                        turnAddress={turnAddress}
                        turnUsername={turnUsername}
                        turnPassword={turnPassword}
                        setTurnAddress={setTurnAddress}
                        setTurnUsername={setTurnUsername}
                        setTurnPassword={setTurnPassword}
                    >
                    </TurnControls>
                </div>
                <ShareControls
                    disabled={roomId() === ""}
                    turnAddress={turnAddress}
                    turnUsername={turnUsername}
                    turnPassword={turnPassword}
                    ws={ws}
                    setPc={setPc}
                >
                </ShareControls>
                <div class="place-self-start">
                    <RoomControls
                        roomId={roomId}
                        targetRoomId={targetRoomId}
                        ws={ws}
                        setRoomId={setRoomId}
                        setTargetRoomId={setTargetRoomId}
                        setWs={setWs}
                        pc={pc}
                    >
                    </RoomControls>
                </div>
            </div>
            <video
                id="vid"
                class="border max-w-300"
                autoplay
                playsinline
                controls={false}
            >
            </video>
        </div>
    );
}

function TurnControls(props: {
    turnAddress: Accessor<string>;
    turnUsername: Accessor<string>;
    turnPassword: Accessor<string>;
    setTurnAddress: Setter<string>;
    setTurnUsername: Setter<string>;
    setTurnPassword: Setter<string>;
}) {
    const turnAddress = props.turnAddress;
    const setTurnAddress = props.setTurnAddress;
    const turnUsername = props.turnUsername;
    const setTurnUsername = props.setTurnUsername;
    const turnPassword = props.turnPassword;
    const setTurnPassword = props.setTurnPassword;
    createEffect(() => {
        localStorage.setItem("turnAddress", turnAddress());
        localStorage.setItem("turnUsername", turnUsername());
        localStorage.setItem("turnPassword", turnPassword());
    });

    return (
        <div class="flex gap-1">
            <input
                class="bg-[#1C2918] border px-1 w-60"
                type="text"
                placeholder="TURN服务器地址"
                oninput={(e) => {
                    setTurnAddress(e.target.value);
                }}
                value={turnAddress()}
            />
            <input
                class="bg-[#1C2918] border px-1 w-25"
                type="text"
                placeholder="用户名"
                oninput={(e) => {
                    setTurnUsername(e.target.value);
                }}
                value={turnUsername()}
            />
            <input
                class="bg-[#1C2918] border px-1 w-25"
                type="password"
                placeholder="密码"
                oninput={(e) => {
                    setTurnPassword(e.target.value);
                }}
                value={turnPassword()}
            />
        </div>
    );
}

function ShareControls(
    props: {
        disabled?: boolean;
        turnAddress: Accessor<string>;
        turnUsername: Accessor<string>;
        turnPassword: Accessor<string>;
        ws: Accessor<WebSocket | undefined>;
        setPc: Setter<RTCPeerConnection | undefined>;
    },
) {
    const turnAddress = props.turnAddress;
    const turnUsername = props.turnUsername;
    const turnPassword = props.turnPassword;
    const ws = props.ws;

    const [mediaStream, setMediaStream] = createSignal<MediaStream | null>(
        null,
    );
    const isSharing = createMemo(() => mediaStream() != null);

    createEffect(on(mediaStream, () => {
        const vid = document.querySelector("#vid") as HTMLVideoElement;
        vid.srcObject = mediaStream();
    }));

    function startShare() {
        navigator.mediaDevices.getDisplayMedia({
            // audio: true,
            video: true,
        })
            .then((media) => {
                // console.log(media);
                setMediaStream(media);
                media.getVideoTracks()[0].addEventListener("ended", () => {
                    console.log("Share end.");
                    setMediaStream(null);
                });
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { "urls": "stun:stun.l.google.com:19302" },
                        {
                            urls: turnAddress(),
                            username: turnUsername(),
                            credential: turnPassword(),
                        },
                    ],
                });

                media.getTracks().forEach((track) => {
                    pc.addTrack(track, media);
                });

                pc.addEventListener("icecandidate", (event) => {
                    if (event.candidate) {
                        // console.log(event.candidate);
                        ws()!.send(
                            JSON.stringify({
                                type: "new-ice-candidate",
                                payload: event.candidate,
                            }),
                        );
                    }
                });
                props.setPc(pc);
                return pc.createOffer().then((offer) => {
                    pc.setLocalDescription(offer);
                    return offer;
                }).then((offer) => ws()!.send(JSON.stringify(offer)));
            })
            .catch((err) => console.warn(err));
    }

    function stopShare() {
        if (mediaStream() === null) return;
        mediaStream()?.getVideoTracks()[0].stop();
        setMediaStream(null);
    }

    return (
        <Show
            when={isSharing()}
            fallback={
                <LovelyButton
                    rotate={false}
                    scale={false}
                    onclick={startShare}
                    disabled={props.disabled ?? false}
                >
                    共享屏幕
                </LovelyButton>
            }
        >
            <LovelyButton
                rotate={false}
                scale={false}
                onclick={stopShare}
                disabled={props.disabled ?? false}
            >
                结束共享
            </LovelyButton>
        </Show>
    );
}

type WsMessage = {
    type:
        | "welcome"
        | "join"
        | "leave"
        | "offer"
        | "answer"
        | "new-ice-candidate";
};

function RoomControls(
    props: {
        roomId: Accessor<string>;
        targetRoomId: Accessor<string>;
        ws: Accessor<WebSocket | undefined>;
        setRoomId: Setter<string>;
        setTargetRoomId: Setter<string>;
        setWs: Setter<WebSocket | undefined>;
        pc: Accessor<RTCPeerConnection | undefined>;
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
        const resp = await fetch("http://127.0.0.1:8000/room", {
            method: "post",
        });
        const respj = await resp.json();
        console.log(respj);
        const ws = new WebSocket(
            `ws://localhost:8000/ws?roomId=${respj.roomId}`,
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
            `ws://localhost:8000/ws?roomId=${targetRoomId()}`,
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
            <div>房间号: {roomId() === "" ? "未加入" : roomId()}</div>
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

type ButtonCallback = JSX.EventHandlerUnion<
    HTMLButtonElement,
    MouseEvent,
    JSX.EventHandler<HTMLButtonElement, MouseEvent>
>;
function LovelyButton(
    props: {
        children?: JSX.Element;
        onclick?: ButtonCallback;
        rotate?: boolean;
        scale?: boolean;
        disabled?: boolean;
    },
) {
    return (
        <button
            type="button"
            onclick={props.onclick}
            class={`border transition-all duration-100 px-2 select-none
            not-disabled:cursor-pointer
            not-disabled:hover:bg-base-100
            ${(props.rotate ?? true) ? "not-disabled:hover:rotate-1" : ""}
            ${(props.scale ?? true) ? "not-disabled:hover:scale-110" : ""}
            
            disabled:cursor-not-allowed
            disabled:text-gray-400
            `}
            disabled={props.disabled ?? false}
        >
            {props.children}
        </button>
    );
}
