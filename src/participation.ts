import { currentUser } from './authn/authn'
import { NamedNode, st } from 'rdflib'
import ns from './ns'
import { personTR, newThing, errorMessageBlock } from './widgets'
import { syncTableToArray } from './utils'
import { lightColorHash } from './pad'
import { log } from './debug'
import { solidLogicSingleton } from './logic'

type ParticipationOptions = {
  deleteFunction?: () => {}
  link?: string
  draggable?: boolean
}

class ParticipationTableElement extends HTMLTableElement {
  refresh?: () => void
}
const kb = solidLogicSingleton.store

/**  Manage participation in this session
*
*  @param {Document} dom - the web page loaded into the browser
*  @param {HTMLTableElement} table - the table element
*  @param {NamedNode} unused1/document - the document to render (this argument is no longer used, but left in for backwards compatibility)
*  @param {NamedNode} subject - the thing in which the participation is happening
*  @param {NamedNode} unused2/me - user that is logged into the pod (this argument is no longer used, but left in for backwards compatibility)
*  @param {ParticipationOptions} options - the options that can be passed in are deleteFunction, link, and draggable these are used by the personTR button
*/
export function renderPartipants (dom: HTMLDocument, table: ParticipationTableElement, unused1: NamedNode, subject: NamedNode, unused2: NamedNode, options: ParticipationOptions) {
  table.setAttribute('style', 'margin: 0.8em;')

  const newRowForParticpation = function (parp) {
    const person = kb.any(parp, ns.wf('participant'))

    let tr
    if (!person) {
      tr = dom.createElement('tr')
      tr.textContent = '???' // Don't crash - invalid part'n entry
      return tr
    }
    const bg = kb.anyValue(parp, ns.ui('backgroundColor')) || 'white'

    const block = dom.createElement('div')
    block.setAttribute(
      'style',
      'height: 1.5em; width: 1.5em; margin: 0.3em; border 0.01em solid #888; background-color: ' +
      bg
    )
    tr = personTR(dom, null, person, options)
    table.appendChild(tr)
    const td = dom.createElement('td')
    td.setAttribute('style', 'vertical-align: middle;')
    td.appendChild(block)
    tr.insertBefore(td, tr.firstChild)
    return tr
  }

  const syncTable = function () {
    const parps = kb.each(subject, ns.wf('participation')).map(function (parp) {
      log('in participants')
      return [kb.anyValue(parp, ns.cal('dtstart')) || '9999-12-31', parp]
    })
    parps.sort() // List in order of joining
    const participations = parps.map(function (p) {
      return p[1]
    })
    syncTableToArray(table, participations, newRowForParticpation)
  }
  table.refresh = syncTable
  syncTable()
  return table
}

/** Record, or find old, Particpation object
 *
 * A particpaption object is a place to record things specifically about
 * subject and the user, such as preferences, start of membership, etc
 * @param {NamedNode} subject - the thing in which the participation is happening
 * @param {NamedNode} document -  where to record the data
 * @param {NamedNode} me - the logged in user
 *
 */
export function participationObject (subject: NamedNode, padDoc: NamedNode, me: NamedNode) {
  return new Promise(function (resolve, reject) {
    try {
      if (!me) {
        throw new Error('Not user id')
      }
    } catch (err) {
      log(err)
    }

    const parps = kb.each(subject, ns.wf('participation')).filter(function (pn) {
      return kb.holds(pn, ns.wf('participant'), me)
    })
    try {
      if (parps.length > 1) {
        throw new Error('Multiple records of your participation')
      }
    } catch (err) {
      log(err)
    }
    if (parps.length) {
      // If I am not already recorded
      resolve(parps[0]) // returns the particpation object
    } else {
      const participation = newThing(padDoc)
      const ins = [
        st(subject, ns.wf('participation'), participation, padDoc),

        st(participation, ns.wf('participant'), me, padDoc),
        st(participation, ns.cal('dtstart'), new Date() as any, padDoc),
        st(
          participation,
          ns.ui('backgroundColor'),
          lightColorHash(me) as any,
          padDoc
        )
      ]
      kb.updater.update([], ins, function (uri: string, ok: boolean, errorMessage: string) {
        if (!ok) {
          reject(new Error('Error recording your partipation: ' + errorMessage))
        } else {
          resolve(participation)
        }
      })
      resolve(participation)
    }
  })
}

/** Record my participation and display participants
 *
 * @param {NamedNode} subject - the thing in which participation is happening
 * @param {NamedNode} padDoc - the document into which the particpation should be recorded
 * @param {DOMNode} refreshable - a DOM element whose refresh() is to be called if the change works
 *
 */
export function recordParticipation (subject: NamedNode, padDoc: NamedNode, refreshable: any) {
  const me = currentUser()
  if (!me) return // Not logged in

  const parps = kb.each(subject, ns.wf('participation')).filter(function (pn) {
    return kb.holds(pn, ns.wf('participant'), me)
  })
  try {
    if (parps.length > 1) {
      throw new Error('Multiple records of your participation')
    }
  } catch (err) {
    log(err)
  }
  if (parps.length) {
    // If I am not already recorded
    return parps[0] // returns the particpation object
  } else {
    const participation = newThing(padDoc)
    const ins = [
      st(subject, ns.wf('participation'), participation, padDoc),

      st(participation, ns.wf('participant'), me, padDoc),
      st(participation, ns.cal('dtstart'), new Date() as any, padDoc),
      st(
        participation,
        ns.ui('backgroundColor'),
        lightColorHash(me) as any,
        padDoc
      )
    ]
    kb.updater.update([], ins, function (uri: string, ok: boolean, errorMessage: string) {
      try {
        if (!ok) {
          throw new Error('Error recording your partipation: ' + errorMessage)
        }
      } catch (err) {
        log(err)
      }
      if (refreshable && refreshable.refresh) {
        refreshable.refresh()
      }
      // UI.pad.renderPartipants(dom, table, padDoc, subject, me, options)
    })
    return participation
  }
}

/**  Record my participation and display participants
*
*   @param {Document} dom  - the web page loaded into the browser
*   @param {HTMLDivElement} container - the container element where the participants should be displayed
*   @param {NamedNode} document - the document into which the particpation should be shown
*   @param {NamedNode} subject - the thing in which participation is happening
*   @param {NamedNode} me - the logged in user
*   @param {ParticipationOptions} options - the options that can be passed in are deleteFunction, link, and draggable these are used by the personTR button
*
*/
export function manageParticipation (
  dom: Document,
  container: HTMLDivElement,
  padDoc: NamedNode,
  subject: NamedNode,
  me: NamedNode,
  options: ParticipationOptions
) {
  const table = dom.createElement('table')
  container.appendChild(table)
  renderPartipants(dom, table, padDoc, subject, me, options)
  try {
    recordParticipation(subject, padDoc, table)
  } catch (e) {
    container.appendChild(
      errorMessageBlock(
        dom,
        'Error recording your partipation: ' + e
      )
    ) // Clean up?
  }
  return table
}
