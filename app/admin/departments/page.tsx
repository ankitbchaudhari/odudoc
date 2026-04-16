"use client";

import { useState } from "react";

interface Department {
  id: string;
  name: string;
  icon: string;
  doctorCount: number;
  status: "Active" | "Inactive";
  description: string;
}

const initialDepartments: Department[] = [
  { id: "d1", name: "Cardiology", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", doctorCount: 8, status: "Active", description: "Heart and cardiovascular system" },
  { id: "d2", name: "Neurology", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", doctorCount: 5, status: "Active", description: "Brain and nervous system" },
  { id: "d3", name: "Orthopedics", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", doctorCount: 6, status: "Active", description: "Bones, joints, and muscles" },
  { id: "d4", name: "Pediatrics", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", doctorCount: 7, status: "Active", description: "Child healthcare" },
  { id: "d5", name: "Dermatology", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01", doctorCount: 4, status: "Active", description: "Skin, hair, and nails" },
  { id: "d6", name: "Ophthalmology", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", doctorCount: 3, status: "Active", description: "Eye care and vision" },
  { id: "d7", name: "Dentistry", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", doctorCount: 5, status: "Inactive", description: "Dental and oral health" },
];

export default function AdminDepartments() {
  const [departments, setDepartments] = useState(initialDepartments);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormStatus("Active"); setEditingId(null);
  };

  const handleEdit = (d: Department) => {
    setFormName(d.name); setFormDesc(d.description); setFormStatus(d.status);
    setEditingId(d.id); setShowForm(true);
  };

  const handleSave = () => {
    if (!formName) return;
    if (editingId) {
      setDepartments(departments.map((d) =>
        d.id === editingId ? { ...d, name: formName, description: formDesc, status: formStatus } : d
      ));
    } else {
      setDepartments([...departments, {
        id: `d${Date.now()}`,
        name: formName,
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5",
        doctorCount: 0,
        status: formStatus,
        description: formDesc,
      }]);
    }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    setDepartments(departments.filter((d) => d.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setDepartments(departments.map((d) =>
      d.id === id ? { ...d, status: d.status === "Active" ? "Inactive" : "Active" } : d
    ));
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Management</h2>
          <p className="mt-1 text-sm text-gray-500">{departments.length} departments</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Department
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{editingId ? "Edit Department" : "Add Department"}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Department Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="e.g., Cardiology" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Brief description" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as "Active" | "Inactive")} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700">{editingId ? "Update" : "Save"}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="w-8 px-4 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium">Icon</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Doctors</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <svg className="h-5 w-5 cursor-grab text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                      <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={dept.icon} />
                      </svg>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{dept.name}</p>
                    <p className="text-xs text-gray-400">{dept.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{dept.doctorCount} doctors</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${dept.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {dept.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleStatus(dept.id)} className="rounded p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600" title="Toggle Status">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                      <button onClick={() => handleEdit(dept)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(dept.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
