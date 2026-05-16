"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Config = {
  reminderDays: number[];
  notifyEmployee: boolean;
  notifyHR: boolean;
  notifyManager: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  isEnabled: boolean;
};

const DEFAULT_CONFIG: Config = {
  reminderDays: [90, 60, 30, 14, 7],
  notifyEmployee: true,
  notifyHR: true,
  notifyManager: false,
  emailEnabled: true,
  inAppEnabled: true,
  isEnabled: true,
};

type Props = { initial?: Partial<Config>; onSaved?: () => void };

const PRESET_DAYS = [7, 14, 30, 60, 90, 120];

export function ReminderConfigPanel({ initial, onSaved }: Props) {
  const [config, setConfig] = useState<Config>({ ...DEFAULT_CONFIG, ...initial });
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  function toggleDay(day: number) {
    setConfig((c) => ({
      ...c,
      reminderDays: c.reminderDays.includes(day)
        ? c.reminderDays.filter((d) => d !== day).sort((a, b) => b - a)
        : [...c.reminderDays, day].sort((a, b) => b - a),
    }));
  }

  function toggle(field: keyof Config) {
    setConfig((c) => ({ ...c, [field]: !c[field as keyof Config] }));
  }

  async function save() {
    setIsSaving(true);
    setSaveState("idle");
    try {
      const res = await fetch("/api/compliance/reminders/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, documentTypeId: null }),
      });
      const json = await res.json();
      if (json.success) { setSaveState("saved"); onSaved?.(); }
      else setSaveState("error");
    } catch {
      setSaveState("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function triggerManual() {
    setIsSaving(true);
    try {
      await fetch("/api/compliance/reminders/send", { method: "POST" });
    } finally {
      setIsSaving(false);
    }
  }

  const checkboxRow = (label: string, field: keyof Config) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4 rounded"
        checked={Boolean(config[field])}
        onChange={() => toggle(field)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );

  return (
    <div className="space-y-6 rounded-xl border p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Reminder Settings</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            checked={config.isEnabled}
            onChange={() => toggle("isEnabled")}
          />
          <span className="text-sm font-medium">Enabled</span>
        </label>
      </div>

      {/* Reminder thresholds */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Send reminders at (days before expiry)</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_DAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                config.reminderDays.includes(day)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input text-muted-foreground hover:bg-accent"
              }`}
            >
              {day}d
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Active: {config.reminderDays.sort((a, b) => b - a).join(", ")} days</p>
      </div>

      {/* Notify who */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Notify</p>
        <div className="space-y-2">
          {checkboxRow("HR Team", "notifyHR")}
          {checkboxRow("Employee", "notifyEmployee")}
          {checkboxRow("Direct Manager", "notifyManager")}
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Channels</p>
        <div className="space-y-2">
          {checkboxRow("Email", "emailEnabled")}
          {checkboxRow("In-App Notification", "inAppEnabled")}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={save} disabled={isSaving} className="min-w-[100px]">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={triggerManual} disabled={isSaving}>
          Send Now
        </Button>
        {saveState === "saved" && <span className="text-sm text-green-600">Saved</span>}
        {saveState === "error" && <span className="text-sm text-red-600">Save failed</span>}
      </div>
    </div>
  );
}
