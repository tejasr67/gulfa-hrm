"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Home, Users, Building2, Plus, ChevronDown, ChevronUp, LogOut,
  UserX, Search, AlertCircle, FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAccommodationDialog } from "@/components/modules/accommodation/AddAccommodationDialog";
import { AddRoomDialog } from "@/components/modules/accommodation/AddRoomDialog";
import { AssignRoomDialog } from "@/components/modules/accommodation/AssignRoomDialog";
import { VacateDialog } from "@/components/modules/accommodation/VacateDialog";
import { BulkAccommodationDialog } from "@/components/modules/accommodation/BulkAccommodationDialog";
import { useAccommodations, useAccommodationStats, useUnassignedEmployees } from "@/modules/accommodation/hooks";
import type { AccommodationStats, AccommodationListEntry, RoomEntry, RoomAssignment } from "@/modules/accommodation/hooks";

type Props = { initialStats: AccommodationStats };

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  LABOR_CAMP: "Labour Camp",
  HOTEL: "Hotel",
};

const TYPE_COLORS: Record<string, string> = {
  APARTMENT: "bg-blue-50 text-blue-700",
  VILLA: "bg-emerald-50 text-emerald-700",
  LABOR_CAMP: "bg-orange-50 text-orange-700",
  HOTEL: "bg-purple-50 text-purple-700",
};

