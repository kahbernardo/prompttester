"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

type CheckButtonProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function CheckButton({ id, checked, onCheckedChange, label, disabled = false, compact = false, className = "" }: CheckButtonProps) {
  return (
    <label htmlFor={id} className={`inline-flex cursor-pointer items-center gap-2 ${disabled ? "opacity-60" : ""} ${className}`}>
      <Checkbox.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        className={`flex items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-100 transition data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white ${
          compact ? "h-4 w-4" : "h-5 w-5"
        }`}
      >
        <Checkbox.Indicator>
          <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span className={`${compact ? "text-xs" : "text-sm"} font-medium text-zinc-200`}>{label}</span>
    </label>
  );
}
