import { IndexedFormula } from 'rdflib'
import {
  list,
  paneForIcon,
  paneForPredicate,
  register,
  byName
} from 'pane-registry'
import store from '../../src/store'
import { createContext} from './context'
import { OutlineManager } from './outlineManager'

export function getOutliner (dom) {
  if (!dom.outlineManager) {
    const context = createContext(
      dom,
      { list, paneForIcon, paneForPredicate, register, byName },
      store
    )
    dom.outlineManager = new OutlineManager(context)
  }
  return dom.outlineManager
}
