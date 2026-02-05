import {
    type Accessor,
    createEffect,
    createSignal,
    on,
    onCleanup,
} from "solid-js";
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

export function ShareControls(
    props: {
        disabled?: boolean;
        isHost: Accessor<boolean>;
        turnAddress: Accessor<string>;
        turnUsername: Accessor<string>;
        turnPassword: Accessor<string>;
        ws: Accessor<WebSocket | undefined>;
    },
) {
    const [mediaStream, setMediaStream] = createSignal<MediaStream | null>(
        null,
    );
    const isSharing = () => mediaStream() !== null;
    const peers = new Set<string>();
    const peerConnections = new Map<string, RTCPeerConnection>();

    createEffect(on(mediaStream, () => {
        const vid = document.querySelector("#vid") as HTMLVideoElement;
        vid.srcObject = mediaStream();
    }));

    createEffect(() => {
        if (props.isHost()) return;
        if (isSharing()) {
            stopShare();
        }
    });

    createEffect(() => {
        const socket = props.ws();
        if (!socket) return;
        const onClose = () => {
            if (isSharing()) {
                stopShare();
            }
        };
        socket.addEventListener("close", onClose);
        onCleanup(() => {
            socket.removeEventListener("close", onClose);
        });
    });

    function getIceServers() {
        return [
            { urls: "stun:stun.l.google.com:19302" },
            {
                urls: props.turnAddress(),
                username: props.turnUsername(),
                credential: props.turnPassword(),
            },
        ];
    }

    function closeAllPeerConnections() {
        for (const pc of peerConnections.values()) {
            pc.close();
        }
        peerConnections.clear();
    }

    async function createOfferForPeer(peerId: string) {
        const media = mediaStream();
        if (!media) return;
        if (peerConnections.has(peerId)) return;

        const pc = new RTCPeerConnection({
            iceServers: getIceServers(),
            // iceTransportPolicy: "relay",
        });
        peerConnections.set(peerId, pc);

        media.getTracks().forEach((track) => {
            pc.addTrack(track, media);
        });

        pc.addEventListener("icecandidate", (event) => {
            if (event.candidate) {
                props.ws()!.send(
                    JSON.stringify({
                        type: "new-ice-candidate",
                        to: peerId,
                        payload: event.candidate,
                    }),
                );
            }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        props.ws()!.send(
            JSON.stringify({
                type: "offer",
                to: peerId,
                payload: offer,
            }),
        );
    }

    function handleSignal(message: WsMessage) {
        if (message.type === "welcome") {
            peers.clear();
            closeAllPeerConnections();
            return;
        }
        if (message.type === "join" && message.from) {
            peers.add(message.from);
            if (isSharing()) {
                void createOfferForPeer(message.from);
            }
            return;
        }
        if (message.type === "leave" && message.from) {
            peers.delete(message.from);
            const pc = peerConnections.get(message.from);
            if (pc) {
                pc.close();
                peerConnections.delete(message.from);
            }
            return;
        }
        if (message.type === "answer" && message.from) {
            const pc = peerConnections.get(message.from);
            if (!pc) return;
            const remoteDesc = new RTCSessionDescription(
                // deno-lint-ignore no-explicit-any
                message.payload as any,
            );
            void pc.setRemoteDescription(remoteDesc);
            return;
        }
        if (message.type === "new-ice-candidate" && message.from) {
            const pc = peerConnections.get(message.from);
            if (!pc) return;
            void pc.addIceCandidate(message.payload);
        }
    }

    createEffect(() => {
        const socket = props.ws();
        if (!socket) return;
        const onMessage = (e: MessageEvent) => {
            const dataj = JSON.parse(e.data) as WsMessage;
            handleSignal(dataj);
        };
        socket.addEventListener("message", onMessage);
        onCleanup(() => {
            socket.removeEventListener("message", onMessage);
        });
    });

    async function startShare() {
        try {
            const media = await navigator.mediaDevices.getDisplayMedia({
                // audio: true,
                video: true,
            });
            setMediaStream(media);
            media.getVideoTracks()[0].addEventListener("ended", () => {
                console.log("Share end.");
                setMediaStream(null);
                closeAllPeerConnections();
            });
            for (const peerId of peers) {
                await createOfferForPeer(peerId);
            }
        } catch (err) {
            console.warn(err);
        }
    }

    function stopShare() {
        if (mediaStream() === null) return;
        mediaStream()?.getVideoTracks()[0].stop();
        setMediaStream(null);
        closeAllPeerConnections();
        props.ws()?.send(JSON.stringify({ type: "share-stopped" }));
    }

    return (
        <LovelyButton
            rotate={false}
            scale={false}
            onclick={() => (isSharing() ? stopShare() : startShare())}
            disabled={props.disabled ?? false}
        >
            {isSharing() ? "结束共享" : "共享屏幕"}
        </LovelyButton>
    );
}
