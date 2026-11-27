/**
 * aria-disabled instead of `disabled`: the control keeps focus while it is unavailable (a disabled
 * button drops focus onto <body>), stays discoverable, and its click handler ignores presses.
 */
export function setUnavailable(button: HTMLButtonElement, unavailable: boolean): void {
  if (unavailable) button.setAttribute('aria-disabled', 'true')
  else button.removeAttribute('aria-disabled')
}

export const isUnavailable = (button: HTMLButtonElement): boolean =>
  button.getAttribute('aria-disabled') === 'true'
