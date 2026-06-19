import Youtube from "@tiptap/extension-youtube";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableYoutubeView } from "./resizable-youtube";

export const ResizableYoutube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-pct": {
        default: 60,
        parseHTML: (el) => {
          const pct = el.getAttribute("data-pct");
          return pct ? parseInt(pct, 10) : 60;
        },
        renderHTML: (attrs) => ({ "data-pct": attrs["data-pct"] }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableYoutubeView);
  },
});
