import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    on,
    type Setter,
    Show,
} from "solid-js";
import { LovelyButton } from "./LovelyButton.tsx";

export function ShareControls(
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
