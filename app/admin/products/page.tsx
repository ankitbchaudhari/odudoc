"use client";

import { useState } from "react";

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
}

const initialProducts: AdminProduct[] = [
  { id: "p1", name: "Paracetamol 500mg", category: "Medicines", price: 5.99, originalPrice: 8.99, stock: 450, status: "Active", prescriptionRequired: false, description: "Pain relief and fever reducer", color: "from-blue-400 to-blue-600" },
  { id: "p2", name: "Vitamin D3 Supplement", category: "Supplements", price: 12.99, originalPrice: 18.99, stock: 230, status: "Active", prescriptionRequired: false, description: "Essential vitamin for bone health", color: "from-yellow-400 to-orange-500" },
  { id: "p3", name: "Digital Thermometer", category: "Medical Devices", price: 15.99, originalPrice: 24.99, stock: 85, status: "Active", prescriptionRequired: false, description: "Fast and accurate temperature reading", color: "from-teal-400 to-teal-600" },
  { id: "p4", name: "Amoxicillin 250mg", category: "Medicines", price: 9.49, originalPrice: 14.99, stock: 0, status: "Out of Stock", prescriptionRequired: true, description: "Antibiotic for bacterial infections", color: "from-red-400 to-red-600" },
  { id: "p5", name: "Omega-3 Fish Oil", category: "Supplements", price: 19.99, originalPrice: 29.99, stock: 167, status: "Active", prescriptionRequired: false, description: "Heart and brain health supplement", color: "from-indigo-400 to-indigo-600" },
  { id: "p6", name: "Baby Moisturizer", category: "Baby Care", price: 8.99, originalPrice: 12.99, stock: 320, status: "Active", prescriptionRequired: false, description: "Gentle care for baby skin", color: "from-pink-300 to-pink-500" },
  { id: "p7", name: "Blood Pressure Monitor", category: "Medical Devices", price: 45.99, originalPrice: 69.99, stock: 42, status: "Active", prescriptionRequired: false, description: "Automatic BP monitoring", color: "from-green-400 to-green-600" },
  { id: "p8", name: "Probiotic Capsules", category: "Supplements", price: 22.99, originalPrice: 34.99, stock: 5, status: "Draft", prescriptionRequired: false, description: "Gut health support", color: "from-purple-400 to-purple-600" },
];

const categories = ["All", "Medicines", "Supplements", "Medical Devices", "Baby Care", "Personal Care", "Wellness"];

const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Draft: "bg-gray-100 text-gray-700",
  "Out of Stock": "bg-red-100 text-red-700",
};

export default function AdminProducts() {
  const [products, setProducts] = useState(initialProducts);
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

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormCategory("Medicines");
    setFormPrice(""); setFormOriginalPrice(""); setFormStock(""); setFormRx(false);
    setEditingId(null);
  };

  const handleEdit = (p: AdminProduct) => {
    setFormName(p.name); setFormDesc(p.description); setFormCategory(p.category);
    setFormPrice(String(p.price)); setFormOriginalPrice(String(p.originalPrice));
    setFormStock(String(p.stock)); setFormRx(p.prescriptionRequired);
    setEditingId(p.id); setShowForm(true);
  };

  const handleSave = () => {
    if (!formName || !formPrice) return;
    const stock = parseInt(formStock) || 0;
    const newProduct: AdminProduct = {
      id: editingId || `p${Date.now()}`,
      name: formName,
      description: formDesc,
      category: formCategory,
      price: parseFloat(formPrice),
      originalPrice: parseFloat(formOriginalPrice) || parseFloat(formPrice),
      stock,
      status: stock === 0 ? "Out of Stock" : "Active",
      prescriptionRequired: formRx,
      color: "from-blue-400 to-blue-600",
    };
    if (editingId) {
      setProducts(products.map((p) => (p.id === editingId ? newProduct : p)));
    } else {
      setProducts([...products, newProduct]);
    }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "delete") {
      setProducts(products.filter((p) => !selectedIds.includes(p.id)));
    } else if (bulkAction === "in-stock") {
      setProducts(products.map((p) => selectedIds.includes(p.id) ? { ...p, status: "Active" as const, stock: p.stock || 100 } : p));
    } else if (bulkAction === "out-of-stock") {
      setProducts(products.map((p) => selectedIds.includes(p.id) ? { ...p, status: "Out of Stock" as const, stock: 0 } : p));
    }
    setSelectedIds([]); setBulkAction("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
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
          <p className="mt-1 text-sm text-gray-500">{products.length} products total</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{editingId ? "Edit Product" : "Add New Product"}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Product Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Enter product name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price ($)</label>
              <input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Original Price ($)</label>
              <input type="number" step="0.01" value={formOriginalPrice} onChange={(e) => setFormOriginalPrice(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock Quantity</label>
              <input type="number" value={formStock} onChange={(e) => setFormStock(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="0" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Product description" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <div className={`relative h-6 w-11 rounded-full transition-colors ${formRx ? "bg-primary-600" : "bg-gray-300"}`} onClick={() => setFormRx(!formRx)}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formRx ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                Prescription Required
              </label>
            </div>
            <div className="flex items-center gap-2 border-t border-gray-100 pt-4 sm:col-span-2 lg:col-span-3">
              <div className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400">
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="mt-1">Click to upload image</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700">{editingId ? "Update Product" : "Save Product"}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
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
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Bulk Actions</option>
              <option value="delete">Delete Selected</option>
              <option value="in-stock">Mark In Stock</option>
              <option value="out-of-stock">Mark Out of Stock</option>
            </select>
            <button onClick={handleBulkAction} className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900">Apply</button>
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
                  <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
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
                    <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelect(product.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${product.color} flex items-center justify-center`}>
                        <span className="text-sm font-bold text-white/60">{product.name.charAt(0)}</span>
                      </div>
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
                      <span className="ml-1 text-xs text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[product.status]}`}>{product.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(product)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No products found.</div>
        )}
      </div>
    </div>
  );
}
