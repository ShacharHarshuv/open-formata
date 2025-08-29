import { isNil } from "lodash";
import { Ref, useMemo, useRef } from "react";
import { useStore } from "../store/store";
import { Note, NoteProps } from "./Note";
import { NotesAnchors } from "./notes-anchors";
import { useBottom } from "./positioning/bottom";
import { getTop } from "./positioning/top";

export function NotesSection({
  mainContentRef,
}: {
  mainContentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const sections = useStore((state) => state.document.sections);

  const ref = useRef<HTMLElement>(null);
  // const top = useTop(ref, mainContentRef);
  const bottom = useBottom(ref, mainContentRef);
  const anchors = NotesAnchors.useAnchors();

  const notesPreprocess = useMemo(() => {
    if (!mainContentRef.current) {
      return [];
    }

    return sections
      .map((s) => {
        if (isNil(s.attributes.notes)) {
          return null;
        }
        const anchor = anchors[s.id];
        if (!anchor) {
          return null;
        }
        return {
          id: s.id,
          content: s.attributes.notes,
          anchor,
          section: s,
          top: getTop(anchor, mainContentRef.current!),
        };
      })
      .filter((n) => n !== null)
      .sort((a, b) => a.top - b.top);
  }, [sections, anchors, mainContentRef]);

  console.log("notesPreprocess", notesPreprocess);

  const notes = useMemo(() => {
    return notesPreprocess.map((note, index): NoteProps => {
      const nextNote = notesPreprocess[index + 1];
      console.log(note.top, nextNote?.top);

      return {
        ...note,
        bottom: nextNote ? nextNote.top : bottom,
      };
    });
  }, [notesPreprocess, bottom]);

  console.log("notes", notes);

  return (
    <div className="relative h-full" ref={ref as Ref<HTMLDivElement>}>
      {notes.map((note) => (
        <Note {...note} key={note.id} />
      ))}
    </div>
  );
}
