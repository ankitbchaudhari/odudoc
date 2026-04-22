"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  status: "Active" | "Draft" | "Out of Stock";
  prescriptionRequired: boolean;
  description: string;
  color: string;
  imageUrl?: string;
}

const categories = [
  "All",
  "Medicines",
  "Supplements",
  "Medical Devices",
  "Baby Care",
  "Personal Care",
  "Wellness",
];

const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Draft: "bg-gray-100 text-gray-700",
  "Out of Stock": "bg-red-100 text-red-700",
};

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Medicines");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formRx, setFormRx] = useState(false);
  const [formStatus, setFormStatus] = useState<"Active" | "Draft" | "Out of Stock">("Active");
  const [formImageUrl, setFormImageUrl] = useState<string>("");

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?view=all", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load products");
      setProducts(data.products || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormCategory("Medicines");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormStock("");
    setFormRx(false);
    setFormStatus("Active");
    setFormImageUrl("");
    setEditingId(null);
  };

  // Read a selected image file as a data URL (kept simple + storage-free so
  // image uploads work without Vercel Blob / S3 wiring). Rejects files larger
  // than ~2 MB so we don't bloat the in-memory store or API payloads.
  const handleImageFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setFormImageUrl(reader.result);
    };
    reader.onerror = () => setError("Could not read the image file.");
    reader.readAsDataURL(file);
  };

  const handleEdit = (p: AdminProduct) => {
    setFormName(p.name);
    setFormDesc(p.description);
    setFormCategory(p.category);
    setFormPrice(String(p.price));
    setFormOriginalPrice(String(p.originalPrice));
    setFormStock(String(p.stock));
    setFormRx(p.prescriptionRequired);
    setFormStatus(p.status);
    setFormImageUrl(p.imageUrl || "");
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName || !formPrice) {
      setError("Name and price are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: formName,
        description: formDesc,
        category: formCategory,
        price: parseFloat(formPrice),
        originalPrice: parseFloat(formOriginalPrice) || parseFloat(formPrice),
        stock: parseInt(formStock) || 0,
        prescriptionRequired: formRx,
        status: formStatus,
        imageUrl: formImageUrl || undefined,
      };

      const res = await fetch(
        editingId ? `/api/products/${editingId}` : "/api/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      await loadProducts();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Delete failed");
      }
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "delete" && !confirm(`Delete ${selectedIds.length} products?`))
      return;
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: bulkAction }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Bulk action failed");
      }
      setSelectedIds([]);
      setBulkAction("");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? "Loading…" : `${products.length} products total`}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Product
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Product" : "Add New Product"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Product Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Enter product name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {categories
                  .filter((c) => c !== "All")
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Original Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formOriginalPrice}
                onChange={(e) => setFormOriginalPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock Quantity</label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formStatus}
                onChange={(e) =>
                  setFormStatus(e.target.value as "Active" | "Draft" | "Out of Stock")
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Product description"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${formRx ? "bg-primary-600" : "bg-gray-300"}`}
                  onClick={() => setFormRx(!formRx)}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formRx ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </div>
                Prescription Required
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Product Image
              </label>
              <div className="flex items-start gap-4">
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {formImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No image</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-4 4m4-4l4 4" />
                    </svg>
                    {formImageUrl ? "Change image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFile(e.target.files?.[0])}
                    />
                  </label>
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormImageUrl("")}
                      className="self-start text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove image
                    </button>
                  )}
                  <p className="text-xs text-gray-400">PNG, JPG or WebP • max 2 MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update Product" : "Save Product"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters + Bulk */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Bulk Actions</option>
              <option value="delete">Delete Selected</option>
              <option value="in-stock">Mark In Stock</option>
              <option value="out-of-stock">Mark Out of Stock</option>
            </select>
            <button
              onClick={handleBulkAction}
              className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Apply
            </button>
            <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className={`h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${product.color} flex items-center justify-center`}
                        >
                          <span className="text-sm font-bold text-white/60">
                            {product.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">${product.price.toFixed(2)}</span>
                    {product.originalPrice > product.price && (
                      <span className="ml-1 text-xs text-gray-400 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[product.status]}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No products found.</div>
        )}
      </div>
    </div>
  );
}
