"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Webhook, Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw, Zap } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AVAILABLE_SCOPES } from "@/lib/api/scopes";

// ── Types ─────────────────────────────────────────────────────────────────────

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type WebhookRecord = {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  _count: { deliveries: number };
};

const WEBHOOK_EVENTS = [
  "EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "EMPLOYEE_TERMINATED",
  "LEAVE_REQUESTED", "LEAVE_APPROVED", "LEAVE_REJECTED",
  "PAYROLL_RUN_COMPLETED", "PAYSLIP_GENERATED", "ATTENDANCE_RECORDED",
];

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IntegrationsClient() {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks">("keys");
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create key state
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Create webhook state
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        fetch("/api/v1/keys"),
        fetch("/api/v1/webhooks", { headers: {} }), // session auth — no api key needed from UI
      ]);
      const keysJ = await keysRes.json();
      if (keysJ.success) setApiKeys(keysJ.data);
      const webhooksJ = await webhooksRes.json();
      if (webhooksJ.success) setWebhooks(webhooksJ.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createKey() {
    if (!newKeyName.trim() || newKeyScopes.length === 0) return;
    setIsCreatingKey(true);
    try {
      const r = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes }),
      });
      const j = await r.json();
      if (j.success) {
        setCreatedKey(j.data.key);
        setShowKey(true);
        setNewKeyName("");
        setNewKeyScopes([]);
        setShowCreateKey(false);
        fetchData();
      }
    } finally { setIsCreatingKey(false); }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function createWebhook() {
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    setIsCreatingWebhook(true);
    try {
      // Use session — webhooks UI management does not need an API key
      // (the API key scoped routes are for external callers; we use session auth for the UI)
      const r = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWebhookName, url: newWebhookUrl, events: newWebhookEvents }),
      });
      const j = await r.json();
      if (j.success) {
        setNewWebhookName("");
        setNewWebhookUrl("");
        setNewWebhookEvents([]);
        setShowCreateWebhook(false);
        fetchData();
      }
    } finally { setIsCreatingWebhook(false); }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook endpoint? Pending deliveries will be cancelled.")) return;
    await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function testWebhook(id: string) {
    await fetch(`/api/v1/webhooks/${id}`, { method: "POST" });
  }

  const toggleScope = (s: string) =>
    setNewKeyScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleEvent = (e: string) =>
    setNewWebhookEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  return (
    <div className="space-y-6">
      {/* Created key banner */}
      {createdKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900 mb-2">
            API key created — copy it now. It will not be shown again.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2">
            <code className="flex-1 text-xs font-mono select-all">
              {showKey ? createdKey : "•".repeat(createdKey.length)}
            </code>
            <button onClick={() => setShowKey((s) => !s)} className="text-muted-foreground hover:text-foreground">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <CopyButton value={createdKey} />
          </div>
          <button onClick={() => setCreatedKey(null)} className="mt-2 text-xs text-amber-700 hover:underline">
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["keys", "webhooks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "keys" ? <Key className="h-4 w-4" /> : <Webhook className="h-4 w-4" />}
            {tab === "keys" ? "API Keys" : "Webhooks"}
          </button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto self-center" onClick={fetchData}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── API Keys tab ── */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">API Keys</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send <code className="text-xs">X-API-Key: &lt;key&gt;</code> in request headers.
                Base URL: <code className="text-xs">/api/v1</code>
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCreateKey((s) => !s)}>
              <Plus className="h-4 w-4 mr-1" />
              New key
            </Button>
          </div>

          {showCreateKey && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Create API Key</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Name</label>
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. SAP Integration"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block">Scopes</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SCOPES.map((s) => (
                      <label key={s.value} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(s.value)}
                          onChange={() => toggleScope(s.value)}
                          className="rounded"
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createKey} disabled={isCreatingKey || !newKeyName.trim() || newKeyScopes.length === 0}>
                    {isCreatingKey ? "Creating…" : "Create key"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateKey(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {apiKeys.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">No API keys. Create one to start integrating.</p>
          ) : (
            <div className="divide-y rounded-xl border">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 shrink-0">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{k.name}</p>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{k.keyPrefix}…</code>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {k.scopes.map((s) => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Created {format(new Date(k.createdAt), "dd MMM yyyy")}
                      {k.lastUsedAt && ` · Last used ${formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}`}
                      {k.expiresAt && ` · Expires ${format(new Date(k.expiresAt), "dd MMM yyyy")}`}
                    </p>
                  </div>
                  <button onClick={() => revokeKey(k.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Webhooks tab ── */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Webhook Endpoints</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gulfa HRM signs each delivery with <code className="text-xs">X-Gulfa-Signature: sha256=&lt;hmac&gt;</code>.
                Retry schedule: 1m, 5m, 15m, 1h, 4h.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCreateWebhook((s) => !s)}>
              <Plus className="h-4 w-4 mr-1" />
              Add endpoint
            </Button>
          </div>

          {showCreateWebhook && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Register Webhook Endpoint</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Name</label>
                  <input
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    placeholder="e.g. Slack alerts"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">URL (must be HTTPS)</label>
                  <input
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://your-service.example.com/hooks/gulfa"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block">Events to subscribe</label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEBHOOK_EVENTS.map((ev) => (
                      <label key={ev} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWebhookEvents.includes(ev)}
                          onChange={() => toggleEvent(ev)}
                          className="rounded"
                        />
                        <span className="font-mono">{ev}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createWebhook} disabled={isCreatingWebhook || !newWebhookName.trim() || !newWebhookUrl.trim() || newWebhookEvents.length === 0}>
                    {isCreatingWebhook ? "Creating…" : "Register endpoint"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateWebhook(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {webhooks.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">No webhook endpoints registered.</p>
          ) : (
            <div className="divide-y rounded-xl border">
              {webhooks.map((w) => (
                <div key={w.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 shrink-0">
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{w.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${w.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {w.isActive ? "active" : "paused"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{w.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {w.events.map((ev) => (
                        <span key={ev} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{ev}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {w._count.deliveries} deliveries · Created {format(new Date(w.createdAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => testWebhook(w.id)} title="Send ping" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Zap className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteWebhook(w.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification guide */}
          <div className="rounded-xl border p-5 space-y-3">
            <h4 className="text-sm font-semibold">Verifying webhook signatures</h4>
            <p className="text-xs text-muted-foreground">
              Each POST includes <code className="bg-muted px-1 rounded">X-Gulfa-Signature: sha256=&lt;hex&gt;</code>.
              Compute <code className="bg-muted px-1 rounded">HMAC-SHA256(your_secret, raw_body)</code> and compare.
            </p>
            <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-x-auto">{`// Node.js / Next.js verification example
import { createHmac } from "crypto";

function verifySignature(
  rawBody: string,
  secret: string,
  header: string          // value of X-Gulfa-Signature
): boolean {
  const expected = "sha256=" +
    createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
  // Use timingSafeEqual to prevent timing attacks
  return expected === header;
}`}</pre>
          </div>
        </div>
      )}

      {/* Architecture reference */}
      <div className="rounded-xl border p-5 space-y-4">
        <h4 className="text-sm font-semibold">API Reference</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { method: "GET", path: "/api/v1/employees", scope: "employees:read", desc: "List employees (cursor paginated)" },
            { method: "POST", path: "/api/v1/employees", scope: "employees:write", desc: "Upsert employee by employeeId" },
            { method: "PATCH", path: "/api/v1/employees/:id", scope: "employees:write", desc: "Update / terminate employee" },
            { method: "GET", path: "/api/v1/payroll", scope: "payroll:read", desc: "List payroll runs" },
            { method: "GET", path: "/api/v1/payroll/:runId/payslips", scope: "payroll:read", desc: "Payslips for a run" },
            { method: "GET", path: "/api/v1/attendance", scope: "attendance:read", desc: "Query attendance records" },
            { method: "POST", path: "/api/v1/attendance", scope: "attendance:write", desc: "Bulk upsert attendance (max 500)" },
            { method: "GET", path: "/api/v1/leave", scope: "leave:read", desc: "List leave requests" },
            { method: "POST", path: "/api/v1/leave", scope: "leave:write", desc: "Create leave request" },
            { method: "PATCH", path: "/api/v1/leave/:id", scope: "leave:write", desc: "Approve / reject / cancel" },
          ].map((e) => (
            <div key={e.path + e.method} className="flex gap-3 text-xs">
              <span className={`shrink-0 font-mono font-bold w-10 ${e.method === "GET" ? "text-blue-600" : e.method === "POST" ? "text-emerald-600" : "text-amber-600"}`}>
                {e.method}
              </span>
              <div className="min-w-0">
                <code className="font-mono">{e.path}</code>
                <p className="text-muted-foreground mt-0.5">{e.desc} · <span className="italic">{e.scope}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
