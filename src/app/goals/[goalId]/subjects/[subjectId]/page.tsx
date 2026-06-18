"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Layers, Puzzle, GripVertical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { Header, BreadcrumbEntry } from "@/components/header";
import { SubTopicCard } from "@/components/subtopic-card";
import { SubTopicListItem } from "@/components/subtopic-list-item";
import { CreateDialog, FieldConfig } from "@/components/create-dialog";
import { EditDialog } from "@/components/edit-dialog";
import { ReorderDialog } from "@/components/reorder-dialog";
import { ItemActionsMenu } from "@/components/item-actions-menu";
import { ViewModeSwitcher, ViewMode } from "@/components/view-mode-switcher";
import { SubtopicDetailModal } from "@/components/subtopic-detail-modal";
import { TopicGridSkeleton, SubtopicGridSkeleton } from "@/components/page-skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useSubjectStore } from "@/stores/subject-store";
import { useTopicStore } from "@/stores/topic-store";
import { useSubTopicStore } from "@/stores/subtopic-store";
import { Topic, SubTopic } from "@/types";

const topicFields: FieldConfig[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "e.g., Deadlocks",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe this topic...",
  },
];

const subtopicFields: FieldConfig[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "e.g., Deadlock Prevention",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe this subtopic...",
  },
];

export default function SubjectDetailPage() {
  return (
    <AuthGuard>
      <SubjectDetailContent />
    </AuthGuard>
  );
}

// --- Sortable Topic Item ---
function SortableTopicItem({
  topic,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onReorder,
}: {
  topic: Topic;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: topic.id,
    transition: {
      duration: 250,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    animationDelay: `${index * 50}ms`,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`animate-card-enter-sortable w-full flex items-center gap-1 rounded-lg text-left group/topic ${
        isDragging
          ? "shadow-lg ring-2 ring-primary/30 bg-card opacity-80"
          : ""
      } ${
        !isDragging && isSelected
          ? "bg-primary text-primary-foreground shadow-sm"
          : !isDragging
            ? "hover:bg-accent text-foreground"
            : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`shrink-0 cursor-grab active:cursor-grabbing p-1.5 rounded-md ${
          isSelected
            ? "text-primary-foreground/60 hover:text-primary-foreground"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        }`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <button
        onClick={onSelect}
        className="flex items-center gap-2.5 py-2.5 pr-1 flex-1 min-w-0"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
            isSelected
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {topic.order ?? index + 1}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <span className="text-sm font-medium truncate block">
            {topic.name}
          </span>
          {topic.description && (
            <span
              className={`text-[11px] truncate block mt-0.5 ${
                isSelected
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}
            >
              {topic.description}
            </span>
          )}
        </div>
      </button>
      <div
        className={`shrink-0 pr-1 ${
          isSelected
            ? "opacity-100"
            : "opacity-0 group-hover/topic:opacity-100"
        } transition-opacity`}
      >
        <ItemActionsMenu
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onReorder={onReorder}
          triggerClassName={
            isSelected
              ? "text-primary-foreground hover:bg-primary-foreground/20"
              : ""
          }
        />
      </div>
    </div>
  );
}

// --- Sortable Subtopic Item (grid/list/compact) ---
function SortableSubtopicItem({
  subtopic,
  index,
  viewMode,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onReorder,
}: {
  subtopic: SubTopic;
  index: number;
  viewMode: ViewMode;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: subtopic.id,
    transition: {
      duration: 250,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    animationDelay: `${index * 80}ms`,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  const actionsNode = (
    <ItemActionsMenu
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onReorder={onReorder}
    />
  );

  const dragHandleProps = { ...attributes, ...listeners };

  if (viewMode === "grid") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`animate-card-enter-sortable group/subtopic ${isDragging ? "ring-2 ring-primary/30 rounded-xl shadow-lg opacity-80" : ""}`}
      >
        <div className="relative">
          <div
            {...dragHandleProps}
            className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover/subtopic:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/subtopic:opacity-100 transition-opacity">
            {actionsNode}
          </div>
          <div onClick={onClick} className="cursor-pointer">
            <SubTopicCard subtopic={subtopic} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`animate-card-enter-sortable ${isDragging ? "ring-2 ring-primary/30 rounded-xl shadow-lg opacity-80" : ""}`}>
      <SubTopicListItem
        subtopic={subtopic}
        compact={viewMode === "compact"}
        dragHandleProps={dragHandleProps}
        actions={actionsNode}
        onClick={onClick}
      />
    </div>
  );
}

