import type { JSX } from "react";

type ToggleProps = {
    checked: boolean;
    onChange: (value: boolean) => void;
};

export const Toggle = ({ checked, onChange }: ToggleProps): JSX.Element => {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none
        ${checked ? "bg-blue-600" : "bg-gray-300"}
      `}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-200
          ${checked ? "translate-x-5" : "translate-x-1"}
        `}
            />
        </button>
    );
};
