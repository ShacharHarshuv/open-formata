import { Bar as BarProps } from "@/app/music-diagram-ast/music-diagram-ast";
import { mutateStore } from "@/app/store/mutate-store";
import { selectedRange } from "@/app/store/selected-range";
import { useStore } from "@/app/store/store";
import clsx from "clsx";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

export default function Bar(props: BarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.content || "");

  const isSelected = useStore(() => {
    const range = selectedRange();
    if (!range) {
      return false;
    }
    const [min, max] = range;
    return props.index >= min && props.index <= max;
  });

  const isOneSelected = useStore(() => {
    const range = selectedRange();
    if (!range) {
      return false;
    }
    const [min, max] = range;
    return min === max && min === props.index;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Enter" &&
        isOneSelected &&
        !isEditing &&
        !isWritableFocus()
      ) {
        event.preventDefault();
        setIsEditing(true);
        setEditValue(props.content || "");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOneSelected, isEditing, props.content]);

  return (
    <motion.span
      layout
      transition={{
        type: "spring",
        visualDuration: 0.1,
        bounce: 0.2,
      }}
      className={clsx(
        "inline-block h-8 cursor-pointer border-r border-gray-300 px-2 select-none relative",
        isSelected
          ? "bg-gray-200 hover:bg-gray-300"
          : "bg-gray-50 hover:bg-gray-100",
      )}
      onMouseDown={(event) => {
        if (event.shiftKey) {
          setEnd(props.index);
        } else {
          setStart(props.index);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(props.content || "");
      }}
    >
      <span className="absolute top-0 left-0 w-0 h-0 text-[10px] text-gray-300 px-1">
        {props.index + 1}
      </span>
      {/* Dummy input to handle TAB navigation */}
      {!isEditing && (
        <input
          type="text"
          className="opacity-0 pointer-events-none absolute"
          onFocus={() => {
            setIsEditing(true);
          }}
        />
      )}
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            if (editValue !== props.content) {
              mutateStore(({ document }) => {
                if (!document.bars) {
                  document.bars = {};
                }
                if (editValue.trim()) {
                  document.bars[props.index] = editValue.trim();
                } else {
                  delete document.bars[props.index];
                }
              });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setIsEditing(false);
              if (editValue !== props.content) {
                mutateStore(({ document }) => {
                  if (!document.bars) {
                    document.bars = {};
                  }
                  if (editValue.trim()) {
                    document.bars[props.index] = editValue.trim();
                  } else {
                    delete document.bars[props.index];
                  }
                });
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditValue(props.content || "");
              setIsEditing(false);
            }
          }}
          className="w-full h-full text-xs bg-white border border-blue-500 focus:outline-none font-serif"
          autoFocus
        />
      ) : (
        <span className="w-full h-full flex items-center justify-between text-xs text-gray-600 font-serif transform">
          {props.content &&
            props.content.split(" ").map((part, index) => (
              <span key={index} className="flex-1 text-left">
                {part}
              </span>
            ))}
        </span>
      )}
    </motion.span>
  );
}

function setStart(start: number) {
  mutateStore(({ selection }) => {
    selection.section = null;
    selection.start = start;
    selection.end = start;
  });
}

function setEnd(end: number) {
  mutateStore(({ selection }) => {
    selection.section = null;
    selection.end = end;

    if (selection.start === null) {
      selection.start = end;
    }
  });
}

function isWritableFocus() {
  const el = document.activeElement;
  return (
    ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      !el.readOnly &&
      !el.disabled) ||
    (el instanceof HTMLElement && el?.isContentEditable === true)
  );
}
