"use client";

import { useState } from "react";

export default function AdminCustomize() {
  const [theme, setTheme] = useState({
    primaryColor: "#0E7490",
    secondaryColor: "#14B8A6",
    accentColor: "#F59E0B",
    logo: "OduDoc",
    siteName: "OduDoc — Healthcare Platform",
    tagline: "Your health, our priority",
    footerText: "© 2026 OduDoc. All rights reserved.",
    enableDarkMode: false,
    heroStyle: "text-slider",
    homeLayout: "v4",
  });

  const [saved, setSaved] = useState(false);

  const save = () => {
    // TODO: persist via API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customize Theme</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure brand colors, logo, and homepage layout.
          </p>
        </div>
        <button onClick={save} className="btn-primary !text-sm">
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Brand */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Brand</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Site Name
              </label>
              <input
                value={theme.siteName}
                onChange={(e) => setTheme({ ...theme, siteName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Logo Text
              </label>
              <input
                value={theme.logo}
                onChange={(e) => setTheme({ ...theme, logo: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Tagline
              </label>
              <input
                value={theme.tagline}
                onChange={(e) => setTheme({ ...theme, tagline: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Upload Logo (image)
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700"
              />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Colors</h2>
          <div className="space-y-4">
            {(
              [
                { key: "primaryColor", label: "Primary" },
                { key: "secondaryColor", label: "Secondary" },
                { key: "accentColor", label: "Accent" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-200"
                  />
                  <input
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={theme.enableDarkMode}
                onChange={(e) => setTheme({ ...theme, enableDarkMode: e.target.checked })}
              />
              Enable dark mode toggle
            </label>
          </div>
        </div>

        {/* Layout */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Layout</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Homepage Layout
              </label>
              <select
                value={theme.homeLayout}
                onChange={(e) => setTheme({ ...theme, homeLayout: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="default">Default</option>
                <option value="v2">Home V2 (Stats Hero)</option>
                <option value="v3">Home V3 (Schedule Hero)</option>
                <option value="v4">Home V4 (Text Slider)</option>
                <option value="v5">Home V5 (Minimal)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Hero Style
              </label>
              <select
                value={theme.heroStyle}
                onChange={(e) => setTheme({ ...theme, heroStyle: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="default">Default</option>
                <option value="stats">With Stats</option>
                <option value="schedule">With Schedule</option>
                <option value="text-slider">Text Slider</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Footer Text
              </label>
              <input
                value={theme.footerText}
                onChange={(e) => setTheme({ ...theme, footerText: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-gray-900">Preview</h2>
        <div
          className="rounded-lg p-8 text-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
          }}
        >
          <h3 className="text-3xl font-bold">{theme.siteName}</h3>
          <p className="mt-2 opacity-90">{theme.tagline}</p>
          <button
            className="mt-6 rounded-lg px-6 py-2 text-sm font-semibold"
            style={{ background: theme.accentColor, color: "#111" }}
          >
            Primary Button
          </button>
        </div>
      </div>
    </div>
  );
}
