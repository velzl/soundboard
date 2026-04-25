"use client";

import { useMemo, useState } from "react";

import { getUsernameValidationMessage, normalizeUsername } from "@/lib/username";

type UsernameEditorProps = {
  id: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
};

export function UsernameEditor({
  id,
  name,
  defaultValue,
  placeholder
}: UsernameEditorProps) {
  const [rawValue, setRawValue] = useState(defaultValue);
  const normalizedValue = useMemo(() => normalizeUsername(rawValue), [rawValue]);
  const validationMessage = useMemo(
    () => getUsernameValidationMessage(normalizedValue),
    [normalizedValue]
  );

  return (
    <div className="stack username-editor">
      <input
        id={id}
        name={name}
        value={rawValue}
        onChange={(event) => setRawValue(event.target.value)}
        placeholder={placeholder}
        maxLength={48}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <div className="stack username-preview">
        <span className="note">
          Your handle will save as <strong>@{normalizedValue || "your_handle"}</strong>
        </span>
        <span className={`note ${validationMessage ? "note-warning" : ""}`}>
          {validationMessage ??
            "3-24 characters. Lowercase letters, numbers, underscores, and periods only. Reserved app handles are blocked automatically."}
        </span>
      </div>
    </div>
  );
}
