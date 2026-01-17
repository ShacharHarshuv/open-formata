import {
  MusicDiagramDocument,
  SectionAttributes,
} from "@/app/music-diagram-document/music-diagram-document";
import { max, sortBy, sumBy } from "lodash";
import { initialStoreValue } from "../store/store";

export interface Bar {
  type: "Bar";
  index: number;
  content: string;
}

export interface InlineSection {
  id: string;
  attributes: SectionAttributes;
  start: number;
  end: number;
}

export interface InlineNote {
  align: "right" | "left";
  text: string;
  position: number;
}

export interface MultiSystemSection {
  id: string;
  type: "MultiSystemSection";
  paddingLevel: number;
  attributes: SectionAttributes;
  segments: SystemSegment[];
}

export interface System {
  type: "System";
  bars: Bar[];
  sections: InlineSection[];
  // inlineNotes: InlineNote[];
}

export type SystemSegment = System | MultiSystemSection;

export interface Diagram {
  type: "Diagram";
  segments: SystemSegment[];
}

// internal type as a step in calculating what should be a system section and what should be an inline section
interface Section {
  id: string;
  index: number;
  type: "Section";
  attributes: SectionAttributes;
  elements: (Bar | Section)[];
}

function getSectionSize(section: Section | Bar) {
  if (section.type === "Bar") {
    return 1;
  }

  return sumBy(section.elements, getSectionSize);
}

function getElementNameForDebugging(element: Section | Bar) {
  if (element.type === "Bar") {
    return `Bar[${element.index}]`;
  } else {
    return `Section[${element.attributes.name}]`;
  }
}

function findElementFactory(
  isSectionTheOneWeAreLookingFor: (
    section: Section,
    barNumber: number,
  ) => boolean,
) {
  return function findElement(
    section: Section,
    barNumber: number,
  ): {
    parent: Section;
    index: number;
  } | null {
    const { elements } = section;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (
        (element.type === "Bar" && element.index === barNumber) ||
        (element.type === "Section" &&
          isSectionTheOneWeAreLookingFor(element, barNumber))
      ) {
        return {
          parent: section,
          index: i,
        };
      } else if (element.type === "Section") {
        const maybeElement = findElement(element, barNumber);
        if (maybeElement) return maybeElement;
      }
    }
    return null;
  };
}

function isBarFirstInSection(section: Section, barNumber: number) {
  const firstElement = section.elements[0];
  if (firstElement.type === "Bar") return firstElement.index === barNumber;
  return isBarFirstInSection(firstElement, barNumber);
}

function isBarLastInSection(section: Section, barNumber: number) {
  const lastElement = section.elements[section.elements.length - 1];
  if (lastElement.type === "Bar") return lastElement.index === barNumber;
  return isBarLastInSection(lastElement, barNumber);
}

const findStartElement = findElementFactory(isBarFirstInSection);
const findEndElement = findElementFactory(isBarLastInSection);

function createBarsWithSections(doc: MusicDiagramDocument) {
  let length = doc.length;
  doc.sections.forEach(({ end }) => {
    if (end > length) length = end;
  });

  const bars: Bar[] = Array.from({ length }, (_, i) => ({
    type: "Bar",
    index: i,
    content: doc.bars?.[i] || "",
  }));

  const rootSection: Section = {
    id: "root",
    index: -1,
    type: "Section",
    attributes: {
      name: "root", // for debugging only
    },
    elements: [...bars],
  };

  // building the sections from smallest to biggest avoids issues where it's hard to understand which is the common container of two bar indices
  for (const section of sortBy(
    doc.sections.map((section, index) => ({ ...section, index })),
    ({ start, end }) => end - start,
  )) {
    const start = findStartElement(rootSection, section.start);
    const end = findEndElement(rootSection, section.end);

    if (!start) {
      throw new Error(
        `Invalid start bar number ${section.start} for ${section.attributes.name ?? "Untitled Section"}`,
      );
    }
    if (!end) {
      throw new Error(
        `Invalid end bar number ${section.end} for ${section.attributes.name}`,
      );
    }

    if (!start) {
      throw new Error(`Couldn't find start of ${section.attributes.name}`);
    }

    if (!end) {
      throw new Error(`Couldn't find end of ${section.attributes.name}`);
    }

    if (start.parent !== end.parent) {
      throw new Error(
        `Start and end parent of ${section.attributes.name} are different! start.parent=${getElementNameForDebugging(start.parent)}, end.parent=${getElementNameForDebugging(end.parent)}`,
      );
    }

    const { parent } = start;

    const sectionElement: Section = {
      id: section.id,
      index: section.index,
      type: "Section",
      attributes: section.attributes,
      elements: parent.elements.slice(start.index, end.index + 1),
    };

    parent.elements.splice(
      start.index,
      end.index - start.index + 1,
      sectionElement,
    );
  }

  return rootSection.elements;
}

