/** Max zoom for the RFQ mapping grid. */
export const GRID_ZOOM_MAX = 1.25;

/**
 * Smallest zoom so all columns fit without horizontal scroll.
 * Returns 1 when the sheet already fits at 100%.
 */
export function measureGridFitZoom(
  container: HTMLElement | null,
  currentZoom: number
): number {
  if (!container || currentZoom <= 0) return 1;

  const pinned = container.querySelector(
    ".ag-pinned-left-cols-container"
  ) as HTMLElement | null;
  const centerViewport = container.querySelector(
    ".ag-center-cols-viewport"
  ) as HTMLElement | null;

  if (!centerViewport) return 1;

  const pinnedWidth = pinned?.offsetWidth ?? 0;
  const centerWidth = centerViewport.scrollWidth;
  const totalAtCurrentZoom = pinnedWidth + centerWidth;
  const totalAtZoomOne = totalAtCurrentZoom / currentZoom;
  const availableWidth = container.clientWidth;

  if (totalAtZoomOne <= 0 || availableWidth <= 0) return 1;
  if (totalAtZoomOne <= availableWidth) return 1;

  const fit = availableWidth / totalAtZoomOne;
  return Math.min(1, Math.max(0.25, fit));
}

export function clampGridZoom(
  zoom: number,
  minZoom: number,
  maxZoom: number = GRID_ZOOM_MAX
): number {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}
