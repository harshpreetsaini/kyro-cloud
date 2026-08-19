type Listener = () => void;

let open = false;
let collapsed = false;
const listeners = new Set<Listener>();
function emit() { for (const l of listeners) l(); }

function loadState() {
  if (typeof window === "undefined") return;
  try {
    const s = localStorage.getItem("kyro.sidebar");
    if (s) { const d = JSON.parse(s); collapsed = d.collapsed ?? false; }
  } catch {}
}
function saveState() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("kyro.sidebar", JSON.stringify({ collapsed })); } catch {}
}
if (typeof window !== "undefined") loadState();

export const sidebarStore = {
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
  getSnapshot() { return open; },
  toggle() { open = !open; emit(); },
  set(v: boolean) { open = v; emit(); },
  isCollapsed() { return collapsed; },
  setCollapsed(v: boolean) { collapsed = v; saveState(); emit(); },
  toggleCollapsed() { collapsed = !collapsed; saveState(); emit(); },
};
