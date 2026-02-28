"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PhotoData, AreaData } from "./photo-viewer";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PhotoActionsProps = {
  photo: PhotoData;
  areas: AreaData[];
  role: string;
  onUpdate: (updates: Partial<PhotoData>) => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PhotoActions({ photo, areas, role, onUpdate }: PhotoActionsProps) {
  const [flagging, setFlagging] = useState(false);
  const [noteValue, setNoteValue] = useState(photo.damageNote ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [areaSaving, setAreaSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sync note value when switching photos */
  useEffect(() => {
    setNoteValue(photo.damageNote ?? "");
  }, [photo.id, photo.damageNote]);

  /* Cleanup timers on unmount */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  /* ---- Toggle damage flag ---- */

  const toggleFlag = useCallback(async () => {
    const newValue = !photo.isDamageFlagged;

    // Optimistic update
    onUpdate({ isDamageFlagged: newValue });
    setFlagging(true);

    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_damage_flagged: newValue }),
      });

      if (!res.ok) {
        // Revert on failure
        onUpdate({ isDamageFlagged: !newValue });
      }
    } catch {
      onUpdate({ isDamageFlagged: !newValue });
    } finally {
      setFlagging(false);
    }
  }, [photo.id, photo.isDamageFlagged, onUpdate]);

  /* ---- Debounced damage note save ---- */

  const saveNote = useCallback(
    async (value: string) => {
      setNoteSaving(true);
      setNoteSaved(false);

      try {
        const res = await fetch(`/api/photos/${photo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ damage_note: value }),
        });

        if (res.ok) {
          onUpdate({ damageNote: value || null });
          setNoteSaved(true);
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setNoteSaved(false), 2000);
        }
      } catch {
        // Silently fail; user can retry
      } finally {
        setNoteSaving(false);
      }
    },
    [photo.id, onUpdate],
  );

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setNoteValue(value);
    setNoteSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(value), 500);
  }

  /* ---- Area reassignment ---- */

  const handleAreaChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value || null;
      setAreaSaving(true);

      // Optimistic update
      onUpdate({ areaId: selectedId });

      try {
        const res = await fetch(`/api/photos/${photo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area_id: selectedId }),
        });

        if (!res.ok) {
          // Revert on failure
          onUpdate({ areaId: photo.areaId });
        }
      } catch {
        onUpdate({ areaId: photo.areaId });
      } finally {
        setAreaSaving(false);
      }
    },
    [photo.id, photo.areaId, onUpdate],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Damage flag toggle ---- */}
      <button
        onClick={toggleFlag}
        disabled={flagging}
        className={`flex items-center justify-center gap-2 rounded-btn px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
          photo.isDamageFlagged
            ? "bg-status-critical text-white hover:bg-status-critical/90"
            : "border border-white/20 bg-transparent text-white hover:bg-white/10"
        }`}
      >
        {/* Flag icon */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3v18m0-18l9 6-9 6"
          />
        </svg>
        {photo.isDamageFlagged ? "Flagged" : "Flag damage"}
        {flagging && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
      </button>

      {/* ---- Damage note (visible when flagged) ---- */}
      {photo.isDamageFlagged && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Damage note
          </label>
          <textarea
            value={noteValue}
            onChange={handleNoteChange}
            placeholder="Describe the damage..."
            rows={3}
            className="w-full resize-none rounded-btn border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex h-4 items-center">
            {noteSaving && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg
                  className="h-3 w-3 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving...
              </span>
            )}
            {noteSaved && !noteSaving && (
              <span className="flex items-center gap-1 text-xs text-accent">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---- Area reassignment (owner only) ---- */}
      {role === "owner" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Assign to area
          </label>
          <div className="relative">
            <select
              value={photo.areaId ?? ""}
              onChange={handleAreaChange}
              disabled={areaSaving}
              className="w-full appearance-none rounded-btn border border-white/20 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            >
              <option value="" className="bg-gray-900 text-white">
                General (no area)
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.id} className="bg-gray-900 text-white">
                  {area.name}
                </option>
              ))}
            </select>
            {/* Chevron icon */}
            <svg
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {areaSaving && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg
                className="h-3 w-3 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
