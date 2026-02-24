/**
 * AriaLiveRegion — Announces status messages to screen readers.
 *
 * Mount once in the app shell. Call `announce(message)` from anywhere
 * to push a screen-reader announcement (e.g. "Invite sent", "Error saving").
 *
 * Usage:
 *   import { announce } from '../components/AriaLiveRegion';
 *   announce('Artwork saved successfully');
 */

import { useState, useEffect, useCallback } from 'react';

let _announce: (msg: string) => void = () => {};

export function announce(message: string) {
  _announce(message);
}

export function AriaLiveRegion() {
  const [message, setMessage] = useState('');

  const handleAnnounce = useCallback((msg: string) => {
    // Clear first to ensure the same message can be re-announced
    setMessage('');
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  useEffect(() => {
    _announce = handleAnnounce;
    return () => {
      _announce = () => {};
    };
  }, [handleAnnounce]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
