// import { IndexedFormula, NamedNode, st, sym, uri, Util } from 'rdflib'
import { NamedNode } from 'rdflib'
// import { iconBase, originalIconBase } from '../iconBase'
// import store from '../store'
// import ns from '../ns'
import style from '../style'
import * as debug from '../debug'
import { info } from '../log'
import { getClasses } from '../jss'
// import { uploadFiles } from './dragAndDrop.js'

export type mentionee = {
  id: Number,
  name: string,
  uri: NamedNode
}

export type Mentionees = Array<mentionee>;

/** Create a Mention Context to use to display to user when they want to mention someone
 *
 * @param {HTMLDivElement} mentionContainer - The HTMLDivElement that will hold the mention Context
 * @param {Mentionees} potentialMentionees -  An array of data to display to the user when mentioning
 */
export function createMentionContext (mentionContainer: HTMLDivElement, potentialMentionees: Mentionees) {
  mentionContainer.classList.add('custom-select-wrapper')
  const mentionSelect = document.createElement('div')
  mentionSelect.classList.add('custom-select')
  const mentionSelectTrigger = document.createElement('div')
  mentionSelectTrigger.classList.add('custom-select__trigger')

  const mentionOptions = document.createElement('div')
  createMentionOptions(mentionOptions, potentialMentionees)

  mentionSelectTrigger.appendChild(mentionOptions)
  mentionSelect.appendChild(mentionSelectTrigger)
  mentionContainer.appendChild(mentionSelect)
}

/**
 * @internal
 */
function createMentionOptions (mentionOptions: HTMLSpanElement, potentialMentionees: Mentionees) {
  potentialMentionees.map(function (potentialMentionee) {
    const mentionOption = document.createElement('span')
    mentionOption.classList.add('custom-option')
    // also add id of the potentialMentionee.id
    mentionOption.setAttribute('data-value', potentialMentionee.name)
    mentionOption.textContent = potentialMentionee.name
    mentionOptions.appendChild(mentionOption)
    return 'test'
  })
}
