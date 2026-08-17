type Listener = () => void;

let open = false;
const listeners = new Set<Listener>();
function emit() {
  for (const l of listeners) l();
}

export const sidebarStore = {
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot() {
    return open;
  },
  toggle() {
    open = !open;
    emit();
  },
  set(v: boolean) {
    open = v;
    emit();
  },
};
