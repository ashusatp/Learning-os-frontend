"use client";

import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Highlight from "@tiptap/extension-highlight";
import { ResizableImage } from "@/components/resizable-image-ext";
import FileHandler from "@tiptap/extension-file-handler";
import type { Editor } from "@tiptap/react";

export interface MiniEditorRef {
  getHTML: () => string;
  getEditor: () => Editor | null;
}

interface MiniEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  className?: string;
}

export const MiniEditor = forwardRef<MiniEditorRef, MiniEditorProps>(
  function MiniEditor({ content = "", onChange, placeholder = "", onFocus, className }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Placeholder.configure({ placeholder }),
        Underline,
        TextStyle,
        Color,
        Subscript,
        Superscript,
        Highlight.configure({ multicolor: true }),
        ResizableImage.configure({ inline: true }),
        FileHandler.configure({
          allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
          onPaste: (currentEditor, files) => {
            files.forEach((file) => {
              const reader = new FileReader();
              reader.onload = () => {
                currentEditor
                  .chain()
                  .insertContentAt(currentEditor.state.selection.anchor, {
                    type: "image",
                    attrs: { src: reader.result, width: 25 },
                  })
                  .focus()
                  .run();
              };
              reader.readAsDataURL(file);
            });
          },
        }),
      ],
      content,
      immediatelyRender: true,
      onUpdate: ({ editor: e }) => {
        onChange?.(e.getHTML());
      },
      onFocus: () => {
        onFocus?.();
      },
      editorProps: {
        attributes: {
          class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 ${className || ""}`,
        },
      },
    });

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      getEditor: () => editor,
    }));

    // Cleanup
    useEffect(() => {
      return () => {
        editor?.destroy();
      };
    }, [editor]);

    if (!editor) return null;

    return <EditorContent editor={editor} />;
  },
);
