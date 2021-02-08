/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/* Formatting (etc.) triggered via the keyboard in various ways.

*/

import { Element, Node, Transforms } from "slate";
import { isElementOfType } from "../elements";
import { formatText } from "./format-text";
import { emptyParagraph } from "../padding";
import { indentListItem, unindentListItem } from "./indent";
import { toggleCheckbox } from "../elements/checkbox";
import { backspaceVoid, selectAll } from "./misc";
import { IS_MACOS } from "smc-webapp/feature";

export function keyFormat(editor, e): boolean {
  // console.log("onKeyDown", { keyCode: e.keyCode, key: e.key });

  if (formatText(editor, e)) {
    // control+b, etc. to format selected text.
    return true;
  }

  if (e.key == "Backspace" || e.key == "Delete") {
    // Special case -- deleting (certain?) void elements. See
    //   https://github.com/ianstormtaylor/slate/issues/3875
    // for discussion of why we must implement this ourselves.
    if (backspaceVoid(editor)) {
      return true;
    }
  }

  // Select all
  if (e.key == "a" && ((IS_MACOS && e.metaKey) || (!IS_MACOS && e.ctrlKey))) {
    // On Firefox with windowing enabled,
    // doing browser select all selects too much (e.g., the
    // react-windowed list), and this causes crashes.  Note that this
    // selectAll here only partly addresses the problem with windowing
    // and large documents where select all fails (due to missing DOM
    // nodes not in the window).  The select now happens but other
    // things break.
    selectAll(editor);
    return true;
  }

  if (e.key == " ") {
    const noModifiers = !(e.shiftKey || e.ctrlKey || e.metaKey || e.altKey);

    if (noModifiers && toggleCheckbox(editor)) {
      // we toggled a selected textbox. Done.
      return true;
    }

    // @ts-ignore - that second argument below is "unsanctioned"
    editor.insertText(" ", noModifiers);
    return true;
  }

  if (e.key == "Tab") {
    if (e.shiftKey) {
      if (unindentListItem(editor)) {
        return true;
      }
      // for now... but maybe remove it later
      editor.insertText("    ");
      return true;
    } else {
      if (indentListItem(editor)) {
        return true;
      }

      // Markdown doesn't have a notion of tabs in text, so
      // putting in four spaces for now, but is this optimal?
      editor.insertText("    ");
      return true;
    }
  }

  if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key == "Tab") {
      if (indentListItem(editor)) {
        return true;
      }

      // Markdown doesn't have a notion of tabs in text...
      // Putting in four spaces for now, but we'll probably change this...
      editor.insertText("    ");
      return true;
    }
    if (e.key == "Enter") {
      const fragment = editor.getFragment();
      const x = fragment?.[0];
      if (isElementOfType(x, "heading")) {
        Transforms.insertNodes(editor, [emptyParagraph()], {
          match: (node) => isElementOfType(node, "heading"),
        });
        return true;
      }
      if (isElementOfType(x, ["bullet_list", "ordered_list"])) {
        Transforms.insertNodes(
          editor,
          [{ type: "list_item", children: [{ text: "" }] } as Element],
          {
            match: (node) => isElementOfType(node, "list_item"),
          }
        );
        return true;
      }
    }
  }
  if (e.shiftKey && e.key == "Enter") {
    // In a table, the only option is to insert a <br/>.
    const fragment = editor.getFragment();
    if (isElementOfType(fragment?.[0], "table")) {
      const br = {
        isInline: true,
        isVoid: true,
        type: "html_inline",
        html: "<br />",
        children: [{ text: " " }],
      } as Node;
      Transforms.insertNodes(editor, [br]);
      // Also, move cursor forward so it is *after* the br.
      Transforms.move(editor, { distance: 1 });
      return true;
    }

    // Not in a table, so insert a hard break instead of a new
    // paragraph like enter creates.
    Transforms.insertNodes(editor, [
      {
        type: "hardbreak",
        isInline: true,
        isVoid: false,
        children: [{ text: "\n" }],
      } as Node,
    ]);
    return true;
  }
  return false;
}