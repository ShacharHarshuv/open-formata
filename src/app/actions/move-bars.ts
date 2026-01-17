import { createAction } from "@/app/actions/action";
import { MoveLeftIcon } from "@/app/icons/move-left-icon";
import { MoveRightIcon } from "@/app/icons/move-right-icon";
import { mutateStore } from "@/app/store/mutate-store";
import { selectedRange } from "@/app/store/selected-range";
import { first, sortBy } from "lodash";
import React from "react";
import { useIsBarsSelected } from "./_use-is-bars-selected";

// todo: update this action to work with the contents of the bars

function moveBars(direction: -1 | 1) {
  return () => {
    const leavingSide = direction === -1 ? "start" : "end";
    const enteringSide = direction === -1 ? "end" : "start";

    mutateStore(({ selection, document }) => {
      const range = selectedRange(selection);

      if (!range) {
        return;
      }

      const currentSelection = {
        start: range[0],
        end: range[1],
      };

      const selectionSize = currentSelection.end - currentSelection.start + 1;

      const isCompletelyWithin = (section: {
        start: number;
        end: number;
      }) => {
        return (
          section.start >= currentSelection.start &&
          section.end <= currentSelection.end
        );
      };

      const leavingSections = sortBy(
        document.sections.filter((section) => {
          return (
            section[leavingSide] === currentSelection[leavingSide] &&
            !isCompletelyWithin(section)
          );
        }),
        (section) => section.end - section.start,
      );

      const firstLeavingSection = first(leavingSections);

      if (firstLeavingSection) {
        if (
          firstLeavingSection[enteringSide] === currentSelection[enteringSide]
        ) {
          document.sections = document.sections.filter((section) => {
            return section.id !== firstLeavingSection.id;
          });
          return;
        }

        firstLeavingSection[leavingSide] += selectionSize * direction * -1;
        return;
      }

      const enteringSections = sortBy(
        document.sections.filter((section) => {
          return (
            section[enteringSide] === currentSelection[leavingSide] + direction &&
            !isCompletelyWithin(section)
          );
        }),
        (section) => section.start - section.end,
      );

      const firstEnteringSection = first(enteringSections);
      if (firstEnteringSection) {
        firstEnteringSection[enteringSide] += selectionSize * direction * -1;
        return;
      }
    });
  };
}

export const moveBarsActions = [
  createAction({
    description: "Move Bars Back",
    hotkey: "alt+left",
    icon: React.createElement(MoveLeftIcon),
    perform: moveBars(-1),
    useIsAvailable: useIsBarsSelected,
  }),
  createAction({
    description: "Move Bars Forward",
    hotkey: "alt+right",
    icon: React.createElement(MoveRightIcon),
    perform: moveBars(+1),
    useIsAvailable: useIsBarsSelected,
  }),
];
