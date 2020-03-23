import store from '../../store'
import ns from '../../ns'
import { mostSpecificClassURI } from './fieldFunction'
import { fieldParams } from './fieldParams'

/**
 * A [[FieldFunction]] for a simple comment box. It will look for
 * the first (form, ns.ui('contents'), ?) triple it can find in
 * UI.store and use the value of the object of that triple as
 * the comment text.
 *
 * @param dom The DOM
 * @param container If set, the result will be appended to it as a child
 * @param already Unused
 * @param subject Unused
 * @param form RDF node with `ns.ui('contents')` attribute
 * @param _doc Unused
 * @param _callbackFunction Unused
 *
 * @returns a DOM element containing the comment.
 */
export function commentField (
  dom: HTMLDocument,
  container: HTMLElement | undefined,
  already: any,
  subject: any,
  form,
  _doc,
  _callbackFunction
) {
  const kb = store
  let contents = kb.any(form, ns.ui('contents'))
  if (!contents) contents = 'Error: No contents in comment field.'

  const uri = mostSpecificClassURI(form)
  let params = fieldParams[uri]
  if (params === undefined) {
    params = {}
  } // non-bottom field types can do this

  const box = dom.createElement('div')
  if (container) container.appendChild(box)
  const p = box.appendChild(dom.createElement(params.element || 'p'))
  p.textContent = contents

  let style = kb.any(form, ns.ui('style'))
  if (style === undefined) {
    style = params.style ? params.style : ''
  }
  if (style) p.setAttribute('style', style)

  return box
}
