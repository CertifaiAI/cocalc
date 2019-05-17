export type NotebookMode = "edit" | "escape";

export type CellType = "raw" | "markdown" | "code" ;

export type Scroll =
  | number
  | "cell visible"
  | "cell top"
  | "cell bottom"
  | "cell center"
  | "cell up"
  | "cell down"
  | "list up"
  | "list down";

