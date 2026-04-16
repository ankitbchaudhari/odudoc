"use client";

import { useState, FormEvent } from "react";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "radio" | "date" | "number";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string | boolean>) => void;
  submitLabel?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;

export default function DynamicForm({ fields, onSubmit, submitLabel = "Submit" }: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const setValue = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const val = values[field.name];
      if (field.required && (!val || (typeof val === "string" && !val.trim()))) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.type === "email" && val && typeof val === "string" && !emailRegex.test(val)) {
        newErrors[field.name] = "Please enter a valid email address";
      }
      if (field.type === "phone" && val && typeof val === "string" && !phoneRegex.test(val)) {
        newErrors[field.name] = "Please enter a valid phone number";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      onSubmit(values);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
          &#10003;
        </div>
        <h3 className="text-xl font-bold text-gray-900">Submitted Successfully!</h3>
        <p className="mt-2 text-gray-500">We have received your submission and will get back to you soon.</p>
        <button
          onClick={() => {
            setStatus("idle");
            setValues({});
          }}
          className="mt-6 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Submit Another
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
          !
        </div>
        <h3 className="text-xl font-bold text-gray-900">Something went wrong</h3>
        <p className="mt-2 text-gray-500">Please try again later.</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500";
  const errorClass = "border-red-400 focus:border-red-500 focus:ring-red-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>

          {(field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number" || field.type === "date") && (
            <input
              type={field.type === "phone" ? "tel" : field.type}
              placeholder={field.placeholder}
              value={(values[field.name] as string) || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={`${inputClass} ${errors[field.name] ? errorClass : ""}`}
            />
          )}

          {field.type === "textarea" && (
            <textarea
              rows={4}
              placeholder={field.placeholder}
              value={(values[field.name] as string) || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={`${inputClass} ${errors[field.name] ? errorClass : ""}`}
            />
          )}

          {field.type === "select" && (
            <select
              value={(values[field.name] as string) || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={`${inputClass} ${errors[field.name] ? errorClass : ""}`}
            >
              <option value="">{field.placeholder || `Select ${field.label}`}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === "checkbox" && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!values[field.name]}
                onChange={(e) => setValue(field.name, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">{field.placeholder || field.label}</span>
            </label>
          )}

          {field.type === "radio" && (
            <div className="flex flex-wrap gap-4">
              {field.options?.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={opt.value}
                    checked={values[field.name] === opt.value}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {errors[field.name] && (
            <p className="mt-1 text-xs text-red-500">{errors[field.name]}</p>
          )}
        </div>
      ))}
      <button
        type="submit"
        className="rounded-lg bg-primary-600 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
