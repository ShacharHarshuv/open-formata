"use client";

import { useActions } from "@/app/actions/actions";
import { addBars } from "@/app/actions/add-bars";
import { GitHubButton } from "@/app/components/github-button";
import { ShareButton } from "@/app/components/share-button";
import SystemSegments from "@/app/components/system-segments";
import { Toolbar } from "@/app/components/toolbar";
import {
  createMusicDiagramAst,
  Diagram,
  SystemSegment,
} from "@/app/music-diagram-ast/music-diagram-ast";
import { mutateStore } from "@/app/store/mutate-store";
import { useStore } from "@/app/store/store";
import { max } from "lodash";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createSection } from "./actions/create-section";
import { initializeURLMonitoring, loadDocumentFromURL } from "./actions/share";
import { NotesSection } from "./notes/notes-section";

export function App() {
  const diagramDocument = useStore((state) => state.document);
  const displayPreferences = useStore((state) => state.displayPreferences);
  const title = useStore(({ title }) => title);
  const [isLoading, setIsLoading] = useState(true);

  const diagramAst = useMemo(() => {
    return createMusicDiagramAst(diagramDocument, displayPreferences);
  }, [diagramDocument, displayPreferences]);

  const nestingDepth = useMemo(() => {
    return systemSectionsNestingDepth(diagramAst.segments);
  }, [diagramAst.segments]);

  const actions = useActions();

  useEffect(() => {
    const unsubscribePromise = loadDocumentFromURL().then(() => {
      setIsLoading(false);
      return initializeURLMonitoring();
    });
    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    actions.forEach((action) => action.register());

    return () => {
      actions.forEach((action) => action.unregister());
    };
  }, [actions]); // in practice actions never changes, but this is necessary for debugging

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).mutateStore = mutateStore;
  }, []);

  const mainContentRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Top Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold min-w-0">
              <input
                className="focus:ring-0 focus:outline-hidden flex-shrink-0"
                type="text"
                value={title}
                placeholder="Untitled"
                onInput={(e) => {
                  mutateStore((store) => {
                    store.title = e.currentTarget.value;
                  });
                }}
              />
            </h1>
            <div className="flex gap-2">
              <ShareButton />
              <GitHubButton />
            </div>
          </div>
        </div>
        <Toolbar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading ...</p>
            </div>
          </div>
        ) : (
          <div
            ref={mainContentRef}
            className="mx-auto mt-5 max-w-7xl max-sm:pr-[var(--nesting-gap)] max-[1380px]:pl-[var(--nesting-gap)] pr-6"
            style={
              {
                "--nesting-gap": `${Math.max(16, 16 + nestingDepth * 7)}px`,
              } as React.CSSProperties
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] md:grid-cols-[1fr_300px] sm:grid-cols-[1fr_150px] gap-[var(--nesting-gap)]">
              <DiagramBody diagram={diagramAst} />
              <div className="max-sm:hidden">
                <NotesSection mainContentRef={mainContentRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagramBody({ diagram }: { diagram: Diagram }) {
  return (
    <>
      <div className="col-span-2 empty:hidden">
        <GettingStartedHints />
      </div>
      {diagram.segments.length ? (
        <div className="grid grid-cols-8 gap-y-3">
          <SystemSegments segments={diagram.segments} />
        </div>
      ) : null}
    </>
  );
}

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

function GettingStartedHints() {
  const document = useStore((state) => state.document);
  const selection = useStore((state) => state.selection);

  if (!document.length) {
    return (
      <p>
        <AnimatedText>
          The diagram is empty! Click {addBars.icon} to add bars.
        </AnimatedText>
      </p>
    );
  }
  if (!document.sections.length) {
    if (
      !selection.start ||
      (selection.end && selection.end - selection.start < 1)
    )
      return (
        <div>
          <p>
            <AnimatedText>
              Click on some bars to select them, hold down Shift to select
              multiple bars.
            </AnimatedText>
          </p>
        </div>
      );

    return (
      <div>
        <p>
          <AnimatedText>
            Click on {createSection.icon} to add a section.
          </AnimatedText>
        </p>
      </div>
    );
  }

  if (document.sections.every((section) => !section.attributes.name)) {
    return (
      <div>
        <p>
          <AnimatedText>Click above the section to name it.</AnimatedText>
        </p>
      </div>
    );
  }

  return null;
}

function AnimatedText({ children }: { children: ReactNode }) {
  const splitNode = (node: ReactNode, startIndex: number): ReactNode[] => {
    if (typeof node === "string") {
      return node.split("");
    }

    if (Array.isArray(node)) {
      return node.flatMap((child) => splitNode(child, startIndex));
    }

    return [node];
  };

  const elements = splitNode(children, 0);
  const contentKey = elements.join("");

  return (
    <AnimatePresence mode="sync">
      <motion.span key={contentKey} exit={{ opacity: 0 }} className="absolute">
        {elements.map((element, index) => (
          <motion.span
            key={`${contentKey}-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.015, duration: 0 }}
          >
            {element}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}
