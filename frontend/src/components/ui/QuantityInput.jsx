import { useEffect, useState } from 'react';

export default function QuantityInput({ value, max, onChange, className = 'input-field w-20 !py-1' }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw) => {
    const trimmed = String(raw).trim();
    if (!trimmed) {
      setDraft(String(value));
      return;
    }
    const num = parseInt(trimmed, 10);
    if (Number.isNaN(num)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(Math.max(1, num), max);
    onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={draft}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || /^\d+$/.test(v)) setDraft(v);
      }}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(draft);
        }
      }}
    />
  );
}
