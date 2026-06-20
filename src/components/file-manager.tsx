"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Video,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Download,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  MoreVertical,
  Pencil,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFileStore, UploadProgress } from "@/stores/file-store";
import { FileViewer } from "@/components/file-viewer";
import { SubtopicFile, SubtopicFolder } from "@/types";
import api from "@/lib/api";

interface FileManagerProps {
  topicId: string;
  subtopicId: string;
  readOnly?: boolean;
}

function getFileIcon(type: string, className = "h-5 w-5") {
  if (type.startsWith("video/"))
    return <Video className={`${className} text-purple-500`} />;
  if (type.startsWith("image/"))
    return <ImageIcon className={`${className} text-blue-500`} />;
  if (type.includes("pdf"))
    return <FileText className={`${className} text-red-500`} />;
  return <FileIcon className={`${className} text-muted-foreground`} />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(type: string) {
  return type.startsWith("image/");
}

function useAuthBlobUrl(url: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    let revoked = false;
    api
      .get(url, { responseType: "blob" })
      .then((res) => {
        if (!revoked) {
          const objectUrl = URL.createObjectURL(res.data);
          setBlobUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null);
      });

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return blobUrl;
}

async function compressImage(file: File, maxSizeKB = 500): Promise<File> {
  if (file.size <= maxSizeKB * 1024) return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if very large
      const maxDim = 2048;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.8
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export function FileManager({ topicId, subtopicId, readOnly }: FileManagerProps) {
  const {
    folders,
    files,
    loading,
    error,
    breadcrumbs,
    uploads,
    currentFolderId,
    fetchContents,
    navigateToFolder,
    navigateToBreadcrumb,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFiles,
    renameFile,
    deleteFile,
    clearUploads,
    reset,
  } = useFileStore();

  const [dragOver, setDragOver] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{
    type: "file" | "folder";
    id: string;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerFile, setViewerFile] = useState<SubtopicFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reset();
    fetchContents(topicId, subtopicId, null);
  }, [topicId, subtopicId, reset, fetchContents]);

  // Clipboard paste handler
  useEffect(() => {
    if (readOnly) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleFiles(pastedFiles);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, topicId, subtopicId, currentFolderId]);

  const handleFiles = useCallback(
    async (rawFiles: File[]) => {
      // Compress images before upload
      const processed = await Promise.all(
        rawFiles.map((f) => (isImageType(f.type) ? compressImage(f) : f))
      );
      uploadFiles(topicId, subtopicId, processed);
    },
    [topicId, subtopicId, uploadFiles]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) handleFiles(droppedFiles);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) handleFiles(selected);
    e.target.value = "";
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(topicId, subtopicId, newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameTarget.name.trim()) return;
    if (renameTarget.type === "folder") {
      await renameFolder(topicId, subtopicId, renameTarget.id, renameTarget.name.trim());
    } else {
      await renameFile(topicId, subtopicId, renameTarget.id, renameTarget.name.trim());
    }
    setRenameTarget(null);
  };

  const handleDeleteFolder = async (folderId: string) => {
    setDeletingId(folderId);
    try {
      await deleteFolder(topicId, subtopicId, folderId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await deleteFile(topicId, subtopicId, fileId);
    } finally {
      setDeletingId(null);
    }
  };

  const getDownloadPath = (file: SubtopicFile) => {
    return `/topics/${topicId}/subtopics/${subtopicId}/files/${file.id}/download`;
  };

  if (loading && folders.length === 0 && files.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive gap-2">
        <AlertTriangle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  const activeUploads = uploads.filter((u) => u.status === "uploading");
  const finishedUploads = uploads.filter((u) => u.status !== "uploading");

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Breadcrumbs + Actions */}
      <div className="flex items-center justify-between gap-2">
        <nav className="flex items-center gap-1 text-sm min-w-0">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1 min-w-0">
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => navigateToBreadcrumb(topicId, subtopicId, idx)}
                className={`truncate hover:underline ${
                  idx === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        {!readOnly && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowNewFolder(true)}
              className="gap-1 text-xs"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              New Folder
            </Button>
            <Button
              size="xs"
              onClick={() => inputRef.current?.click()}
              className="gap-1 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={handleInputChange}
              className="hidden"
              accept="*/*"
            />
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-1.5 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {activeUploads.length > 0
                ? `Uploading ${activeUploads.length} file${activeUploads.length !== 1 ? "s" : ""}...`
                : "Uploads complete"}
            </span>
            {finishedUploads.length > 0 && activeUploads.length === 0 && (
              <Button variant="ghost" size="xs" onClick={clearUploads}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {uploads.map((u) => (
            <UploadItem key={u.fileId} upload={u} />
          ))}
        </div>
      )}

      {/* Drop zone (only when not read-only) */}
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Drop files here, click to upload, or <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono">Ctrl+V</kbd> to paste
          </p>
        </div>
      )}

      {/* Contents */}
      {folders.length === 0 && files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Folder className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">This folder is empty</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {/* Folders */}
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onOpen={() =>
                navigateToFolder(topicId, subtopicId, folder.id, folder.name)
              }
              onRename={() =>
                setRenameTarget({
                  type: "folder",
                  id: folder.id,
                  name: folder.name,
                })
              }
              onDelete={() => handleDeleteFolder(folder.id)}
              deleting={deletingId === folder.id}
              readOnly={readOnly}
            />
          ))}

          {/* Files */}
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              downloadPath={getDownloadPath(file)}
              onOpen={() => setViewerFile(file)}
              onRename={() =>
                setRenameTarget({
                  type: "file",
                  id: file.id,
                  name: file.original_name,
                })
              }
              onDelete={() => handleDeleteFile(file.id)}
              deleting={deletingId === file.id}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* New folder dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Rename {renameTarget?.type === "folder" ? "Folder" : "File"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameTarget?.name ?? ""}
            onChange={(e) =>
              setRenameTarget(
                renameTarget ? { ...renameTarget, name: e.target.value } : null
              )
            }
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameTarget?.name.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File viewer */}
      {viewerFile && (
        <FileViewer
          open={!!viewerFile}
          onOpenChange={(open) => !open && setViewerFile(null)}
          downloadPath={getDownloadPath(viewerFile)}
          fileName={viewerFile.original_name}
          contentType={viewerFile.content_type}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

function UploadItem({ upload }: { upload: UploadProgress }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs truncate flex-1 min-w-0">{upload.fileName}</span>
      {upload.status === "uploading" && (
        <div className="w-24">
          <Progress value={upload.progress} className="h-1.5" />
        </div>
      )}
      {upload.status === "done" && (
        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
          Done
        </span>
      )}
      {upload.status === "error" && (
        <span className="text-[10px] text-destructive font-medium">
          Failed
        </span>
      )}
    </div>
  );
}

function FolderRow({
  folder,
  onOpen,
  onRename,
  onDelete,
  deleting,
  readOnly,
}: {
  folder: SubtopicFolder;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  deleting: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 group hover:bg-accent/30 transition-colors">
      <button
        onClick={onOpen}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
        <span className="text-sm font-medium truncate">{folder.name}</span>
      </button>
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent"
          >
              <MoreVertical className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              disabled={deleting}
              className="text-destructive focus:text-destructive"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-2" />
              )}
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function FileRow({
  file,
  downloadPath,
  onOpen,
  onRename,
  onDelete,
  deleting,
  readOnly,
}: {
  file: SubtopicFile;
  downloadPath: string;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  deleting: boolean;
  readOnly?: boolean;
}) {
  const isImage = isImageType(file.content_type);
  const blobUrl = useAuthBlobUrl(isImage ? downloadPath : null);

  const handleDownload = async () => {
    try {
      const res = await api.get(downloadPath, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 group hover:bg-accent/30 transition-colors">
      {/* Thumbnail or icon — clickable to open viewer */}
      <button onClick={onOpen} className="shrink-0">
        {isImage && blobUrl ? (
          <div className="h-10 w-10 rounded border overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blobUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : isImage ? (
          <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          getFileIcon(file.content_type)
        )}
      </button>

      {/* File info — clickable to open viewer */}
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate">{file.original_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatSize(file.size)} &middot;{" "}
          {new Date(file.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDownload}
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent"
            >
                <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={deleting}
                className="text-destructive focus:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                )}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
