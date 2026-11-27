import { describe, expect, it } from 'vitest'
import { html } from '../../src/ui/dom/markup'

describe('html`` static markup', () => {
  it('joins literal parts and nested markup', () => {
    const icon = html`<svg></svg>`
    expect(html`<span>${icon}</span>`.source).toBe('<span><svg></svg></span>')
  })

  it('refuses strings that did not come from a template literal', () => {
    const forged = Object.assign(['<img src=x onerror=alert(1)>'], {
      raw: ['<img src=x onerror=alert(1)>'],
    }) as unknown as TemplateStringsArray
    expect(() => html(forged)).toThrow(TypeError)
  })

  it('refuses plain-string interpolation', () => {
    const untrusted = '<img src=x onerror=alert(1)>' as unknown as ReturnType<typeof html>
    expect(() => html`<p>${untrusted}</p>`).toThrow(TypeError)
  })
})
