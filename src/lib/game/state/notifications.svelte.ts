// Short-lived toasts (e.g. "Quest ready") - shown by Toasts.svelte, which
// removes each one after a few seconds.

export interface Toast {
  id: number;
  title: string;
  text: string;
}

export const notifications: { toasts: Toast[] } = $state({ toasts: [] });

let nextId = 0;

export function pushToast(title: string, text: string): void {
  nextId += 1;
  notifications.toasts.push({ id: nextId, title, text });
}

export function dismissToast(id: number): void {
  const index = notifications.toasts.findIndex((t) => t.id === id);
  if (index !== -1) notifications.toasts.splice(index, 1);
}
