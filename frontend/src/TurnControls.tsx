import { type Accessor, createEffect, type Setter } from "solid-js";

export function TurnControls(props: {
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
