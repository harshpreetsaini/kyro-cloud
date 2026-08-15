"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { FileItem } from "@shared/types";

export function FileManager({ basePath = "/" }: { basePath?: string }) {
  const [path, setPath] = useState(basePath);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(p)}`);
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(path);
  }, [path, load]);

  async function mkdir() {
    if (!folderName) return;
    await fetch("/api/files/mkdir", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, name: folderName }),
    });
    setNewFolder(false);
    setFolderName("");
    load(path);
  }

  async function del(item: FileItem) {
    if (!confirm(`Delete ${item.name}?`)) return;
    await fetch(`/api/files/delete?path=${encodeURIComponent(item.path)}`, { method: "DELETE" });
    load(path);
  }

  async function doRename(item: FileItem) {
    if (!renameVal) return;
    await fetch("/api/files/rename", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: item.path, newName: renameVal }),
    });
    setRenaming(null);
    load(path);
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", path);
    await fetch("/api/files/upload", { method: "POST", body: fd });
    load(path);
  }

  return (
    <div className="panel p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="mono text-sm text-accent truncate">/files{path === "/" ? "" : path}</span>
        <div className="flex gap-2">
          <button className="text-xs text-muted hover:text-text" onClick={() => load(path)} title="Refresh">
            ↻
          </button>
          <button className="text-xs text-muted hover:text-text" onClick={() => fileInput.current?.click()}>
            ⤓ Upload
          </button>
          <button
            className="text-xs text-muted hover:text-text"
            onClick={() => setNewFolder((v) => !v)}
          >
            + Folder
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={upload} />
        </div>
      </div>

      {newFolder && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="bg-secondary rounded-lg px-2 py-1 text-sm flex-1"
          />
          <button className="text-xs bg-accent px-3 rounded-lg" onClick={mkdir}>
            Create
          </button>
        </div>
      )}

      <div className="overflow-auto flex-1">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {path !== "/" && (
                <tr
                  className="border-b border-white/5 cursor-pointer hover:bg-secondary"
                  onClick={() => setPath(path.split("/").slice(0, -1).join("/") || "/")}
                >
                  <td className="py-2">..</td>
                  <td className="text-right text-muted">folder</td>
                  <td></td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.path} className="border-b border-white/5 hover:bg-secondary group">
                  <td className="py-2 flex items-center gap-2">
                    <span>{it.type === "directory" ? "🗀" : "📄"}</span>
                    {renaming === it.path ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => doRename(it)}
                        onKeyDown={(e) => e.key === "Enter" && doRename(it)}
                        className="bg-secondary rounded px-1 text-sm"
                      />
                    ) : (
                      <span
                        className="cursor-pointer"
                        onClick={() => it.type === "directory" && setPath(it.path)}
                      >
                        {it.name}
                      </span>
                    )}
                  </td>
                  <td className="text-right text-muted">
                    {it.type === "directory" ? "folder" : `${((it.sizeBytes || 0) / 1024).toFixed(0)} KB`}
                  </td>
                  <td className="text-right whitespace-nowrap opacity-0 group-hover:opacity-100">
                    {it.type === "file" && (
                      <a
                        href={`/api/files/download?path=${encodeURIComponent(it.path)}`}
                        className="text-xs text-accent mr-2"
                      >
                        ↓
                      </a>
                    )}
                    <button
                      className="text-xs text-muted mr-2"
                      onClick={() => {
                        setRenaming(it.path);
                        setRenameVal(it.name);
                      }}
                    >
                      ✎
                    </button>
                    <button className="text-xs text-danger" onClick={() => del(it)}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
