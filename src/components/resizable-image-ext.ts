import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./resizable-image";

export const ResizableImage = Image.extend({
  // Inline so multiple images can live in the same paragraph (side by side)
  inline: true,
  group: "inline",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 25,
        parseHTML: (el) => {
          const w = el.getAttribute("data-width");
          return w ? parseInt(w, 10) : 25;
        },
        renderHTML: (attrs) => ({ "data-width": attrs.width }),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
