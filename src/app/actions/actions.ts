import { addBars } from "@/app/actions/add-bars";
import { copyBars, pasteBars } from "@/app/actions/copy-paste-bars";
import { createSection } from "@/app/actions/create-section";
import { deleteSelected } from "@/app/actions/delete";
import { deselectEverything } from "@/app/actions/deselect";
import { expandSelectionActions } from "@/app/actions/expand-selection";
import { moveBarsActions } from "@/app/actions/move-bars";
import { navigationActions } from "@/app/actions/navigations";
import { newFile } from "@/app/actions/new";
import { open } from "@/app/actions/open";
import { redo } from "@/app/actions/redo";
import { save } from "@/app/actions/save";
import { undo } from "@/app/actions/undo";
import { addNotes } from "../notes/add-note";
import { share } from "./share";

export const useActions = () => [
  createSection,
  deleteSelected,
  addBars,
  copyBars,
  pasteBars,
  undo,
  redo,
  save,
  open,
  newFile,
  deselectEverything,
  ...navigationActions,
  ...expandSelectionActions,
  ...moveBarsActions,
  addNotes,
  share,
];
