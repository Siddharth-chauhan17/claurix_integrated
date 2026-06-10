export type SelectionBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

export type MenuPlacement = {
  left: number;
  top: number;
};

const MENU_WIDTH = 248;
const MENU_MAX_HEIGHT = 360;
const GAP = 12;

/** Place assign menu beside/below selection without covering mapped rows. */
export function computeAssignMenuPlacement(bounds: SelectionBounds): MenuPlacement {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = bounds.right + GAP;
  let top = bounds.top;

  if (left + MENU_WIDTH > vw - 16) {
    left = Math.max(16, bounds.left - MENU_WIDTH - GAP);
  }

  if (top + MENU_MAX_HEIGHT > vh - 16) {
    top = Math.max(16, bounds.bottom - MENU_MAX_HEIGHT);
  }

  left = Math.min(Math.max(16, left), vw - MENU_WIDTH - 16);
  top = Math.min(Math.max(16, top), vh - MENU_MAX_HEIGHT - 16);

  return { left, top };
}
