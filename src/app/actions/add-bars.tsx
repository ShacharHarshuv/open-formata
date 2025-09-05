import { createAction } from "@/app/actions/action";
import { mutateStore } from "@/app/store/mutate-store";
import { selectedRange } from "@/app/store/selected-range";
import { AddIcon } from "../icons/add-icon";

export const addBars = createAction({
  description: "Add Bars",
  hotkey: "b",
  perform: () => {
    const numberOfBars = Number(prompt("Number of bars:") ?? 0);
    if (isNaN(numberOfBars) || numberOfBars <= 0) {
      alert("Invalid number of bars");
      return;
    }

    const range = selectedRange();

    mutateStore(({ document }) => {
      document.length += numberOfBars;

      if (range) {
        const [, end] = range;
        const insertionPoint = end + 1;

        document.sections.forEach((section) => {
          if (section.start >= insertionPoint) {
            section.start += numberOfBars;
          }

          if (section.end >= insertionPoint) {
            section.end += numberOfBars;
          }
        });

        if (document.bars) {
          const newBars: Record<number, string> = {};

          Object.entries(document.bars).forEach(([barIndexStr, content]) => {
            const barIndex = parseInt(barIndexStr);

            if (barIndex >= insertionPoint) {
              // Shift bars after insertion point
              newBars[barIndex + numberOfBars] = content;
            } else {
              // Keep bars before insertion point unchanged
              newBars[barIndex] = content;
            }
          });

          document.bars = newBars;
        }
      }
    });
  },
  icon: <AddIcon />,
});
