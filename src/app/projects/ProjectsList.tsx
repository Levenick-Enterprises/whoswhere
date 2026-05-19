"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
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

import { reassignPerson } from "@/app/people/actions";
import { FormErrorBanner } from "@/components/FormErrorBanner";
import { MapsLinkButton } from "@/components/MapsLinkButton";
import { usePageBusyAPI } from "@/lib/page-busy";
import { CARD_SIZE_CLASSES, useCardSize, useDragDelayMs } from "@/lib/usePrefs";

const UNASSIGNED = "unassigned";

type Project = { id: string; name: string; address: string | null };
type Person = {
  id: string;
  name: string;
  phone: string | null;
  current_project_id: string | null;
};

type OptimisticUpdate = { personId: string; projectId: string | null };

export function ProjectsList({
  projects,
  people,
  canEdit,
}: {
  projects: Project[];
  people: Person[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const pageBusy = usePageBusyAPI();
  const openPerson = useCallback((id: string) => router.push(`/people/${id}`), [router]);

  const [optimisticPeople, applyOptimisticUpdate] = useOptimistic(
    people,
    (state, { personId, projectId }: OptimisticUpdate) =>
      state.map((p) => (p.id === personId ? { ...p, current_project_id: projectId } : p)),
  );

  // Touch delay is user-configurable on /more (snappy / balanced / deliberate);
  // MouseSensor (vs PointerSensor) keeps the desktop path snappy without ever
  // dispatching for touches, so the TouchSensor delay actually gates phones.
  const dragDelayMs = useDragDelayMs();
  const [cardSize] = useCardSize();
  const sizeClasses = CARD_SIZE_CLASSES[cardSize];
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: dragDelayMs, tolerance: 12 } }),
    useSensor(KeyboardSensor),
  );

  // Group all (optimistic) people by their current project.
  const peopleByProject = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const person of optimisticPeople) {
      const key = person.current_project_id ?? UNASSIGNED;
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

  const visibleProjects = useMemo(() => {
    if (!trimmedQuery) return projects;
    return projects.filter((project) => {
      if (matchesQuery(project.name) || matchesQuery(project.address)) return true;
      const projectPeople = peopleByProject.get(project.id) ?? [];
      return projectPeople.some((p) => matchesQuery(p.name) || matchesQuery(p.phone));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, peopleByProject, trimmedQuery]);

  const unassignedAll = peopleByProject.get(UNASSIGNED) ?? [];
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
    const targetProjectId = overId === UNASSIGNED ? null : overId;

    const person = optimisticPeople.find((p) => p.id === personId);
    if (!person || person.current_project_id === targetProjectId) return;

    startTransition(async () => {
      // Register busy so a remote realtime event doesn't fire router.refresh()
      // mid-drag and reset the optimistic overlay to a snapshot that doesn't
      // yet contain this write.
      const release = pageBusy?.register();
      applyOptimisticUpdate({ personId, projectId: targetProjectId });
      try {
        const result = await reassignPerson(personId, targetProjectId);
        setDragError(result.ok ? null : result.message);
      } finally {
        release?.();
        // Refresh AFTER release in every branch:
        //   - Success: the realtime echo for our own write was probably
        //     skipped while we were busy. The action's revalidatePath should
        //     have updated the route, but the explicit refresh is cheap
        //     insurance — keeps useOptimistic's base state in sync.
        //   - Failure: reverts the optimistic update by re-fetching truth.
        router.refresh();
      }
    });
  }

  const showUnassignedSection = !trimmedQuery || visibleUnassigned.length > 0;
  const nothingMatches = visibleProjects.length === 0 && visibleUnassigned.length === 0;

  return (
    <DndContext
      id="projects-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        <FormErrorBanner state={dragError} />

        <input
          type="search"
          inputMode="search"
          placeholder="Search projects, addresses, or crew names…"
          aria-label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
        />

        {trimmedQuery && nothingMatches && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nothing matches &ldquo;{query}&rdquo;.
          </div>
        )}

        {projects.length === 0 && unassignedAll.length === 0 && !trimmedQuery && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            <p>No projects yet.</p>
            <p className="mt-1 text-xs">Tap &ldquo;+ New&rdquo; above to create one.</p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {showUnassignedSection && (
            <li>
              <DropZone
                id={UNASSIGNED}
                title="Unassigned"
                subtitle="People not at any project. Drop someone here to pull them off their project."
                count={unassignedAll.length}
                gapClass={sizeClasses.gap}
              >
                {visibleUnassigned.map((person) => (
                  <PillForRole
                    key={person.id}
                    canEdit={canEdit}
                    person={person}
                    onOpen={openPerson}
                    pillClass={sizeClasses.pill}
                  />
                ))}
              </DropZone>
            </li>
          )}

          {visibleProjects.map((project) => {
            const projectPeople = peopleByProject.get(project.id) ?? [];
            const visibleProjectPeople = trimmedQuery
              ? projectPeople.filter((p) => matchesQuery(p.name) || matchesQuery(p.phone))
              : projectPeople;
            const titleMatches =
              !trimmedQuery || matchesQuery(project.name) || matchesQuery(project.address);
            const displayedPills =
              trimmedQuery && titleMatches ? projectPeople : visibleProjectPeople;

            return (
              <li key={project.id}>
                <DropZone
                  id={project.id}
                  title={project.name}
                  subtitle={
                    project.address ? (
                      <MapsLinkButton
                        address={project.address}
                        ariaLabel={`Open ${project.address} in maps — choose Apple Maps or Google Maps`}
                        className="text-left underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
                      >
                        {project.address}
                      </MapsLinkButton>
                    ) : undefined
                  }
                  count={projectPeople.length}
                  href={`/projects/${project.id}`}
                  gapClass={sizeClasses.gap}
                >
                  {displayedPills.map((person) => (
                    <PillForRole
                      key={person.id}
                      canEdit={canEdit}
                      person={person}
                      onOpen={openPerson}
                      pillClass={sizeClasses.pill}
                    />
                  ))}
                </DropZone>
              </li>
            );
          })}
        </ul>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePerson && (
          <PillStatic name={activePerson.name} pillClass={sizeClasses.pill} dragging />
        )}
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
  gapClass,
  children,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  count: number;
  href?: string;
  gapClass: string;
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
      {subtitle && <div className="text-sm text-zinc-500">{subtitle}</div>}
      <ul className={`flex flex-wrap ${gapClass}`}>
        {children}
        {count === 0 && <li className="text-xs italic text-zinc-400">No one here.</li>}
      </ul>
    </div>
  );
}

