import { createAction } from "@/app/actions/action";
import { CopyIcon } from "@/app/icons/copy-icon";
import { PasteIcon } from "@/app/icons/paste-icon";
import { current } from "@/app/store/current";
import { mutateStore } from "@/app/store/mutate-store";
import { selectedRange } from "@/app/store/selected-range";
import React from "react";
import { useIsBarsSelected } from "./_use-is-bars-selected";

function isWritableFocus() {
  const el = document.activeElement;
  return (
    ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      !el.readOnly &&
      !el.disabled) ||
    (el instanceof HTMLElement && el?.isContentEditable === true)
  );
}

export const copyBars = createAction({
  description: "Copy Bars",
  hotkey: "ctrl+c",
  icon: React.createElement(CopyIcon),
  useIsAvailable: useIsBarsSelected,
  perform: async () => {
    // Don't interfere with normal copy operations in text fields
    if (isWritableFocus()) {
      return;
    }

    const range = selectedRange();
    if (!range) {
      return;
    }

    const [start, end] = range;
    const { document } = current();

    // Get content for each bar in the selected range
    const barContents: string[] = [];
    for (let i = start; i <= end; i++) {
      const content = document.bars?.[i] || "";
      barContents.push(content);
    }

    // Join with tabs for easy pasting into spreadsheets or other applications
    const textToCopy = barContents.join("\t");

    await navigator.clipboard.writeText(textToCopy);
  },
});

export const pasteBars = createAction({
  description: "Paste Bars",
  hotkey: "ctrl+v",
  icon: React.createElement(PasteIcon),
  useIsAvailable: useIsBarsSelected,
  perform: async () => {
    // Don't interfere with normal paste operations in text fields
    if (isWritableFocus()) {
      return;
    }

    const range = selectedRange();
    if (!range) {
      return;
    }

    let clipboardText: string;
    try {
      clipboardText = await navigator.clipboard.readText();
    } catch {
      // Fallback for older browsers or when clipboard API is not available
      return;
    }

    if (!clipboardText) {
      return;
    }

    // Split by tabs to get individual bar contents
    const barContents = clipboardText.split("\t");

    // Use the first selected bar as the starting point
    const [start] = range;

    // Apply the paste operation (this will be undoable via the mutateStore mechanism)
    mutateStore(({ document }) => {
      if (!document.bars) {
        document.bars = {};
      }

      // Paste each bar content starting from the first selected bar
      barContents.forEach((content, index) => {
        const barIndex = start + index;

        // Only paste if the bar index is within the document length
        if (barIndex < document.length) {
          if (content.trim()) {
            document.bars![barIndex] = content.trim();
          } else {
            // If content is empty, remove the bar content
            delete document.bars![barIndex];
          }
        }
      });
    });
  },
});
