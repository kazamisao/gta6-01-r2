// Autosave: the player's progress as one JSON string in localStorage.
// saveState only serialises (pure, testable); the game module owns the storage.
export function saveState(state) {
  return JSON.stringify(state);
}

export function loadState(json) {
  try {
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}
