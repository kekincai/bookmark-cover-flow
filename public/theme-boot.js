// Applies the saved theme before first paint. chrome.storage is asynchronous, so the app mirrors
// the choice into localStorage; this tiny classic script reads it synchronously. It is external
// because the extension CSP forbids inline scripts. Must stay in sync with applyAppearance().
try {
  const theme = localStorage.getItem('bookmark-cover-flow-theme') ?? 'light'
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
  // Storage unavailable: the CSS default (system) applies until the app loads.
}
