import { ExportIcon } from "@/app/icons/export-icon";
import { createMusicDiagramAst } from "@/app/music-diagram-ast/music-diagram-ast";
import { SystemSegment } from "@/app/music-diagram-ast/music-diagram-ast";
import { useStore } from "@/app/store/store";
import { max } from "lodash";
import React from "react";
import { createAction } from "./action";
import { elementToSVG } from "dom-to-svg";

function systemSectionsNestingDepth(segments: SystemSegment[]): number {
  const maxInnerDepth = max(
    segments.map((segment) =>
      segment.type === "MultiSystemSection"
        ? systemSectionsNestingDepth(segment.segments)
        : 0,
    ),
  );

  return maxInnerDepth ? maxInnerDepth + 1 : 1;
}

export const exportSvg = createAction({
  description: "Export as SVG",
  icon: React.createElement(ExportIcon),
  perform: async () => {
    const { title, document: diagramDocument, displayPreferences } = useStore.getState();
    const diagramTitle = title || "Untitled";
    
    const diagramContainer = document.querySelector('[data-diagram-container]') as HTMLElement;
    if (!diagramContainer) {
      console.error("Diagram container not found");
      return;
    }

    try {
      const diagramAst = createMusicDiagramAst(diagramDocument, displayPreferences);
      const nestingDepth = systemSectionsNestingDepth(diagramAst.segments);
      const nestingGap = Math.max(16, 16 + nestingDepth * 7);
      
      const svgDocument = elementToSVG(diagramContainer);
      const svgElement = svgDocument.documentElement;
      
      const currentViewBox = svgElement.getAttribute("viewBox");
      if (currentViewBox) {
        const [x, y, width, height] = currentViewBox.split(" ").map(Number);
        const padding = nestingGap;
        svgElement.setAttribute(
          "viewBox",
          `${x - padding} ${y - padding} ${width + padding * 2} ${height + padding * 2}`,
        );
      }
      
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${diagramTitle}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export SVG:", error);
    }
  },
});
