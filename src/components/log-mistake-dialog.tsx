"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Layers,
  FileText,
  LinkIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MistakeEditor } from "@/components/mistake-editor";
import { useMistakeStore } from "@/stores/mistake-store";
import api from "@/lib/api";
import { Subject, Topic, SubTopic, Question } from "@/types";

interface LogMistakeDialogProps {
  goalId: string;
  onLogged?: () => void;
}

function StepIndicator({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
          done
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "\u2713" : step}
      </span>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

export function LogMistakeDialog({ goalId, onLogged }: LogMistakeDialogProps) {
  const [open, setOpen] = useState(false);
  const { createMistake } = useMistakeStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<SubTopic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && goalId) {
      setLoadingSubjects(true);
      api.get(`/goals/${goalId}/subjects`)
        .then((res) => setSubjects(res.data))
        .catch(() => {})
        .finally(() => setLoadingSubjects(false));
    }
  }, [open, goalId]);

  useEffect(() => {
    if (selectedSubjectId) {
      setLoadingTopics(true);
      setTopics([]);
      setSubtopics([]);
      setQuestions([]);
      setSelectedTopicId("");
      setSelectedSubtopicId("");
      setSelectedQuestionId("");
      api.get(`/subjects/${selectedSubjectId}/topics`)
        .then((res) => setTopics(res.data))
        .catch(() => {})
        .finally(() => setLoadingTopics(false));
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedTopicId) {
      setLoadingSubtopics(true);
      setSubtopics([]);
      setQuestions([]);
      setSelectedSubtopicId("");
      setSelectedQuestionId("");
      api.get(`/topics/${selectedTopicId}/subtopics`)
        .then((res) => setSubtopics(res.data))
        .catch(() => {})
        .finally(() => setLoadingSubtopics(false));
    }
  }, [selectedTopicId]);

  useEffect(() => {
    if (selectedSubtopicId) {
      setLoadingQuestions(true);
      setQuestions([]);
      setSelectedQuestionId("");
      api.get(`/subtopics/${selectedSubtopicId}/questions`)
        .then((res) => setQuestions(res.data))
        .catch(() => {})
        .finally(() => setLoadingQuestions(false));
    }
  }, [selectedSubtopicId]);

  const handleSave = async (data: Parameters<typeof createMistake>[1]) => {
    if (!selectedSubtopicId) return;
    setSaving(true);
    try {
      await createMistake(selectedSubtopicId, data);
      setOpen(false);
      resetState();
      onLogged?.();
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setSelectedSubjectId("");
    setSelectedTopicId("");
    setSelectedSubtopicId("");
    setSelectedQuestionId("");
    setTopics([]);
    setSubtopics([]);
    setQuestions([]);
  };

  const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.name;
  const selectedTopicName = topics.find((t) => t.id === selectedTopicId)?.name;
  const selectedSubtopicName = subtopics.find((st) => st.id === selectedSubtopicId)?.name;
  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  // Current step for indicator
  const currentStep = !selectedSubjectId ? 1 : !selectedTopicId ? 2 : !selectedSubtopicId ? 3 : 4;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger render={<Button variant="destructive" size="sm" className="gap-1.5 text-xs" />}>
        <AlertTriangle className="h-3.5 w-3.5" />
        Log Mistake
      </DialogTrigger>
      <DialogContent className="!fixed !inset-4 !top-4 !left-4 !translate-x-0 !translate-y-0 !w-auto !max-w-none sm:!max-w-none flex flex-col overflow-hidden !p-0 !gap-0">
        {/* Header with red accent */}
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 dark:from-red-950/30 dark:via-orange-950/20 dark:to-amber-950/10 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Log a Mistake</h2>
                <p className="text-xs text-muted-foreground">Record and learn from your mistakes</p>
              </div>
            </div>
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              <StepIndicator step={1} current={currentStep} label="Subject" />
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <StepIndicator step={2} current={currentStep} label="Topic" />
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <StepIndicator step={3} current={currentStep} label="Subtopic" />
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <StepIndicator step={4} current={currentStep} label="Details" />
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          {/* Location selectors */}
          <div className="border-b bg-muted/30 px-6 py-3">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Subject
                </Label>
                <Select value={selectedSubjectId} onValueChange={(v) => v && setSelectedSubjectId(v)}>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <span className="flex-1 text-left truncate">
                      {selectedSubjectName || (loadingSubjects ? "Loading..." : "Select subject")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3 w-3" /> Topic
                </Label>
                <Select
                  value={selectedTopicId}
                  onValueChange={(v) => v && setSelectedTopicId(v)}
                  disabled={!selectedSubjectId}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <span className="flex-1 text-left truncate">
                      {selectedTopicName || (loadingTopics ? "Loading..." : "Select topic")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Subtopic
                </Label>
                <Select
                  value={selectedSubtopicId}
                  onValueChange={(v) => v && setSelectedSubtopicId(v)}
                  disabled={!selectedTopicId}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <span className="flex-1 text-left truncate">
                      {selectedSubtopicName || (loadingSubtopics ? "Loading..." : "Select subtopic")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {subtopics.map((st) => (
                      <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" /> Question
                  <span className="text-muted-foreground/50 normal-case tracking-normal">(optional)</span>
                </Label>
                <Select
                  value={selectedQuestionId}
                  onValueChange={(v) => v && setSelectedQuestionId(v)}
                  disabled={!selectedSubtopicId || questions.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <span className="flex-1 text-left truncate">
                      {selectedQuestion
                        ? `Q${selectedQuestion.order + 1}: ${selectedQuestion.text_html.replace(/<[^>]*>/g, "").slice(0, 40)}`
                        : loadingQuestions
                          ? "Loading..."
                          : questions.length === 0 && selectedSubtopicId
                            ? "No questions"
                            : "Select question"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {questions.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        Q{q.order + 1}: {q.text_html.replace(/<[^>]*>/g, "").slice(0, 50)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Breadcrumb of selection */}
            {selectedSubjectId && (
              <div className="flex items-center gap-1 mt-2.5 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{selectedSubjectName}</span>
                {selectedTopicName && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">{selectedTopicName}</span>
                  </>
                )}
                {selectedSubtopicName && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">{selectedSubtopicName}</span>
                  </>
                )}
                {selectedQuestion && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-primary">Q{selectedQuestion.order + 1}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Editor area */}
          {selectedSubtopicId ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <MistakeEditor
                questionId={selectedQuestionId || null}
                onSave={handleSave}
                onCancel={() => { setOpen(false); resetState(); }}
                saving={saving}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                {loadingSubjects || loadingTopics || loadingSubtopics ? (
                  <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {!selectedSubjectId
                    ? "Select a subject to get started"
                    : !selectedTopicId
                      ? "Now pick a topic"
                      : "Almost there — select a subtopic"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Navigate to the exact location where the mistake occurred
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
