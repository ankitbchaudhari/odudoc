"use client";

import { useState, useMemo } from "react";
import DynamicForm, { FormField } from "./DynamicForm";
import { departments, doctors } from "@/lib/data";

export default function AppointmentForm() {
  const [selectedDept, setSelectedDept] = useState("");
  const [appointmentDetails, setAppointmentDetails] = useState<Record<string, string | boolean> | null>(null);

  const filteredDoctors = useMemo(() => {
    if (!selectedDept) return doctors;
    return doctors.filter((d) => {
      const dept = departments.find((dep) => dep.slug === selectedDept);
      return dept && d.specialty.toLowerCase().includes(dept.name.toLowerCase().split(" ")[0].toLowerCase());
    });
  }, [selectedDept]);

  const fields: FormField[] = [
    { name: "fullName", label: "Full Name", type: "text", required: true, placeholder: "John Doe" },
    { name: "email", label: "Email Address", type: "email", required: true, placeholder: "john@example.com" },
    { name: "phone", label: "Phone Number", type: "phone", required: true, placeholder: "+1 (555) 000-0000" },
    {
      name: "department",
      label: "Department",
      type: "select",
      required: true,
      placeholder: "Select Department",
      options: departments.map((d) => ({ label: d.name, value: d.slug })),
    },
    {
      name: "doctor",
      label: "Preferred Doctor",
      type: "select",
      placeholder: "Select Doctor",
      options: filteredDoctors.map((d) => ({ label: d.name, value: d.id })),
    },
    { name: "date", label: "Preferred Date", type: "date", required: true },
    {
      name: "time",
      label: "Preferred Time",
      type: "select",
      required: true,
      placeholder: "Select Time",
      options: [
        { label: "Morning (8AM - 12PM)", value: "morning" },
        { label: "Afternoon (12PM - 5PM)", value: "afternoon" },
        { label: "Evening (5PM - 9PM)", value: "evening" },
      ],
    },
    { name: "message", label: "Additional Message", type: "textarea", placeholder: "Any special requests or concerns..." },
  ];

  const handleSubmit = (data: Record<string, string | boolean>) => {
    setAppointmentDetails(data);
  };

  if (appointmentDetails) {
    const doctor = doctors.find((d) => d.id === appointmentDetails.doctor);
    const dept = departments.find((d) => d.slug === appointmentDetails.department);

    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            &#10003;
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Appointment Booked!</h3>
        <p className="mt-2 text-gray-500">Your appointment has been successfully scheduled.</p>
        <div className="mt-6 space-y-3 text-left">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient</span>
                <span className="font-medium text-gray-900">{appointmentDetails.fullName as string}</span>
              </div>
              {dept && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Department</span>
                  <span className="font-medium text-gray-900">{dept.name}</span>
                </div>
              )}
              {doctor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Doctor</span>
                  <span className="font-medium text-gray-900">{doctor.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">{appointmentDetails.date as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-medium capitalize text-gray-900">{appointmentDetails.time as string}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setAppointmentDetails(null)}
          className="mt-6 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Book Another Appointment
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-900">Appointment Details</h2>
      <DynamicForm
        fields={fields}
        onSubmit={handleSubmit}
        submitLabel="Book Appointment"
      />
    </div>
  );
}
