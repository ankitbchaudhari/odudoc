"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Doctor" | "Patient";
  status: "Active" | "Suspended";
  joinDate: string;
  initials: string;
}

const initialUsers: User[] = [
  { id: "u1", name: "Admin User", email: "admin@odudoc.com", role: "Admin", status: "Active", joinDate: "Jan 01, 2026", initials: "AU" },
  { id: "u2", name: "Dr. Sarah Johnson", email: "sarah.j@odudoc.com", role: "Doctor", status: "Active", joinDate: "Jan 15, 2026", initials: "SJ" },
  { id: "u3", name: "Dr. Michael Chen", email: "michael.c@odudoc.com", role: "Doctor", status: "Active", joinDate: "Feb 01, 2026", initials: "MC" },
  { id: "u4", name: "John Smith", email: "john@example.com", role: "Patient", status: "Active", joinDate: "Feb 10, 2026", initials: "JS" },
  { id: "u5", name: "Emily Davis", email: "emily@example.com", role: "Patient", status: "Active", joinDate: "Feb 15, 2026", initials: "ED" },
  { id: "u6", name: "Dr. Priya Patel", email: "priya.p@odudoc.com", role: "Doctor", status: "Active", joinDate: "Feb 20, 2026", initials: "PP" },
  { id: "u7", name: "Robert Wilson", email: "robert@example.com", role: "Patient", status: "Suspended", joinDate: "Mar 01, 2026", initials: "RW" },
  { id: "u8", name: "Maria Garcia", email: "maria@example.com", role: "Patient", status: "Active", joinDate: "Mar 10, 2026", initials: "MG" },
  { id: "u9", name: "Dr. James Wilson", email: "james.w@odudoc.com", role: "Doctor", status: "Active", joinDate: "Mar 15, 2026", initials: "JW" },
  { id: "u10", name: "David Lee", email: "david@example.com", role: "Patient", status: "Active", joinDate: "Mar 20, 2026", initials: "DL" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-700",
  Doctor: "bg-blue-100 text-blue-700",
  Patient: "bg-green-100 text-green-700",
};

const avatarColors: Record<string, string> = {
  Admin: "bg-purple-200 text-purple-700",
  Doctor: "bg-blue-200 text-blue-700",
  Patient: "bg-green-200 text-green-700",
};

const roleTabs = ["All", "Admin", "Doctor", "Patient"];

export default function AdminUsers() {
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<User["role"]>("Patient");

  const filtered = users.filter((u) => activeTab === "All" || u.role === activeTab);

  const adminCount = users.filter((u) => u.role === "Admin").length;
  const doctorCount = users.filter((u) => u.role === "Doctor").length;
  const patientCount = users.filter((u) => u.role === "Patient").length;

  const handleAddUser = () => {
    if (!formName || !formEmail) return;
    const initials = formName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const newUser: User = {
      id: `u${Date.now()}`,
      name: formName,
      email: formEmail,
      role: formRole,
      status: "Active",
      joinDate: "Apr 13, 2026",
      initials,
    };
    setUsers([...users, newUser]);
    setShowForm(false); setFormName(""); setFormEmail(""); setFormRole("Patient");
  };

  const handleToggleStatus = (id: string) => {
    setUsers(users.map((u) =>
      u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" } : u
    ));
  };

  const handleChangeRole = (id: string, role: User["role"]) => {
    setUsers(users.map((u) => u.id === id ? { ...u, role } : u));
  };

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users & Roles</h2>
          <p className="mt-1 text-sm text-gray-500">{users.length} total users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Admins</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{adminCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Doctors</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{doctorCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Patients</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{patientCount}</p>
        </div>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Add New User</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="john@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select value={formRole} onChange={(e) => setFormRole(e.target.value as User["role"])} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="Patient">Patient</option>
                <option value="Doctor">Doctor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleAddUser} className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700">Save User</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Role Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm">
        {roleTabs.map((tab) => {
          const count = tab === "All" ? users.length : users.filter((u) => u.role === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Join Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${avatarColors[user.role]}`}>
                        {user.initials}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleColors[user.role]}`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.joinDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value as User["role"])}
                        className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-primary-500"
                      >
                        <option value="Patient">Patient</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button onClick={() => handleToggleStatus(user.id)} className="rounded p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600" title={user.status === "Active" ? "Suspend" : "Activate"}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
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
          <div className="py-12 text-center text-sm text-gray-400">No users found.</div>
        )}
      </div>
    </div>
  );
}
