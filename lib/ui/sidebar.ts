type Listener = () => void;

let open = false;
let collapsed = false;
const listeners = new Set<Listener>();
function emit() { for (const l of listeners) l(); }

function loadState() {
  if (typeof window === "undefined") return;
  try {
    const s = localStorage.getItem("kyro.sidebar");
    if (s) { const d = JSON.parse(s); collapsed = d.collapsed ?? false; emit(); }
  } catch {}
}
function saveState() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("kyro.sidebar", JSON.stringify({ collapsed })); } catch {}
}
// Hydration safety: do NOT read localStorage at module init (server snapshot
// must match the first client render). Load it post-mount instead.
if (typeof window !== "undefined") {
  setTimeout(loadState, 0);
}

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
