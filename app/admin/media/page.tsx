"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MediaType = "image" | "document";

interface MediaListItem {
  id: string;
  name: string;
  type: MediaType;
  mime: string;
  size: number;
  hasData: boolean;
  uploadedAt: string;
}

interface MediaFull extends Omit<MediaListItem, "hasData"> {
  dataUrl: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function gradientFor(id: string): string {
  const palette = [
    "from-blue-400 to-indigo-600",
    "from-green-400 to-teal-600",
    "from-yellow-400 to-orange-500",
    "from-red-400 to-red-600",
    "from-purple-400 to-purple-600",
    "from-gray-600 to-gray-800",
    "from-orange-400 to-red-500",
    "from-pink-400 to-rose-600",
    "from-cyan-400 to-blue-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

const MAX_BYTES = 10 * 1024 * 1024;

export default function AdminMedia() {
  const [media, setMedia] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<"all" | MediaType>("all");
  const [selected, setSelected] = useState<MediaFull | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?type=${typeFilter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setMedia(data.items || []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} file(s)?`)) return;
    const ids = selectedIds;
    const prev = media;
    setMedia(media.filter((m) => !ids.includes(m.id)));
    setSelectedIds([]);
    const res = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) { setMedia(prev); alert("Failed to delete"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    const prev = media;
    setMedia(media.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
    const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (!res.ok) { setMedia(prev); alert("Failed to delete"); }
  };

  const openDetail = async (id: string) => {
    setSelectedLoading(true);
    try {
      const res = await fetch(`/api/admin/media/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(data.item);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSelectedLoading(false);
    }
  };

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: arr.length });
    const added: MediaListItem[] = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      if (file.size > MAX_BYTES) {
        alert(`${file.name} exceeds 10MB — skipped`);
        setUploadProgress({ done: i + 1, total: arr.length });
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        const res = await fetch("/api/admin/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, mime: file.type || "application/octet-stream", size: file.size, dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        added.push(data.item);
      } catch (e) {
        alert(`Upload failed: ${(e as Error).message}`);
      }
      setUploadProgress({ done: i + 1, total: arr.length });
    }
    if (added.length) setMedia((prev) => [...added, ...prev]);
    setUploading(false);
    setUploadProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const filtered = media; // server already filters

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
          <p className="mt-1 text-sm text-gray-500">{loading ? "Loading…" : `${media.length} files`}</p>
        </div>
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="mb-6 rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition-colors hover:border-primary-400"
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-3 text-sm font-medium text-gray-700">Drag and drop files here, or click to browse</p>
        <p className="mt-1 text-xs text-gray-400">PNG, JPG, PDF, SVG up to 10MB</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {uploading && uploadProgress ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…` : "Browse Files"}
        </button>
      </div>

      {/* Filters + View Toggle */}
      <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          {(["all", "image", "document"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                typeFilter === type ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {type === "all" ? "All" : type === "image" ? "Images" : "Documents"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5">
          <button onClick={() => setViewMode("grid")} className={`rounded-md p-2 ${viewMode === "grid" ? "bg-gray-100" : "hover:bg-gray-50"}`}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button onClick={() => setViewMode("list")} className={`rounded-md p-2 ${viewMode === "list" ? "bg-gray-100" : "hover:bg-gray-50"}`}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => {
            const grad = gradientFor(item.id);
            return (
              <div
                key={item.id}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all hover:shadow-md ${
                  selectedIds.includes(item.id) ? "border-primary-500" : "border-transparent"
                }`}
                onClick={() => openDetail(item.id)}
              >
                <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${grad}`}>
                  {item.type === "image" ? (
                    <svg className="h-10 w-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="h-10 w-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <div className="absolute left-2 top-2" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => {}} className="h-4 w-4 rounded border-white/50 text-primary-600 shadow" />
                </div>
                <div className="bg-white p-3">
                  <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(item.size)}</p>
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-gray-500">No files yet — upload some above.</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                    onChange={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((m) => m.id))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                </th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Upload Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50" onClick={() => openDetail(item.id)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br ${gradientFor(item.id)}`}>
                        <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.type === "image" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatSize(item.size)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.uploadedAt)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">No files yet — upload some above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-lg bg-white px-6 py-3 text-sm text-gray-700 shadow">Loading file…</div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">File Details</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className={`mb-4 flex h-48 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${gradientFor(selected.id)}`}>
              {selected.type === "image" && selected.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.dataUrl} alt={selected.name} className="h-full w-full object-contain bg-white" />
              ) : (
                <svg className="h-16 w-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="truncate pl-4 font-medium text-gray-900">{selected.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium capitalize text-gray-900">{selected.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">MIME</span><span className="font-medium text-gray-900">{selected.mime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="font-medium text-gray-900">{formatSize(selected.size)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Uploaded</span><span className="font-medium text-gray-900">{formatDate(selected.uploadedAt)}</span></div>
            </div>
            <div className="mt-6 flex gap-3">
              {selected.dataUrl && (
                <a href={selected.dataUrl} download={selected.name} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Download</a>
              )}
              <button onClick={() => handleDelete(selected.id)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
