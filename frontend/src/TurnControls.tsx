import { type Accessor, createEffect, type Setter } from "solid-js";

export function TurnControls(props: {
    turnAddress: Accessor<string>;
    turnUsername: Accessor<string>;
    turnPassword: Accessor<string>;
    setTurnAddress: Setter<string>;
    setTurnUsername: Setter<string>;
    setTurnPassword: Setter<string>;
}) {
    createEffect(() => {
        localStorage.setItem("turnAddress", props.turnAddress());
        localStorage.setItem("turnUsername", props.turnUsername());
        localStorage.setItem("turnPassword", props.turnPassword());
    });

    const onTextInput = (setter: Setter<string>) => {
        return (e: InputEvent & { currentTarget: HTMLInputElement }) => {
            setter(e.currentTarget.value);
        };
    };

    return (
        <div class="flex gap-1">
            <input
                class="bg-[#1C2918] border px-1 w-60"
                type="text"
                placeholder="TURN服务器地址"
                oninput={onTextInput(props.setTurnAddress)}
                value={props.turnAddress()}
            />
            <input
                class="bg-[#1C2918] border px-1 w-25"
                type="text"
                placeholder="用户名"
                oninput={onTextInput(props.setTurnUsername)}
                value={props.turnUsername()}
            />
            <input
                class="bg-[#1C2918] border px-1 w-25"
                type="password"
                placeholder="密码"
                oninput={onTextInput(props.setTurnPassword)}
                value={props.turnPassword()}
            />
        </div>
    );
}
