# Rubisco Design System — Phase 4

Phase 4 turns the editable document engine into the first print-ready Rubisco notes system.

## Visual rules
- White paper page for notes.
- Red (`#B4232C`) is the primary Rubisco accent.
- Major headings use a red bordered box and red typography.
- Subheadings remain hierarchical without unnecessary numbering.
- Body copy stays predominantly black/dark charcoal.
- Tables use a restrained red header treatment.
- Mnemonics and exam boxes are visually distinct but remain printable.
- Tablet and desktop use two columns with a vertical divider.
- Phone editing remains single-column for readability.

## Export
The editor exposes **Print / PDF**. It uses the browser's native print pipeline so the user can choose **Save as PDF** without adding a heavyweight PDF dependency to the frontend. Print CSS removes editor chrome, fixes A4 page geometry, preserves the two-column layout, keeps blocks together where possible, and preserves the Rubisco red hierarchy.

## Architecture rule
The document remains structured and editable. Printing is a rendering/export concern; it never replaces the underlying `StudyDocument` data.
