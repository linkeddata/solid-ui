
import { JSDOM } from 'jsdom'

// FIXME: Not sure why this is needed, but
// JSS tries to do .insertBefore on a StyleSheet element,
// and that seems to fail in JSDOM (it works fine in the browser)
export function domWithHead () {
  const window = new JSDOM('<!DOCTYPE html><head></head><body><p>Hello world</p></body>').window
  const dom = window.document
  return {
    head: {},
    createElement: dom.createElement.bind(dom)
  } as unknown as HTMLDocument
}
