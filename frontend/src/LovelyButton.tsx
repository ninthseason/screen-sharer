import type { JSX } from "solid-js/jsx-dev-runtime";

type ButtonCallback = JSX.EventHandlerUnion<
    HTMLButtonElement,
    MouseEvent,
    JSX.EventHandler<HTMLButtonElement, MouseEvent>
>;
export function LovelyButton(
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
