// Centralized page dimension constants for resume rendering and PDF export
// US Letter size: 8.5 x 11 inches at 96 DPI

export const PAGE_WIDTH = 816;   // 8.5 inches at 96 DPI
export const PAGE_HEIGHT = 1056; // 11 inches at 96 DPI
export const CONTENT_HEIGHT = PAGE_HEIGHT - 64; // Account for top/bottom padding (32px each)
export const TOP_MARGIN = 32; // Match p-8 (2rem = 32px) from template padding
