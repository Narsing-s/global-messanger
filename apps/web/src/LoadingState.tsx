import React from 'react';
import './loading-state.css';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <span className="gm-loading" role="status" aria-live="polite">
      <span className="gm-loading-spinner" aria-hidden="true" />
      <span className="gm-loading-text">{label}</span>
    </span>
  );
}