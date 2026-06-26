"use client";

import React, { useState, useEffect } from "react";

interface DebouncedTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const DebouncedTextarea = ({
  value,
  onChange,
  placeholder,
  rows,
  className,
  id,
  disabled
}: DebouncedTextareaProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <textarea
      id={id}
      disabled={disabled}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={className}
    />
  );
};

export default DebouncedTextarea;