// --- Main Content ---
function SubjectDetailContent() {
  const params = useParams<{ goalId: string; subjectId: string }>();
  const { goalId, subjectId } = params;

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Edit dialog state
  const [editTopicOpen, setEditTopicOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editSubtopicOpen, setEditSubtopicOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<SubTopic | null>(null);

  // Detail modal state
  const [detailSubtopic, setDetailSubtopic] = useState<SubTopic | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reorder dialog state
  const [reorderTopicOpen, setReorderTopicOpen] = useState(false);
  const [reorderingTopic, setReorderingTopic] = useState<Topic | null>(null);
  const [reorderSubtopicOpen, setReorderSubtopicOpen] = useState(false);
  const [reorderingSubtopic, setReorderingSubtopic] = useState<SubTopic | null>(null);

  const { user } = useAuthStore();
  const { activeGoal, goals, setActiveGoal, fetchGoals } = useGoalStore();
  const { activeSubject, subjects, setActiveSubject, fetchSubjects } =
    useSubjectStore();
  const {
    topics,
    loading: topicsLoading,
    error: topicsError,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    duplicateTopic,
    reorderTopics,
    setTopics,
  } = useTopicStore();
  const {
    subtopics,
    loading: subtopicsLoading,
    error: subtopicsError,
    fetchSubTopics,
    createSubTopic,
    updateSubTopic,
    deleteSubTopic,
    duplicateSubTopic,
    reorderSubTopics,
    setSubtopics,
  } = useSubTopicStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Resizable sidebar ---
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      setIsResizing(true);

      const handleMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX.current;
        const newWidth = Math.max(200, Math.min(480, startWidth.current + delta));
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth]
  );

  useEffect(() => {
    if (user && goals.length === 0) fetchGoals(user.id);
  }, [user, goals.length, fetchGoals]);

  useEffect(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) setActiveGoal(goal);
  }, [goals, goalId, setActiveGoal]);

  useEffect(() => {
    if (subjects.length === 0) fetchSubjects(goalId);
  }, [subjects.length, goalId, fetchSubjects]);

  useEffect(() => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) setActiveSubject(subject);
  }, [subjects, subjectId, setActiveSubject]);

  useEffect(() => {
    if (subjectId) fetchTopics(subjectId);
  }, [subjectId, fetchTopics]);

  useEffect(() => {
    if (topics.length > 0 && !selectedTopic) {
      setSelectedTopic(topics[0]);
    }
  }, [topics, selectedTopic]);

  useEffect(() => {
    if (selectedTopic) {
      fetchSubTopics(selectedTopic.id);
    }
  }, [selectedTopic, fetchSubTopics]);

  // --- Handlers ---
  const handleSelectTopic = (topic: Topic) => setSelectedTopic(topic);

  const handleCreateTopic = async (data: Record<string, string | number>) => {
    await createTopic(subjectId, data);
  };

  const handleCreateSubTopic = async (data: Record<string, string | number>) => {
    if (selectedTopic) await createSubTopic(selectedTopic.id, data);
  };

  // Topic actions
  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setEditTopicOpen(true);
  };

  const handleSaveEditTopic = async (data: Record<string, string | number>) => {
    if (editingTopic) {
      await updateTopic(editingTopic.id, data);
      if (selectedTopic?.id === editingTopic.id) {
        setSelectedTopic({ ...editingTopic, ...data } as Topic);
      }
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    await deleteTopic(topic.id);
    if (selectedTopic?.id === topic.id) {
      setSelectedTopic(null);
    }
  };

  const handleDuplicateTopic = async (topic: Topic) => {
    await duplicateTopic(subjectId, topic);
  };

  const handleReorderTopicOpen = (topic: Topic) => {
    setReorderingTopic(topic);
    setReorderTopicOpen(true);
  };

  const handleReorderTopicSubmit = async (newPosition: number) => {
    if (!reorderingTopic) return;
    const sorted = [...topics].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((t) => t.id === reorderingTopic.id);
    const moved = arrayMove(sorted, currentIndex, newPosition - 1);
    const orderedIds = moved.map((t) => t.id);
    setTopics(moved.map((t, i) => ({ ...t, order: i + 1 })));
    await reorderTopics(subjectId, orderedIds);
  };

  const handleTopicDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    const moved = arrayMove(topics, oldIndex, newIndex);
    const reordered = moved.map((t, i) => ({ ...t, order: i + 1 }));
    setTopics(reordered);
    await reorderTopics(subjectId, reordered.map((t) => t.id));
  };

  // Subtopic detail modal
  const handleOpenDetail = (subtopic: SubTopic) => {
    setDetailSubtopic(subtopic);
    setDetailOpen(true);
  };

  // Subtopic actions
  const handleEditSubtopic = (subtopic: SubTopic) => {
    setEditingSubtopic(subtopic);
    setEditSubtopicOpen(true);
  };

  const handleSaveEditSubtopic = async (data: Record<string, string | number>) => {
    if (editingSubtopic) {
      await updateSubTopic(editingSubtopic.id, data);
    }
  };

  const handleDeleteSubtopic = async (subtopic: SubTopic) => {
    await deleteSubTopic(subtopic.id);
  };

  const handleDuplicateSubtopic = async (subtopic: SubTopic) => {
    if (selectedTopic) await duplicateSubTopic(selectedTopic.id, subtopic);
  };

  const handleReorderSubtopicOpen = (subtopic: SubTopic) => {
    setReorderingSubtopic(subtopic);
    setReorderSubtopicOpen(true);
  };

  const handleReorderSubtopicSubmit = async (newPosition: number) => {
    if (!reorderingSubtopic || !selectedTopic) return;
    const sorted = [...subtopics].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((st) => st.id === reorderingSubtopic.id);
    const moved = arrayMove(sorted, currentIndex, newPosition - 1);
    const orderedIds = moved.map((st) => st.id);
    setSubtopics(moved.map((st, i) => ({ ...st, order: i + 1 })));
    await reorderSubTopics(selectedTopic.id, orderedIds);
  };

  const handleSubtopicDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedTopic) return;
    const oldIndex = subtopics.findIndex((st) => st.id === active.id);
    const newIndex = subtopics.findIndex((st) => st.id === over.id);
    const moved = arrayMove(subtopics, oldIndex, newIndex);
    const reordered = moved.map((st, i) => ({ ...st, order: i + 1 }));
    setSubtopics(reordered);
    await reorderSubTopics(selectedTopic.id, reordered.map((st) => st.id));
  };

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal", href: `/goals/${goalId}` },
    { label: activeSubject?.name || "Subject" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {activeSubject?.name || "Topics"}
            </h1>
            {activeSubject?.description && (
              <p className="text-muted-foreground mt-1">
                {activeSubject.description}
              </p>
            )}
          </div>
        </div>

        {topicsError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in-up">
            {topicsError}
          </div>
        )}

        {topicsLoading && <TopicGridSkeleton count={4} />}

        {!topicsLoading && !topicsError && topics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No topics yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Add topics to break down this subject into manageable sections.
            </p>
            <CreateDialog
              title="Topic"
              description="Add a new topic to this subject."
              fields={topicFields}
              onSubmit={handleCreateTopic}
            />
          </div>
        )}

        {!topicsLoading && topics.length > 0 && (
          <div
            className="flex rounded-xl border bg-card shadow-sm animate-fade-in-up"
            style={{ minHeight: "calc(100vh - 10rem)" }}
          >
            {/* Left: Topics sidebar */}
            {!sidebarCollapsed && (
              <div
                className="shrink-0 bg-muted/30 flex flex-col transition-[width] duration-200"
                style={{ width: sidebarWidth }}
              >
                <div className="flex h-14 items-center justify-between px-4 border-b bg-muted/40 gap-2 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Topics
                  </p>
                  <div className="flex items-center gap-1">
                    <CreateDialog
                      title="Topic"
                      description="Add a new topic to this subject."
                      fields={topicFields}
                      onSubmit={handleCreateTopic}
                      triggerLabel="Add"
                      triggerVariant="outline"
                      triggerSize="xs"
                    />
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Collapse sidebar"
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    onDragEnd={handleTopicDragEnd}
                  >
                    <SortableContext
                      items={topics.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {topics.map((topic, i) => (
                        <SortableTopicItem
                          key={topic.id}
                          topic={topic}
                          index={i}
                          isSelected={selectedTopic?.id === topic.id}
                          onSelect={() => handleSelectTopic(topic)}
                          onEdit={() => handleEditTopic(topic)}
                          onDelete={() => handleDeleteTopic(topic)}
                          onDuplicate={() => handleDuplicateTopic(topic)}
                          onReorder={() => handleReorderTopicOpen(topic)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}

            {/* Resize handle / Collapsed sidebar toggle */}
            {sidebarCollapsed ? (
              <div className="shrink-0 border-r bg-muted/30 flex flex-col items-center py-3 px-1.5 gap-2">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest [writing-mode:vertical-lr]">
                  Topics
                </span>
              </div>
            ) : (
              <div
                onMouseDown={handleResizeStart}
                className={`w-1 shrink-0 cursor-col-resize relative transition-colors ${
                  isResizing ? "bg-primary" : "bg-border hover:bg-primary/50"
                }`}
              >
                <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
              </div>
            )}

            {/* Right: Subtopics panel */}
            <div className="flex-1 min-w-0 flex flex-col">
              {selectedTopic && (
                <div key={selectedTopic.id} className="flex flex-col flex-1">
                  {/* Panel header */}
                  <div className="flex h-14 items-center justify-between px-6 border-b shrink-0">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold tracking-tight truncate">
                        {selectedTopic.name}
                      </h2>
                      {selectedTopic.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedTopic.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 ml-4 flex items-center gap-2">
                      <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />
                      <CreateDialog
                        title="Subtopic"
                        description="Add a new subtopic to track your learning progress."
                        fields={subtopicFields}
                        onSubmit={handleCreateSubTopic}
                      />
                    </div>
                  </div>

                  {/* Panel content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {subtopicsLoading && <SubtopicGridSkeleton count={3} />}

                    {subtopicsError && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {subtopicsError}
                      </div>
                    )}

                    {!subtopicsLoading && !subtopicsError && subtopics.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                          <Puzzle className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold mb-1">
                          No subtopics yet
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Add subtopics to track mastery, revisions, and
                          performance.
                        </p>
                      </div>
                    )}

                    {!subtopicsLoading && subtopics.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleSubtopicDragEnd}
                      >
                        <SortableContext
                          items={subtopics.map((st) => st.id)}
                          strategy={
                            viewMode === "grid"
                              ? rectSortingStrategy
                              : verticalListSortingStrategy
                          }
                        >
                          <div
                            className={
                              viewMode === "grid"
                                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                                : "flex flex-col gap-2"
                            }
                          >
                            {subtopics.map((subtopic, i) => (
                              <SortableSubtopicItem
                                key={subtopic.id}
                                subtopic={subtopic}
                                index={i}
                                viewMode={viewMode}
                                onClick={() => handleOpenDetail(subtopic)}
                                onEdit={() => handleEditSubtopic(subtopic)}
                                onDelete={() => handleDeleteSubtopic(subtopic)}
                                onDuplicate={() => handleDuplicateSubtopic(subtopic)}
                                onReorder={() => handleReorderSubtopicOpen(subtopic)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit Topic Dialog */}
      {editingTopic && (
        <EditDialog
          title="Topic"
          description="Update this topic's details."
          fields={topicFields}
          initialData={{
            name: editingTopic.name,
            description: editingTopic.description,
          }}
          open={editTopicOpen}
          onOpenChange={setEditTopicOpen}
          onSubmit={handleSaveEditTopic}
        />
      )}

      {/* Edit Subtopic Dialog */}
      {editingSubtopic && (
        <EditDialog
          title="Subtopic"
          description="Update this subtopic's details."
          fields={subtopicFields}
          initialData={{
            name: editingSubtopic.name,
            description: editingSubtopic.description,
          }}
          open={editSubtopicOpen}
          onOpenChange={setEditSubtopicOpen}
          onSubmit={handleSaveEditSubtopic}
        />
      )}

      {/* Reorder Topic Dialog */}
      {reorderingTopic && (
        <ReorderDialog
          title="Topic"
          item={{
            id: reorderingTopic.id,
            name: reorderingTopic.name,
            order: reorderingTopic.order,
          }}
          totalItems={topics.length}
          open={reorderTopicOpen}
          onOpenChange={setReorderTopicOpen}
          onSubmit={handleReorderTopicSubmit}
        />
      )}

      {/* Reorder Subtopic Dialog */}
      {reorderingSubtopic && (
        <ReorderDialog
          title="Subtopic"
          item={{
            id: reorderingSubtopic.id,
            name: reorderingSubtopic.name,
            order: reorderingSubtopic.order,
          }}
          totalItems={subtopics.length}
          open={reorderSubtopicOpen}
          onOpenChange={setReorderSubtopicOpen}
          onSubmit={handleReorderSubtopicSubmit}
        />
      )}

      {/* Subtopic Detail Modal */}
      {detailSubtopic && (
        <SubtopicDetailModal
          subtopic={detailSubtopic}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  );
}
