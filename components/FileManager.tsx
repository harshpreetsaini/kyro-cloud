"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { FileItem } from "@shared/types";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button } from "@/components/ui";

function fmtSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const t = new Date(d);
  return isNaN(t.getTime()) ? "—" : t.toLocaleString();
}

type SortKey = "name" | "size" | "type" | "modified";

export function FileManager({ basePath = "/" }: { basePath?: string }) {
  const [path, setPath] = useState(basePath);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(api(`/api/files/list?path=${encodeURIComponent(p)}`), {
        headers: { ...authHeader() },
      });
      const json = await res.json();
      setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(path);
  }, [path, load]);

  const segments = useMemo(() => {
    const parts = path.split("/").filter(Boolean);
    const acc: { name: string; path: string }[] = [];
    let cur = "";
    for (const p of parts) {
      cur += "/" + p;
      acc.push({ name: p, path: cur });
    }
    return acc;
  }, [path]);

  const sorted = useMemo(() => {
    const list = items.filter((it) =>
      it.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...list].sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      switch (sortBy) {
        case "size":
          return (a.sizeBytes || 0) - (b.sizeBytes || 0);
        case "type":
          return a.name.localeCompare(b.name);
        case "modified":
          return (a.modified || "").localeCompare(b.modified || "");
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [items, search, sortBy]);

  async function mkdir() {
    if (!folderName) return;
    await fetch(api("/api/files/mkdir"), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify({ path, name: folderName }),
    });
    setNewFolder(false);
    setFolderName("");
    load(path);
  }

  async function del(item: FileItem) {
    if (!confirm(`Delete ${item.name}?`)) return;
    await fetch(api(`/api/files/delete?path=${encodeURIComponent(item.path)}`), {
      method: "DELETE",
      headers: { ...authHeader() },
    });
    load(path);
  }

  async function doRename(item: FileItem) {
    if (!renameVal) return;
    await fetch(api("/api/files/rename"), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify({ path: item.path, newName: renameVal }),
    });
    setRenaming(null);
    load(path);
  }

  function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", path);
    const id = `${file.name}-${Date.now()}`;
    setUploads((u) => [...u, { name: file.name, progress: 0 }]);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", api("/api/files/upload"));
    for (const [k, v] of Object.entries(authHeader())) xhr.setRequestHeader(k, v as string);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, progress: pct } : x)));
    };
    xhr.onload = () => {
      setUploads((u) => u.filter((x) => x.name !== file.name));
      load(path);
    };
    xhr.send(fd);
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  async function download(item: FileItem) {
    const res = await fetch(api(`/api/files/download?path=${encodeURIComponent(item.path)}`), {
      headers: { ...authHeader() },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={`panel p-4 flex flex-col gap-3 h-full ${dragActive ? "ring-2 ring-accent" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <nav className="flex items-center gap-1 text-sm mono text-muted flex-wrap">
          <button className="text-accent hover:underline" onClick={() => setPath("/")}>
            Home
          </button>
          {segments.map((s) => (
            <span key={s.path} className="flex items-center gap-1">
              <span>/</span>
              <button className="text-accent hover:underline" onClick={() => setPath(s.path)}>
                {s.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="bg-secondary rounded-lg px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button className="text-xs text-muted hover:text-text px-2 py-1" onClick={() => fileInput.current?.click()} title="Upload">
            ⤓ Upload
          </button>
          <button className="text-xs text-muted hover:text-text px-2 py-1" onClick={() => setNewFolder((v) => !v)} title="New folder">
            + Folder
          </button>
          <button className="text-xs text-muted hover:text-text px-2 py-1" onClick={() => load(path)} title="Refresh">
            ↻
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </div>
      </div>

      {newFolder && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="bg-secondary rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button className="!py-1 !px-3 text-xs" onClick={mkdir}>
            Create
          </Button>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="flex flex-col gap-1">
          {uploads.map((u) => (
            <div key={u.name} className="text-[11px] text-muted flex items-center gap-2">
              <span className="truncate flex-1">⤓ {u.name}</span>
              <span className="mono w-10 text-right">{u.progress}%</span>
              <span className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                <span className="block h-full bg-accent" style={{ width: `${u.progress}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-auto flex-1">
        {loading ? (
          <p className="text-sm text-muted py-8 text-center">Loading files…</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="font-medium tracking-wide">THIS FOLDER IS EMPTY</p>
            <div className="flex gap-2">
              <Button className="!py-1 !px-3 text-xs" onClick={() => fileInput.current?.click()}>
                Upload file
              </Button>
              <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => setNewFolder(true)}>
                New folder
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-white/5">
                <th className="py-2 font-medium cursor-pointer" onClick={() => setSortBy("name")}>Name</th>
                <th className="py-2 font-medium cursor-pointer text-right" onClick={() => setSortBy("type")}>Type</th>
                <th className="py-2 font-medium cursor-pointer text-right" onClick={() => setSortBy("size")}>Size</th>
                <th className="py-2 font-medium cursor-pointer text-right hidden sm:table-cell" onClick={() => setSortBy("modified")}>Modified</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {path !== "/" && (
                <tr
                  className="border-b border-white/5 cursor-pointer hover:bg-secondary"
                  onClick={() => setPath(path.split("/").slice(0, -1).join("/") || "/")}
                >
                  <td className="py-2">..</td>
                  <td className="text-right text-muted">folder</td>
                  <td className="text-right text-muted">—</td>
                  <td className="text-right text-muted hidden sm:table-cell">—</td>
                  <td></td>
                </tr>
              )}
              {sorted.map((it) => (
                <tr
                  key={it.path}
                  className="border-b border-white/5 hover:bg-secondary group"
                  onClick={() => it.type === "directory" && setPath(it.path)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, item: it });
                  }}
                >
                  <td className="py-2 flex items-center gap-2">
                    <span>{it.type === "directory" ? "🗀" : "📄"}</span>
                    {renaming === it.path ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => doRename(it)}
                        onKeyDown={(e) => e.key === "Enter" && doRename(it)}
                        className="bg-secondary rounded px-1 text-sm focus:outline-none"
                      />
                    ) : (
                      <span>{it.name}</span>
                    )}
                  </td>
                  <td className="text-right text-muted">{it.type === "directory" ? "folder" : "file"}</td>
                  <td className="text-right text-muted mono">{it.type === "directory" ? "—" : fmtSize(it.sizeBytes)}</td>
                  <td className="text-right text-muted mono hidden sm:table-cell">{fmtDate(it.modified)}</td>
                  <td className="text-right whitespace-nowrap opacity-0 group-hover:opacity-100">
                    {it.type === "file" && (
                      <button className="text-xs text-accent mr-2" onClick={(e) => { e.stopPropagation(); download(it); }}>
                        ↓
                      </button>
                    )}
                    <button
                      className="text-xs text-muted mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming(it.path);
                        setRenameVal(it.name);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="text-xs text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        del(it);
                      }}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div
            className="fixed z-50 panel py-1 min-w-[140px] text-sm animate-fade-in"
            style={{ top: menu.y, left: menu.x }}
          >
            {menu.item.type === "file" && (
              <button
                className="block w-full text-left px-3 py-1.5 hover:bg-secondary"
                onClick={() => {
                  download(menu.item);
                  setMenu(null);
                }}
              >
                Download
              </button>
            )}
            <button
              className="block w-full text-left px-3 py-1.5 hover:bg-secondary"
              onClick={() => {
                setRenaming(menu.item.path);
                setRenameVal(menu.item.name);
                setMenu(null);
              }}
            >
              Rename
            </button>
            <button
              className="block w-full text-left px-3 py-1.5 hover:bg-secondary text-danger"
              onClick={() => {
                del(menu.item);
                setMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
