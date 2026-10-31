/** 1.5 px line icons in the spirit of SF Symbols. All are decorative; labels live on the controls. */
const svg = (viewBox: string, body: string, className = ''): string =>
  `<svg class="icon ${className}" viewBox="${viewBox}" aria-hidden="true">${body}</svg>`

export const icons = {
  search: svg('0 0 14 14', '<circle cx="6" cy="6" r="4.5"/><path d="M9.4 9.4l3.2 3.2"/>'),
  clear: svg('0 0 6 6', '<path d="M.5.5l5 5M5.5.5l-5 5"/>'),
  library: svg(
    '0 0 16 16',
    '<path d="M4.5 2h7a1 1 0 0 1 1 1v11l-4.5-2.8L3.5 14V3a1 1 0 0 1 1-1z"/>',
  ),
  recent: svg('0 0 16 16', '<circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.4"/>'),
  added: svg('0 0 16 16', '<circle cx="8" cy="8" r="6"/><path d="M8 5.2v5.6M5.2 8h5.6"/>'),
  folder: svg(
    '0 0 16 16',
    '<path d="M2 4.2a1 1 0 0 1 1-1h3.3l1.4 1.5H13a1 1 0 0 1 1 1v6.6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>',
  ),
  gear: svg(
    '0 0 17 17',
    '<circle cx="8.5" cy="8.5" r="2.4"/><path d="M8.5 1.5v2M8.5 13.5v2M1.5 8.5h2M13.5 8.5h2M3.55 3.55l1.4 1.4M12.05 12.05l1.4 1.4M3.55 13.45l1.4-1.4M12.05 4.95l1.4-1.4"/>',
  ),
  coverFlow: svg(
    '0 0 18 12',
    '<rect x="6" y="1" width="6" height="9" rx="1.2" class="icon-fill"/><path d="M1 2.6 4.4 1.6v8.8L1 9.4zM17 2.6l-3.4-1v8.8l3.4-1z" class="icon-fill icon-dim"/>',
  ),
  grid: svg(
    '0 0 13 13',
    '<rect x=".5" y=".5" width="5" height="5" rx="1.2" class="icon-fill"/><rect x="7.5" y=".5" width="5" height="5" rx="1.2" class="icon-fill"/><rect x=".5" y="7.5" width="5" height="5" rx="1.2" class="icon-fill"/><rect x="7.5" y="7.5" width="5" height="5" rx="1.2" class="icon-fill"/>',
  ),
  list: svg(
    '0 0 14 11',
    '<path d="M4 1.5h9.5M4 5.5h9.5M4 9.5h9.5"/><circle cx="1.2" cy="1.5" r="1" class="icon-fill"/><circle cx="1.2" cy="5.5" r="1" class="icon-fill"/><circle cx="1.2" cy="9.5" r="1" class="icon-fill"/>',
  ),
  expand: svg('0 0 16 16', '<path d="M10 2h4v4M14 2 9.5 6.5M6 14H2v-4M2 14l4.5-4.5"/>'),
  close: svg('0 0 12 12', '<path d="M1.5 1.5l9 9M10.5 1.5l-9 9"/>'),
  previous: svg('0 0 8 13', '<path d="M6.5 1.5 1.5 6.5l5 5"/>'),
  next: svg('0 0 8 13', '<path d="M1.5 1.5l5 5-5 5"/>'),
  open: svg('0 0 11 11', '<path d="M2.2 8.8l6.6-6.6M3.6 2.2h5.2v5.2"/>'),
  chevronDown: svg('0 0 9 9', '<path d="M1.5 3l3 3 3-3"/>'),
  plus: svg('0 0 18 18', '<path d="M9 3.5v11M3.5 9h11"/>'),
  check: svg('0 0 14 14', '<path d="M3 7.5l2.5 2.5L11 4.5"/>'),
  cross: svg('0 0 14 14', '<path d="M2 7h10M7 2v10"/>'),
  info: svg('0 0 14 14', '<path d="M7 3v5M7 10.8v.2"/>'),
  emptyFolder: svg(
    '0 0 48 48',
    '<rect x="13" y="9" width="22" height="28" rx="4"/><path d="M4 14l6-1.5v23L4 34zM44 14l-6-1.5v23l6-1.5z" class="icon-dim"/>',
  ),
  noResults: svg('0 0 42 42', '<circle cx="18" cy="18" r="12"/><path d="M27 27l11 11"/>'),
  warning: svg(
    '0 0 40 40',
    '<circle cx="20" cy="20" r="17" class="icon-warning-disc"/><path d="M20 11v11M20 28v.5" class="icon-warning-mark"/>',
  ),
}
