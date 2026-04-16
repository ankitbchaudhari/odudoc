"use client";

import { useState } from "react";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "document";
  size: string;
  uploadDate: string;
  color: string;
  url: string;
}

const initialMedia: MediaItem[] = [
  { id: "m1", name: "hero-banner.jpg", type: "image", size: "2.4 MB", uploadDate: "Apr 12, 2026", color: "from-blue-400 to-indigo-600", url: "/uploads/hero-banner.jpg" },
  { id: "m2", name: "doctor-profile-1.png", type: "image", size: "856 KB", uploadDate: "Apr 11, 2026", color: "from-green-400 to-teal-600", url: "/uploads/doctor-profile-1.png" },
  { id: "m3", name: "product-vitamins.jpg", type: "image", size: "1.2 MB", uploadDate: "Apr 10, 2026", color: "from-yellow-400 to-orange-500", url: "/uploads/product-vitamins.jpg" },
  { id: "m4", name: "prescription-form.pdf", type: "document", size: "340 KB", uploadDate: "Apr 09, 2026", color: "from-red-400 to-red-600", url: "/uploads/prescription-form.pdf" },
  { id: "m5", name: "about-team.jpg", type: "image", size: "3.1 MB", uploadDate: "Apr 08, 2026", color: "from-purple-400 to-purple-600", url: "/uploads/about-team.jpg" },
  { id: "m6", name: "logo-dark.svg", type: "image", size: "12 KB", uploadDate: "Apr 07, 2026", color: "from-gray-600 to-gray-800", url: "/uploads/logo-dark.svg" },
  { id: "m7", name: "terms-conditions.pdf", type: "document", size: "520 KB", uploadDate: "Apr 06, 2026", color: "from-orange-400 to-red-500", url: "/uploads/terms-conditions.pdf" },
  { id: "m8", name: "department-cardiology.jpg", type: "image", size: "1.8 MB", uploadDate: "Apr 05, 2026", color: "from-pink-400 to-rose-600", url: "/uploads/department-cardiology.jpg" },
  { id: "m9", name: "testimonial-bg.jpg", type: "image", size: "4.2 MB", uploadDate: "Apr 04, 2026", color: "from-cyan-400 to-blue-500", url: "/uploads/testimonial-bg.jpg" },
];

export default function AdminMedia() {
  const [media, setMedia] = useState(initialMedia);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "document">("all");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = media.filter((m) => typeFilter === "all" || m.type === typeFilter);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    setMedia(media.filter((m) => !selectedIds.includes(m.id)));
    setSelectedIds([]);
  };

  const handleDelete = (id: string) => {
    setMedia(media.filter((m) => m.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
          <p className="mt-1 text-sm text-gray-500">{media.length} files uploaded</p>
        </div>
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div className="mb-6 rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition-colors hover:border-primary-400">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-3 text-sm font-medium text-gray-700">Drag and drop files here, or click to browse</p>
        <p className="mt-1 text-xs text-gray-400">PNG, JPG, PDF, SVG up to 10MB</p>
        <button className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Browse Files
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

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all hover:shadow-md ${
                selectedIds.includes(item.id) ? "border-primary-500" : "border-transparent"
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${item.color}`}>
                {item.type === "image" ? (
                  <svg className="h-10 w-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                ) : (
                  <svg className="h-10 w-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )}
              </div>
              {/* Checkbox overlay */}
              <div
                className="absolute left-2 top-2"
                onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => {}}
                  className="h-4 w-4 rounded border-white/50 text-primary-600 shadow"
                />
              </div>
              <div className="bg-white p-3">
                <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-400">{item.size}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600" />
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
                <tr key={item.id} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50" onClick={() => setSelectedItem(item)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br ${item.color}`}>
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
                  <td className="px-4 py-3 text-gray-600">{item.size}</td>
                  <td className="px-4 py-3 text-gray-600">{item.uploadDate}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File Info Panel */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">File Details</h3>
              <button onClick={() => setSelectedItem(null)} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className={`mb-4 flex h-40 items-center justify-center rounded-lg bg-gradient-to-br ${selectedItem.color}`}>
              <svg className="h-16 w-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium text-gray-900">{selectedItem.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium text-gray-900 capitalize">{selectedItem.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="font-medium text-gray-900">{selectedItem.size}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Upload Date</span><span className="font-medium text-gray-900">{selectedItem.uploadDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">URL</span><span className="truncate font-medium text-primary-600">{selectedItem.url}</span></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setSelectedItem(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
              <button onClick={() => handleDelete(selectedItem.id)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
