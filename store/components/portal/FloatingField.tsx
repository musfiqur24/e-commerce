"use client";

import React, { useId, useState } from "react";

type BaseProps = {
  label: string;
  value?: string | null;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function FloatingLabel({
  htmlFor,
  label,
  active,
  hasAdornment,
  disabled,
  required,
}: {
  htmlFor: string;
  label: string;
  active: boolean;
  hasAdornment?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx(
        "pointer-events-none absolute z-10 bg-white px-1 font-medium transition-all duration-150",
        active
          ? "left-3 -top-2 text-[11px] text-neutral-900 truncate max-w-[calc(100%-24px)]"
          : cx(
              "top-1/2 -translate-y-1/2 text-sm text-neutral-500 truncate max-w-[calc(100%-24px)]",
              hasAdornment ? "left-10" : "left-3",
            ),
        disabled && "text-neutral-400",
      )}
    >
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  disabled = false,
  required = false,
  error,
  leftAdornment,
  onBlur,
}: BaseProps & {
  onChange: (value: string) => void;
  type?: string;
  leftAdornment?: React.ReactNode;
  onBlur?: () => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const [focused, setFocused] = useState(false);
  const stringValue = value ?? "";
  const active = focused || stringValue.length > 0 || type === "date";

  return (
    <div className={cx("relative", className)}>
      {leftAdornment && (
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-neutral-400">
          {leftAdornment}
        </div>
      )}
      <input
        id={id}
        type={type}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder=" "
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cx(
          "h-12 w-full rounded-md border bg-white py-3 text-sm text-neutral-900 outline-none transition-colors",
          leftAdornment ? "pl-10 pr-3" : "px-3",
          error
            ? "border-red-400 hover:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            : focused
              ? "border-neutral-900 ring-1 ring-neutral-900"
              : "border-neutral-300 hover:border-neutral-500",
          disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
        )}
      />
      <FloatingLabel
        htmlFor={id}
        label={label}
        active={active}
        hasAdornment={!!leftAdornment}
        disabled={disabled}
        required={required}
      />
      {error && (
        <p id={errorId} className="mt-1 text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function FloatingSelect({
  label,
  value,
  onChange,
  options,
  className = "",
  disabled = false,
  required = false,
}: BaseProps & {
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const stringValue = value ?? "";
  const active = focused || stringValue.length > 0;

  return (
    <div className={cx("relative", className)}>
      <select
        id={id}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        required={required}
        className={cx(
          "h-12 w-full appearance-none rounded-md border bg-white px-3 py-3 text-sm outline-none transition-colors",
          stringValue ? "text-neutral-900" : "text-transparent",
          focused ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-300 hover:border-neutral-500",
          disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
        )}
      >
        <option value="" disabled>
          {label}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-neutral-900">
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
        ▾
      </span>
      <FloatingLabel
        htmlFor={id}
        label={label}
        active={active}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

export function FloatingTextarea({
  label,
  value,
  onChange,
  className = "",
  disabled = false,
  required = false,
  rows = 3,
}: BaseProps & {
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const stringValue = value ?? "";
  const active = focused || stringValue.length > 0;

  return (
    <div className={cx("relative", className)}>
      <textarea
        id={id}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        disabled={disabled}
        required={required}
        rows={rows}
        className={cx(
          "min-h-15 w-full resize-none rounded-md border bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-colors",
          focused ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-300 hover:border-neutral-500",
          disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
        )}
      />
      <label
        htmlFor={id}
        className={cx(
          "pointer-events-none absolute z-10 bg-white px-1 font-medium transition-all duration-150",
          active
            ? "left-3 -top-2 text-[11px] text-neutral-900 truncate max-w-[calc(100%-24px)]"
            : "left-3 top-3 text-sm text-neutral-500 truncate max-w-[calc(100%-24px)]",
          disabled && "text-neutral-400",
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
    </div>
  );
}
