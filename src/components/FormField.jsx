import React from "react";

export function Field({ label, required, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-500">
        {label} {required && <span className="text-coral-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mist-500">{hint}</span>}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none placeholder:text-mist-300 focus:border-teal-500 ${
        props.className || ""
      }`}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none focus:border-teal-500 ${
        props.className || ""
      }`}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none placeholder:text-mist-300 focus:border-teal-500 ${
        props.className || ""
      }`}
    />
  );
}
