type Listener = (alerts: string[]) => void;

const listeners = new Set<Listener>();
let currentAlerts: string[] = [];

export function publishSystemAlerts(alerts: string[]): void {
  currentAlerts = alerts;
  listeners.forEach(cb => cb(alerts));
}

export function subscribeSystemAlerts(cb: Listener): () => void {
  listeners.add(cb);
  cb(currentAlerts); // fire immediately with current state
  return () => listeners.delete(cb);
}

export function getSystemAlerts(): string[] {
  return currentAlerts;
}
