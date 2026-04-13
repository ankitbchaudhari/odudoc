"use client";

import { useState, useMemo } from "react";
import DoctorCard from "@/components/DoctorCard";
import { doctors, specialties } from "@/lib/data";

export default function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [gender, setGender] = useState("");
  const [sortBy, setSortBy] = useState("");

  const filtered = useMemo(() => {
    let list = [...doctors];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q)
      );
    }

    if (specialty) {
      list = list.filter((d) => d.specialty === specialty);
    }

    if (gender) {
      list = list.filter((d) => d.gender === gender);
    }

    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "experience") list.sort((a, b) => b.experience - a.experience);
    if (sortBy === "fee-low") list.sort((a, b) => a.fee - b.fee);
    if (sortBy === "fee-high") list.sort((a, b) => b.fee - a.fee);

    return list;
  }, [search, specialty, gender, sortBy]);

  const uniqueSpecialties = Array.from(new Set(doctors.map((d) => d.specialty)));

  return (
    <div className="bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Doctors</h1>
          <p className="mt-1 text-gray-500">
            Book appointments with verified, experienced doctors
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name, specialty, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-primary-500"
          >
            <option value="">All Specialties</option>
            {uniqueSpecialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-primary-500"
          >
            <option value="">Any Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-primary-500"
          >
            <option value="">Sort By</option>
            <option value="rating">Highest Rating</option>
            <option value="experience">Most Experience</option>
            <option value="fee-low">Fee: Low to High</option>
            <option value="fee-high">Fee: High to Low</option>
          </select>
        </div>

        {/* Results count */}
        <p className="mb-4 text-sm text-gray-500">
          {filtered.length} doctor{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Doctor List */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((d) => <DoctorCard key={d.id} doctor={d} />)
          ) : (
            <div className="rounded-xl bg-white py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-4 text-lg font-semibold text-gray-900">No doctors found</p>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Specialty Browse */}
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Browse by Specialty</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {specialties.map((s) => (
              <button
                key={s.id}
                onClick={() => setSpecialty(s.name)}
                className="card flex flex-col items-center py-4 text-center"
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="mt-2 text-xs font-medium text-gray-700">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
