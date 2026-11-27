/**
 * Static markup for Trusted Types.
 *
 * The extension CSP sets `require-trusted-types-for 'script'`, so HTML strings can only reach the
 * DOM through the `static-markup` policy below. That policy is not a pass-through: it accepts only
 * sources assembled by the `html` tag from source-code template literals, and every interpolation
 * must itself be `Markup`. Text from bookmarks or websites can never become markup — it goes
 * through `textContent` like everywhere else.
 */

interface TrustedTypePolicyLike {
  createHTML(input: string): unknown
}
interface TrustedTypesLike {
  createPolicy(name: string, rules: { createHTML(input: string): string }): TrustedTypePolicyLike
}

class StaticMarkup {
  constructor(readonly source: string) {}
}
export type Markup = StaticMarkup

const approved = new Set<string>()

export function html(strings: TemplateStringsArray, ...values: readonly Markup[]): Markup {
  // Template objects from tagged literals are frozen and carry `raw`; a forged array is rejected.
  if (!Object.isFrozen(strings) || !Array.isArray(strings.raw)) {
    throw new TypeError('html`` accepts template literals only.')
  }
  let source = strings[0] ?? ''
  values.forEach((value, index) => {
    if (!(value instanceof StaticMarkup)) throw new TypeError('html`` interpolates Markup only.')
    source += value.source + (strings[index + 1] ?? '')
  })
  approved.add(source)
  return new StaticMarkup(source)
}

const trustedTypes = (globalThis as { trustedTypes?: TrustedTypesLike }).trustedTypes
const policy = trustedTypes?.createPolicy('static-markup', {
  createHTML(input) {
    if (!approved.has(input)) throw new TypeError('Rejected markup that was not authored in code.')
    return input
  },
})

const templates = new Map<string, HTMLTemplateElement>()

/** Parse once per distinct source, then hand out cheap clones. */
export function fragment(markup: Markup): DocumentFragment {
  let template = templates.get(markup.source)
  if (template === undefined) {
    template = document.createElement('template')
    template.innerHTML = (policy?.createHTML(markup.source) ?? markup.source) as string
    templates.set(markup.source, template)
  }
  return template.content.cloneNode(true) as DocumentFragment
}

/** Replace an element's children with a parsed copy of `markup`. */
export function setMarkup(element: Element, markup: Markup): void {
  element.replaceChildren(fragment(markup))
}
