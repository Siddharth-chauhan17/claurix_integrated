export type AutoScrollOptions = {
  edgePx?: number;
  maxSpeed?: number;
};

/**
 * Smooth edge autoscroll for drag sessions inside scrollable grid viewports.
 */
export function applyEdgeAutoScroll(
  viewport: HTMLElement,
  clientY: number,
  options: AutoScrollOptions = {}
): void {
  const edge = options.edgePx ?? 56;
  const maxSpeed = options.maxSpeed ?? 14;
  const rect = viewport.getBoundingClientRect();

  if (clientY < rect.top + edge) {
    const intensity = 1 - Math.max(0, clientY - rect.top) / edge;
    viewport.scrollTop -= Math.ceil(maxSpeed * intensity);
  } else if (clientY > rect.bottom - edge) {
    const intensity = 1 - Math.max(0, rect.bottom - clientY) / edge;
    viewport.scrollTop += Math.ceil(maxSpeed * intensity);
  }
}
