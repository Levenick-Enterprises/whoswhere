"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  type ReactNode,
} from "react";

import { reassignPersonAction } from "@/app/people/actions";

const UNASSIGNED = "unassigned";

type Jobsite = { id: string; name: string; address: string | null };
type Person = {
  id: string;
  name: string;
  phone: string | null;
  current_jobsite_id: string | null;
};

type OptimisticUpdate = { personId: string; jobsiteId: string | null };

export function JobsitesList({ jobsites, people }: { jobsites: Jobsite[]; people: Person[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const openPerson = useCallback((id: string) => router.push(`/people/${id}`), [router]);

  const [optimisticPeople, applyOptimisticUpdate] = useOptimistic(
    people,
    (state, { personId, jobsiteId }: OptimisticUpdate) =>
      state.map((p) => (p.id === personId ? { ...p, current_jobsite_id: jobsiteId } : p)),
  );

  const sensors = useSensors(
    // Tiny pointer movement initiates a drag — keeps mouse-based DnD snappy
    // without stealing clicks from links and buttons.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Long-press to drag on touch. Without a delay, the page can't scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Group all (optimistic) people by their current jobsite.
  const peopleByJobsite = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const person of optimisticPeople) {
      const key = person.current_jobsite_id ?? UNASSIGNED;
      const bucket = map.get(key);
      if (bucket) bucket.push(person);
      else map.set(key, [person]);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [optimisticPeople]);

  const trimmedQuery = query.trim().toLowerCase();
  const matchesQuery = (text: string | null | undefined) =>
    !!text && text.toLowerCase().includes(trimmedQuery);

  const visibleJobsites = useMemo(() => {
    if (!trimmedQuery) return jobsites;
    return jobsites.filter((jobsite) => {
      if (matchesQuery(jobsite.name) || matchesQuery(jobsite.address)) return true;
      const sitePeople = peopleByJobsite.get(jobsite.id) ?? [];
      return sitePeople.some((p) => matchesQuery(p.name) || matchesQuery(p.phone));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsites, peopleByJobsite, trimmedQuery]);

  const unassignedAll = peopleByJobsite.get(UNASSIGNED) ?? [];
  const visibleUnassigned = useMemo(() => {
    if (!trimmedQuery) return unassignedAll;
    return unassignedAll.filter((p) => matchesQuery(p.name) || matchesQuery(p.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassignedAll, trimmedQuery]);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const person = optimisticPeople.find((p) => p.id === id);
    setActivePerson(person ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePerson(null);
    if (!event.over) return;

    const personId = String(event.active.id);
    const overId = String(event.over.id);
    const targetJobsiteId = overId === UNASSIGNED ? null : overId;

    const person = optimisticPeople.find((p) => p.id === personId);
    if (!person || person.current_jobsite_id === targetJobsiteId) return;

    startTransition(async () => {
      applyOptimisticUpdate({ personId, jobsiteId: targetJobsiteId });
      try {
        await reassignPersonAction(personId, targetJobsiteId);
      } catch (err) {
        // The optimistic state has already jumped the pill to its new spot.
        // On failure, force a server re-render so the UI reverts to truth
        // rather than leaving the lie in place.
        console.error("reassignPerson failed; refreshing from server", err);
        router.refresh();
      }
    });
  }

  const showUnassignedSection = !trimmedQuery || visibleUnassigned.length > 0;
  const nothingMatches = visibleJobsites.length === 0 && visibleUnassigned.length === 0;

  return (
    <DndContext
      id="jobsites-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        <input
          type="search"
          inputMode="search"
          placeholder="Search jobsites, addresses, or crew names…"
          aria-label="Search jobsites"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
        />

        {trimmedQuery && nothingMatches && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nothing matches &ldquo;{query}&rdquo;.
          </div>
        )}

        {jobsites.length === 0 && unassignedAll.length === 0 && !trimmedQuery && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            <p>No jobsites yet.</p>
            <p className="mt-1 text-xs">Tap &ldquo;+ New&rdquo; above to create one.</p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {showUnassignedSection && (
            <li>
              <DropZone
                id={UNASSIGNED}
                title="Unassigned"
                subtitle="People not at any jobsite. Drop someone here to pull them off their site."
                count={unassignedAll.length}
              >
                {visibleUnassigned.map((person) => (
                  <DraggablePill key={person.id} person={person} onOpen={openPerson} />
                ))}
              </DropZone>
            </li>
          )}

          {visibleJobsites.map((jobsite) => {
            const sitePeople = peopleByJobsite.get(jobsite.id) ?? [];
            const visibleSitePeople = trimmedQuery
              ? sitePeople.filter((p) => matchesQuery(p.name) || matchesQuery(p.phone))
              : sitePeople;
            const titleMatches =
              !trimmedQuery || matchesQuery(jobsite.name) || matchesQuery(jobsite.address);
            const displayedPills = trimmedQuery && titleMatches ? sitePeople : visibleSitePeople;

            return (
              <li key={jobsite.id}>
                <DropZone
                  id={jobsite.id}
                  title={jobsite.name}
                  subtitle={jobsite.address ?? undefined}
                  count={sitePeople.length}
                  href={`/jobsites/${jobsite.id}`}
                >
                  {displayedPills.map((person) => (
                    <DraggablePill key={person.id} person={person} onOpen={openPerson} />
                  ))}
                </DropZone>
              </li>
            );
          })}
        </ul>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePerson && <PillStatic name={activePerson.name} dragging />}
      </DragOverlay>
    </DndContext>
  );
}

function DropZone({
  id,
  title,
  subtitle,
  count,
  href,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  href?: string;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const containerClass = [
    "flex flex-col gap-2 rounded-lg border p-4 transition-colors",
    isOver
      ? "border-zinc-950 bg-zinc-50 dark:border-white dark:bg-zinc-900"
      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
  ].join(" ");

  return (
    <div ref={setNodeRef} className={containerClass}>
      <div className="flex items-baseline justify-between gap-3">
        {href ? (
          <Link
            href={href}
            className="truncate text-base font-semibold tracking-tight hover:underline"
          >
            {title}
          </Link>
        ) : (
          <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
        )}
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
          {count} {count === 1 ? "person" : "people"}
        </span>
      </div>
      {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      <ul className="flex flex-wrap gap-1.5">
        {children}
        {count === 0 && <li className="text-xs italic text-zinc-400">No one here.</li>}
      </ul>
    </div>
  );
}

function DraggablePill({ person, onOpen }: { person: Person; onOpen: (id: string) => void }) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: person.id,
  });

  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        aria-label={`Open ${person.name}'s record. Long-press to drag and reassign.`}
        onClick={() => onOpen(person.id)}
        {...attributes}
        {...listeners}
        className={`touch-none cursor-grab select-none rounded-full px-3 py-1 text-sm transition-opacity active:cursor-grabbing [-webkit-touch-callout:none] [-webkit-user-select:none] ${
          isDragging
            ? "opacity-30"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        {person.name}
      </button>
    </li>
  );
}

function PillStatic({ name, dragging = false }: { name: string; dragging?: boolean }) {
  return (
    <span
      className={`inline-flex select-none rounded-full px-3 py-1 text-sm shadow-lg ${
        dragging
          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {name}
    </span>
  );
}