export function AccommodationClient({ initialStats }: Props) {
  const [tab, setTab] = useState<"properties" | "eligibility">("properties");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const { data: stats } = useAccommodationStats();
  const effectiveStats = stats ?? initialStats;
  const { data: accommodations, isLoading, refetch } = useAccommodations();
  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const STAT_CARDS = [
    { label: "Properties", value: effectiveStats.properties, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Rooms", value: effectiveStats.rooms, icon: Home, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Occupied", value: effectiveStats.occupied, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Available", value: effectiveStats.available, icon: Home, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${s.bg} shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["properties", "eligibility"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "properties" ? "Properties" : `Unassigned (${effectiveStats.unassigned})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/accommodation/reports">
            <Button variant="outline" size="sm">Occupancy Report</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowBulk(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Bulk Update
          </Button>
          {tab === "properties" && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Property
            </Button>
          )}
        </div>
      </div>

      {tab === "properties" && (
        <>
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : accommodations.length === 0 ? (
            <div className="rounded-xl border py-16 text-center">
              <Home className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
              <p className="font-medium">No properties yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add accommodation properties to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accommodations.map((acc) => (
                <AccommodationCard key={acc.id} acc={acc} onRefresh={handleRefresh} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "eligibility" && <EligibilityPanel onAssignSuccess={handleRefresh} />}

      <AddAccommodationDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={handleRefresh} />
      <BulkAccommodationDialog open={showBulk} onClose={() => setShowBulk(false)} onSuccess={handleRefresh} />
    </>
  );
}

// ── Property Card ─────────────────────────────────────────────────────────

function AccommodationCard({ acc, onRefresh }: { acc: AccommodationListEntry; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ roomId: string; roomNumber: string } | null>(null);
  const [vacateTarget, setVacateTarget] = useState<{ assignment: RoomAssignment; roomNumber: string } | null>(null);

  const occupied = acc.rooms.reduce((s, r) => s + r.assignments.filter((a) => !a.vacatedAt).length, 0);
  const totalCapacity = acc.rooms.reduce((s, r) => s + r.capacity, 0);
  const util = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;
  const typeColor = TYPE_COLORS[acc.type] ?? "bg-gray-50 text-gray-700";

  return (
    <Card className={!acc.isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{acc.name}</CardTitle>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                {TYPE_LABELS[acc.type] ?? acc.type}
              </span>
              {!acc.isActive && <span className="text-xs text-muted-foreground">(Inactive)</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {acc.address}{acc.city ? `, ${acc.city}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{occupied}/{totalCapacity} beds</p>
              <p className="text-xs text-muted-foreground">{util}% occupied</p>
            </div>
            <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground p-1">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${util >= 90 ? "bg-red-500" : util >= 70 ? "bg-amber-500" : "bg-indigo-500"}`}
            style={{ width: `${util}%` }}
          />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">{acc.rooms.length} room{acc.rooms.length !== 1 ? "s" : ""} · Cap {acc.capacity}</p>
            <Button size="sm" variant="outline" onClick={() => setShowAddRoom(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Room
            </Button>
          </div>

          {acc.rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No rooms added yet.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {acc.rooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  onAssign={() => setAssignTarget({ roomId: room.id, roomNumber: room.roomNumber })}
                  onVacate={(a) => setVacateTarget({ assignment: a, roomNumber: room.roomNumber })}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}

      <AddRoomDialog
        accommodationId={acc.id}
        accommodationName={acc.name}
        open={showAddRoom}
        onClose={() => setShowAddRoom(false)}
        onSuccess={onRefresh}
      />

      {assignTarget && (
        <AssignRoomDialog
          roomId={assignTarget.roomId}
          roomNumber={assignTarget.roomNumber}
          accommodationName={acc.name}
          open
          onClose={() => setAssignTarget(null)}
          onSuccess={() => { setAssignTarget(null); onRefresh(); }}
        />
      )}

      {vacateTarget && (
        <VacateDialog
          assignmentId={vacateTarget.assignment.id}
          employeeName={`${vacateTarget.assignment.employee.firstName} ${vacateTarget.assignment.employee.lastName}`}
          roomNumber={vacateTarget.roomNumber}
          accommodationName={acc.name}
          open
          onClose={() => setVacateTarget(null)}
          onSuccess={() => { setVacateTarget(null); onRefresh(); }}
        />
      )}
    </Card>
  );
}

// ── Room Row ──────────────────────────────────────────────────────────────

function RoomRow({
  room,
  onAssign,
  onVacate,
}: {
  room: RoomEntry;
  onAssign: () => void;
  onVacate: (a: RoomAssignment) => void;
}) {
  const activeAssignments = room.assignments.filter((a) => !a.vacatedAt);
  const isFull = activeAssignments.length >= room.capacity;
  const utilPct = Math.round((activeAssignments.length / room.capacity) * 100);

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              Room {room.roomNumber}
              {room.floor ? ` · Floor ${room.floor}` : ""}
            </p>
            <span className="text-xs text-muted-foreground">
              {activeAssignments.length}/{room.capacity} beds
            </span>
            {isFull && (
              <span className="inline-flex rounded-full bg-green-100 text-green-700 text-xs px-1.5 py-0.5 font-medium">Full</span>
            )}
          </div>
          <div className="w-24 h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${isFull ? "bg-green-500" : "bg-indigo-400"}`} style={{ width: `${utilPct}%` }} />
          </div>
          {activeAssignments.map((a) => (
            <div key={a.id} className="mt-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{a.employee.firstName} {a.employee.lastName}</span>
                <span className="text-xs text-muted-foreground ml-1">({a.employee.employeeId})</span>
                {a.monthlyRent ? <span className="text-xs text-muted-foreground ml-1">· AED {a.monthlyRent.toLocaleString()}/mo</span> : null}
                <span className="text-xs text-muted-foreground ml-1">· since {format(new Date(a.assignedAt), "dd MMM yyyy")}</span>
              </div>
              <button
                onClick={() => onVacate(a)}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5 shrink-0"
              >
                <LogOut className="h-3 w-3" />
                Vacate
              </button>
            </div>
          ))}
          {activeAssignments.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Vacant</p>
          )}
        </div>
        {!isFull && (
          <Button size="sm" variant="ghost" onClick={onAssign} className="shrink-0">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Assign
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Eligibility / Unassigned Panel ────────────────────────────────────────

function EligibilityPanel({ onAssignSuccess }: { onAssignSuccess: () => void }) {
  const { data: employees, isLoading } = useUnassignedEmployees();
  const [search, setSearch] = useState("");

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.department?.name.toLowerCase().includes(q) ||
      (e.nationality ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="rounded-xl border">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">{employees.length} employee{employees.length !== 1 ? "s" : ""} without accommodation</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          {employees.length === 0 ? (
            <>
              <AlertCircle className="h-8 w-8 text-green-500 mb-2" />
              <p className="font-medium text-green-700">All active employees have accommodation</p>
            </>
          ) : (
            <>
              <UserX className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="font-medium">No matches</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Employee</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Department</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Position</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Nationality</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link href={`/employees/${e.id}`} className="hover:underline">
                      <p className="font-medium">{e.firstName} {e.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{e.employeeId}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                    {e.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {e.position?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {e.nationality ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                      <UserX className="h-3 w-3" />
                      No room
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
