"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MistakeEditor } from "@/components/mistake-editor";
import { useMistakeStore } from "@/stores/mistake-store";
import api from "@/lib/api";
import { Subject, Topic, SubTopic } from "@/types";

interface LogMistakeDialogProps {
  goalId: string;
  onLogged?: () => void;
}

export function LogMistakeDialog({ goalId, onLogged }: LogMistakeDialogProps) {
  const [open, setOpen] = useState(false);
  const { createMistake } = useMistakeStore();

  // Cascading select state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<SubTopic[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>("");

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load subjects when dialog opens
  useEffect(() => {
    if (open && goalId) {
      setLoadingSubjects(true);
      api.get(`/goals/${goalId}/subjects`)
        .then((res) => setSubjects(res.data))
        .catch(() => {})
        .finally(() => setLoadingSubjects(false));
    }
  }, [open, goalId]);

  // Load topics when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      setLoadingTopics(true);
      setTopics([]);
      setSubtopics([]);
      setSelectedTopicId("");
      setSelectedSubtopicId("");
      api.get(`/subjects/${selectedSubjectId}/topics`)
        .then((res) => setTopics(res.data))
        .catch(() => {})
        .finally(() => setLoadingTopics(false));
    }
  }, [selectedSubjectId]);

  // Load subtopics when topic changes
  useEffect(() => {
    if (selectedTopicId) {
      setLoadingSubtopics(true);
      setSubtopics([]);
      setSelectedSubtopicId("");
      api.get(`/topics/${selectedTopicId}/subtopics`)
        .then((res) => setSubtopics(res.data))
        .catch(() => {})
        .finally(() => setLoadingSubtopics(false));
    }
  }, [selectedTopicId]);

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
    setTopics([]);
    setSubtopics([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5 text-xs" />}>
        <AlertTriangle className="h-3.5 w-3.5" />
        Log Mistake
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a Mistake</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Cascading selects */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Select value={selectedSubjectId} onValueChange={(v) => v && setSelectedSubjectId(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={loadingSubjects ? "Loading..." : "Select subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Topic</Label>
              <Select
                value={selectedTopicId}
                onValueChange={(v) => v && setSelectedTopicId(v)}
                disabled={!selectedSubjectId}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={loadingTopics ? "Loading..." : "Select topic"} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subtopic</Label>
              <Select
                value={selectedSubtopicId}
                onValueChange={(v) => v && setSelectedSubtopicId(v)}
                disabled={!selectedTopicId}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={loadingSubtopics ? "Loading..." : "Select subtopic"} />
                </SelectTrigger>
                <SelectContent>
                  {subtopics.map((st) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mistake editor — only show when subtopic selected */}
          {selectedSubtopicId ? (
            <MistakeEditor
              onSave={handleSave}
              onCancel={() => { setOpen(false); resetState(); }}
              saving={saving}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Select a subject, topic, and subtopic to log a mistake.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
