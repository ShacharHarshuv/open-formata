"use client";

import { addBars } from "@/app/actions/add-bars";
import { copyBars, pasteBars } from "@/app/actions/copy-paste-bars";
import { createSection } from "@/app/actions/create-section";
import { deleteSelected } from "@/app/actions/delete";
import { newFile } from "@/app/actions/new";
import { open } from "@/app/actions/open";
import { redo } from "@/app/actions/redo";
import { save } from "@/app/actions/save";
import { undo } from "@/app/actions/undo";
import { addNotes } from "@/app/notes/add-note";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Action } from "../actions/action";
import { current } from "../store/current";
import { ToolButton } from "./tool-button";

export function Toolbar() {
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current().document.length) {
      addButton.current?.focus();
    }
  }, []);

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // the hook for hiding/showing buttons must be in this level so layout animations work
  function tool(
    action: Action,
    ref?: React.RefObject<HTMLButtonElement | null>,
  ) {
    const isAvailable = action.useIsAvailable ? action.useIsAvailable() : true;
    return (
      <AnimatePresence mode="popLayout">
        {isAvailable && (
          <motion.span
            layout
            initial={
              hasMounted ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }
            }
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
              layout: {
                duration: 0.1,
              },
            }}
          >
            <ToolButton action={action} ref={ref} />
          </motion.span>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 py-1">
          {tool(newFile)}
          {tool(open)}
          {tool(save)}
          <div className="w-px h-6 bg-gray-300 mx-2" />
          {tool(undo)}
          {tool(redo)}
          {tool(copyBars)}
          {tool(pasteBars)}
          <div className="w-px h-6 bg-gray-300 mx-2" />
          {tool(addBars, addButton)}
          {tool(deleteSelected)}
          {tool(createSection)}
          {/* {moveBarsActions.map((action) => (
            <ToolButton key={action.description} action={action} />
          ))} */}
          {tool(addNotes)}
        </div>
      </div>
    </div>
  );
}
