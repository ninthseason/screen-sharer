import { createSignal } from "solid-js";
import { TurnControls } from "./TurnControls.tsx";
import { ShareControls } from "./ShareControls.tsx";
import { RoomControls } from "./RoomControls.tsx";
import { GithubLink } from "./GithubLink.tsx";

export default function App() {
    const [roomId, setRoomId] = createSignal("");
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
    const [isHost, setIsHost] = createSignal(false);
    return (
        <div class="font-cool grid grid-rows-[auto_1fr] place-items-center gap-2 m-2">
            <div class="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 w-full">
                <div></div>
                <div class="place-self-end">
                    <TurnControls
                        turnAddress={turnAddress}
                        turnUsername={turnUsername}
                        turnPassword={turnPassword}
                        setTurnAddress={setTurnAddress}
                        setTurnUsername={setTurnUsername}
                        setTurnPassword={setTurnPassword}
                    />
                </div>
                <ShareControls
                    disabled={!isHost()}
                    isHost={isHost}
                    turnAddress={turnAddress}
                    turnUsername={turnUsername}
                    turnPassword={turnPassword}
                    ws={ws}
                />
                <div class="place-self-start">
                    <RoomControls
                        roomId={roomId}
                        targetRoomId={targetRoomId}
                        ws={ws}
                        pc={pc}
                        setRoomId={setRoomId}
                        setTargetRoomId={setTargetRoomId}
                        setWs={setWs}
                        setPc={setPc}
                        setIsHost={setIsHost}
                    />
                </div>
                <GithubLink />
            </div>
            <video
                id="vid"
                class="border max-w-300"
                autoplay
                playsinline
                controls={false}
            />
        </div>
    );
}