// React forbids conditional hooks, so the draggable variant lives in its
// own component. Audit users render `ReadOnlyPill` — same look, no DnD
// handlers, no useDraggable subscription. The DropZones in this list still
// wrap `useDroppable`, which is harmless when nothing draggable is mounted.
function PillForRole(props: {
  canEdit: boolean;
  person: Person;
  onOpen: (id: string) => void;
  pillClass: string;
}) {
  if (props.canEdit) {
    return (
      <DraggablePill person={props.person} onOpen={props.onOpen} pillClass={props.pillClass} />
    );
  }
  return <ReadOnlyPill person={props.person} onOpen={props.onOpen} pillClass={props.pillClass} />;
}

function DraggablePill({
  person,
  onOpen,
  pillClass,
}: {
  person: Person;
  onOpen: (id: string) => void;
  pillClass: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: person.id,
  });

  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        aria-label={`Open ${person.name}'s record. Hold to drag and reassign.`}
        onClick={() => onOpen(person.id)}
        {...attributes}
        {...listeners}
        className={`cursor-grab touch-pan-y select-none rounded-full ${pillClass} transition-opacity active:cursor-grabbing [-webkit-touch-callout:none] [-webkit-user-select:none] ${
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

function ReadOnlyPill({
  person,
  onOpen,
  pillClass,
}: {
  person: Person;
  onOpen: (id: string) => void;
  pillClass: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-label={`Open ${person.name}'s record`}
        onClick={() => onOpen(person.id)}
        className={`select-none rounded-full ${pillClass} bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800`}
      >
        {person.name}
      </button>
    </li>
  );
}

function PillStatic({
  name,
  pillClass,
  dragging = false,
}: {
  name: string;
  pillClass: string;
  dragging?: boolean;
}) {
  return (
    <span
      className={`inline-flex select-none rounded-full ${pillClass} shadow-lg ${
        dragging
          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {name}
    </span>
  );
}