const maxBarsInSystem = 8; // todo: we might want to make this customizable eventually

function createEmptySystem(): System {
  return {
    type: "System",
    bars: [],
    sections: [],
  };
}

export function createMusicDiagramAst(
  doc: MusicDiagramDocument,
  displayPreferences = initialStoreValue.displayPreferences,
): Diagram {
  function createSegments(elements: (Section | Bar)[]) {
    let currentSystem = createEmptySystem();
    const segments: (MultiSystemSection | System)[] = [];

    function pushSystem() {
      currentSystem.sections = sortBy(
        currentSystem.sections,
        ({ start, end }) => start - end, // we want longer sections rendered first
      );

      const sectionThatCoversTheEntireSystem = currentSystem.sections.find(
        ({ start, end }) => start === 0 && end === currentSystem.bars.length,
      );

      if (
        sectionThatCoversTheEntireSystem &&
        sectionThatCoversTheEntireSystem.end -
          sectionThatCoversTheEntireSystem.start >
          4
      ) {
        currentSystem.sections = currentSystem.sections.filter(
          ({ id }) => id !== sectionThatCoversTheEntireSystem.id,
        );
        segments.push({
          id: sectionThatCoversTheEntireSystem.id,
          paddingLevel: 0,
          type: "MultiSystemSection",
          attributes: sectionThatCoversTheEntireSystem.attributes,
          segments: [currentSystem],
        });
      } else {
        segments.push(currentSystem);
      }

      currentSystem = createEmptySystem();
    }

    function processElement(element: Section | Bar) {
      if (element.type === "Bar") {
        const bar = element;
        currentSystem.bars.push(bar);

        if (currentSystem.bars.length >= maxBarsInSystem) {
          pushSystem();
        }
      } else if (element.type === "Section") {
        const section = element;

        const size = getSectionSize(section);
        if (size < maxBarsInSystem) {
          // inline section
          if (currentSystem.bars.length + size > maxBarsInSystem) {
            // can't fit the inline section in the current system
            pushSystem();
          }

          currentSystem.sections.push({
            ...section,
            start: currentSystem.bars.length,
            end: currentSystem.bars.length + size,
          });

          section.elements.forEach(processElement);
        } else {
          // multi system section
          if (currentSystem.bars.length) {
            pushSystem();
          }

          segments.push({
            id: section.id,
            paddingLevel: 0,
            type: "MultiSystemSection",
            attributes: section.attributes,
            segments: createSegments(section.elements),
          });
        }
      }
    }

    elements.forEach(processElement);

    if (currentSystem.bars.length) {
      pushSystem();
    }

    return segments;
  }

  function preProcessElements(elements: (Section | Bar)[]): (Section | Bar)[] {
    if (displayPreferences.notateToRealRatio === 1) {
      return elements;
    }

    return elements
      .map((element) => {
        if (element.type === "Section") {
          const processedElements = preProcessElements(element.elements);
          if (processedElements.length === 0) {
            return null;
          }
          return {
            ...element,
            elements: processedElements,
          };
        }

        if (element.index % displayPreferences.notateToRealRatio !== 0) {
          return null;
        }

        return element;
      })
      .filter((element) => element !== null);
  }

  const segments = createSegments(
    preProcessElements(createBarsWithSections(doc)),
  );

  // set MultiSystemSection paddingLevel
  function setPaddingLevels(segments: SystemSegment[]): number {
    return (
      max(
        segments.map((s) => {
          if (s.type === "System") {
            return 0;
          }

          const paddingLevel = setPaddingLevels(s.segments) + 1;

          s.paddingLevel = paddingLevel;

          return paddingLevel;
        }),
      ) ?? 0
    );
  }

  setPaddingLevels(segments);

  return {
    type: "Diagram",
    segments,
  };
}
