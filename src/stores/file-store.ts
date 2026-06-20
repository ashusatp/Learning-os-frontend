import { create } from "zustand";
import api from "@/lib/api";
import { SubtopicFile, SubtopicFolder, FolderContents } from "@/types";

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface FileStoreState {
  folders: SubtopicFolder[];
  files: SubtopicFile[];
  loading: boolean;
  error: string | null;
  currentFolderId: string | null;
  breadcrumbs: { id: string | null; name: string }[];
  uploads: UploadProgress[];

  fetchContents: (
    topicId: string,
    subtopicId: string,
    folderId: string | null
  ) => Promise<void>;
  navigateToFolder: (
    topicId: string,
    subtopicId: string,
    folderId: string | null,
    folderName?: string
  ) => Promise<void>;
  navigateToBreadcrumb: (
    topicId: string,
    subtopicId: string,
    index: number
  ) => Promise<void>;

  createFolder: (
    topicId: string,
    subtopicId: string,
    name: string
  ) => Promise<SubtopicFolder>;
  renameFolder: (
    topicId: string,
    subtopicId: string,
    folderId: string,
    name: string
  ) => Promise<void>;
  moveFolder: (
    topicId: string,
    subtopicId: string,
    folderId: string,
    parentId: string | null
  ) => Promise<void>;
  deleteFolder: (
    topicId: string,
    subtopicId: string,
    folderId: string
  ) => Promise<void>;

  uploadFiles: (
    topicId: string,
    subtopicId: string,
    files: File[]
  ) => Promise<void>;
  renameFile: (
    topicId: string,
    subtopicId: string,
    fileId: string,
    name: string
  ) => Promise<void>;
  moveFile: (
    topicId: string,
    subtopicId: string,
    fileId: string,
    folderId: string | null
  ) => Promise<void>;
  deleteFile: (
    topicId: string,
    subtopicId: string,
    fileId: string
  ) => Promise<void>;
  clearUploads: () => void;
  reset: () => void;
}

export const useFileStore = create<FileStoreState>((set, get) => ({
  folders: [],
  files: [],
  loading: false,
  error: null,
  currentFolderId: null,
  breadcrumbs: [{ id: null, name: "Files" }],
  uploads: [],

  fetchContents: async (topicId, subtopicId, folderId) => {
    set({ loading: true, error: null });
    try {
      const params = folderId ? { folder_id: folderId } : {};
      const res = await api.get<FolderContents>(
        `/topics/${topicId}/subtopics/${subtopicId}/folders/contents`,
        { params }
      );
      set({
        folders: res.data.folders,
        files: res.data.files,
        loading: false,
        currentFolderId: folderId,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch files";
      set({ error: message, loading: false });
    }
  },

  navigateToFolder: async (topicId, subtopicId, folderId, folderName) => {
    const { breadcrumbs } = get();
    if (folderId) {
      // Don't add if already the last breadcrumb
      const last = breadcrumbs[breadcrumbs.length - 1];
      if (last?.id !== folderId) {
        set({ breadcrumbs: [...breadcrumbs, { id: folderId, name: folderName || "Folder" }] });
      }
    } else {
      set({ breadcrumbs: [{ id: null, name: "Files" }] });
    }
    await get().fetchContents(topicId, subtopicId, folderId);
  },

  navigateToBreadcrumb: async (topicId, subtopicId, index) => {
    const { breadcrumbs } = get();
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    set({ breadcrumbs: newBreadcrumbs });
    await get().fetchContents(topicId, subtopicId, target.id);
  },

  createFolder: async (topicId, subtopicId, name) => {
    const { currentFolderId } = get();
    const res = await api.post(
      `/topics/${topicId}/subtopics/${subtopicId}/folders`,
      { name, parent_id: currentFolderId }
    );
    set((state) => ({ folders: [...state.folders, res.data] }));
    return res.data;
  },

  renameFolder: async (topicId, subtopicId, folderId, name) => {
    const res = await api.patch(
      `/topics/${topicId}/subtopics/${subtopicId}/folders/${folderId}/rename`,
      { name }
    );
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folderId ? res.data : f)),
    }));
  },

  moveFolder: async (topicId, subtopicId, folderId, parentId) => {
    await api.patch(
      `/topics/${topicId}/subtopics/${subtopicId}/folders/${folderId}/move`,
      { parent_id: parentId }
    );
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
    }));
  },

  deleteFolder: async (topicId, subtopicId, folderId) => {
    await api.delete(
      `/topics/${topicId}/subtopics/${subtopicId}/folders/${folderId}`
    );
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
    }));
  },

  uploadFiles: async (topicId, subtopicId, files) => {
    const { currentFolderId } = get();

    for (const file of files) {
      const tempId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      set((state) => ({
        uploads: [
          ...state.uploads,
          { fileId: tempId, fileName: file.name, progress: 0, status: "uploading" },
        ],
      }));

      try {
        const formData = new FormData();
        formData.append("file", file);

        const params: Record<string, string> = {};
        if (currentFolderId) params.folder_id = currentFolderId;

        const res = await api.post(
          `/topics/${topicId}/subtopics/${subtopicId}/files`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            params,
            onUploadProgress: (e) => {
              const progress = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
              set((state) => ({
                uploads: state.uploads.map((u) =>
                  u.fileId === tempId ? { ...u, progress } : u
                ),
              }));
            },
          }
        );

        set((state) => ({
          files: [...state.files, res.data],
          uploads: state.uploads.map((u) =>
            u.fileId === tempId ? { ...u, progress: 100, status: "done" } : u
          ),
        }));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.fileId === tempId
              ? { ...u, status: "error", error: message }
              : u
          ),
        }));
      }
    }
  },

  renameFile: async (topicId, subtopicId, fileId, name) => {
    const res = await api.patch(
      `/topics/${topicId}/subtopics/${subtopicId}/files/${fileId}/rename`,
      { original_name: name }
    );
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? res.data : f)),
    }));
  },

  moveFile: async (topicId, subtopicId, fileId, folderId) => {
    await api.patch(
      `/topics/${topicId}/subtopics/${subtopicId}/files/${fileId}/move`,
      { folder_id: folderId }
    );
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    }));
  },

  deleteFile: async (topicId, subtopicId, fileId) => {
    await api.delete(
      `/topics/${topicId}/subtopics/${subtopicId}/files/${fileId}`
    );
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    }));
  },

  clearUploads: () => set({ uploads: [] }),

  reset: () =>
    set({
      folders: [],
      files: [],
      loading: false,
      error: null,
      currentFolderId: null,
      breadcrumbs: [{ id: null, name: "Files" }],
      uploads: [],
    }),
}));
