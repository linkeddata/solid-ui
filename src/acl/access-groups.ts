/**
 * Contains the [[AccessGroups]]
 * and [[AccessGroupsOptions]] classes
 * @packageDocumentation
 */

import { IndexedFormula, NamedNode, sym } from 'rdflib'
import { ACLbyCombination, readACL } from './acl'
import widgets from '../widgets'
import ns from '../ns'
import { AccessController } from './access-controller'
import { AgentMapMap, ComboList, PartialAgentTriple } from './types'
import { AddAgentButtons } from './add-agent-buttons'
import * as debug from '../debug'

const ACL = ns.acl

const COLLOQUIAL = {
  13: 'Owners',
  9: 'Owners (write locked)',
  5: 'Editors',
  3: 'Posters',
  2: 'Submitters',
  1: 'Viewers'
}

const RECOMMENDED = {
  13: true,
  5: true,
  3: true,
  2: true,
  1: true
}

const EXPLANATION = {
  13: 'can read, write, and control sharing.',
  9: 'can read and control sharing, currently write-locked.',
  5: 'can read and change information',
  3: 'can add new information, and read but not change existing information',
  2: 'can add new information but not read any',
  1: 'can read but not change information'
}

/**
 * Type for the options parameter of [[AccessGroups]]
 */
export interface AccessGroupsOptions {
  defaults?: boolean
}

/**
 * Renders the table of Owners, Editors, Posters, Submitters, Viewers
 * for https://github.com/solid/userguide/blob/master/views/sharing/userguide.md
 */
export class AccessGroups {
  private readonly defaults: boolean
  public byCombo: ComboList
  public aclMap: AgentMapMap
  private readonly addAgentButton: AddAgentButtons
  private readonly rootElement: HTMLElement
  private _store: IndexedFormula

  constructor (
    private doc: NamedNode,
    private aclDoc: NamedNode,
    public controller: AccessController,
    store: IndexedFormula,
    private options: AccessGroupsOptions = {}
  ) {
    this.defaults = options.defaults || false
    this._store = store
    this.aclMap = readACL(doc, aclDoc, store, this.defaults)
    this.byCombo = ACLbyCombination(this.aclMap)
    this.addAgentButton = new AddAgentButtons(this)
    this.rootElement = this.controller.dom.createElement('div')
    this.rootElement.classList.add(this.controller.classes.accessGroupList)
  }

  public get store () {
    return this._store
  }

  public set store (store) {
    this._store = store
    this.aclMap = readACL(this.doc, this.aclDoc, store, this.defaults)
    this.byCombo = ACLbyCombination(this.aclMap)
  }

  public render (): HTMLElement {
    this.rootElement.innerHTML = ''
    this.renderGroups().forEach(group => this.rootElement.appendChild(group))
    if (this.controller.isEditable) {
      this.rootElement.appendChild(this.addAgentButton.render())
    }
    return this.rootElement
  }

  private renderGroups (): HTMLElement[] {
    const groupElements: HTMLElement[] = []
    for (let comboIndex = 15; comboIndex > 0; comboIndex--) {
      const combo = kToCombo(comboIndex)
      if ((this.controller.isEditable && RECOMMENDED[comboIndex]) || this.byCombo[combo]) {
        groupElements.push(this.renderGroup(comboIndex, combo))
      }
    }
    return groupElements
  }

  private renderGroup (comboIndex: number, combo: string): HTMLElement {
    const groupRow = this.controller.dom.createElement('div')
    groupRow.classList.add(this.controller.classes.accessGroupListItem)
    widgets.makeDropTarget(groupRow, (uris) => this.handleDroppedUris(uris, combo)
      .then(() => this.controller.render())
      .catch(error => this.controller.renderStatus(error)))
    const groupColumns = this.renderGroupElements(comboIndex, combo)
    groupColumns.forEach(column => groupRow.appendChild(column))
    return groupRow
  }

  private renderGroupElements (comboIndex, combo): HTMLElement[] {
    const groupNameColumn = this.controller.dom.createElement('div')
    groupNameColumn.classList.add(this.controller.classes.group)
    groupNameColumn.classList.toggle(this.controller.classes[`group-${comboIndex}`], this.controller.isEditable)
    groupNameColumn.innerText = COLLOQUIAL[comboIndex] || ktToList(comboIndex)

    const groupAgentsColumn = this.controller.dom.createElement('div')
    groupAgentsColumn.classList.add(this.controller.classes.group)
    groupAgentsColumn.classList.toggle(this.controller.classes[`group-${comboIndex}`], this.controller.isEditable)
    const groupAgentsTable = groupAgentsColumn.appendChild(this.controller.dom.createElement('table'))
    const combos = this.byCombo[combo] || []
    combos
      .map(([pred, obj]) => this.renderAgent(groupAgentsTable, combo, pred, obj))
      .forEach(agentElement => groupAgentsTable.appendChild(agentElement))

    const groupDescriptionElement = this.controller.dom.createElement('div')
    groupDescriptionElement.classList.add(this.controller.classes.group)
    groupDescriptionElement.classList.toggle(this.controller.classes[`group-${comboIndex}`], this.controller.isEditable)
    groupDescriptionElement.innerText = EXPLANATION[comboIndex] || 'Unusual combination'

    return [groupNameColumn, groupAgentsColumn, groupDescriptionElement]
  }

  private renderAgent (groupAgentsTable, combo, pred, obj): HTMLElement {
    const personRow = widgets.personTR(this.controller.dom, ACL(pred), sym(obj), this.controller.isEditable ? {
      deleteFunction: () => this.deleteAgent(combo, pred, obj)
        .then(() => groupAgentsTable.removeChild(personRow))
        .catch(error => this.controller.renderStatus(error))
    } : {})
    return personRow
  }

  private async deleteAgent (combo, pred, obj): Promise<void> {
    const combos = this.byCombo[combo] || []
    const comboToRemove = combos.find(([comboPred, comboObj]) => comboPred === pred && comboObj === obj)
    if (comboToRemove) {
      combos.splice(combos.indexOf(comboToRemove), 1)
    }
    await this.controller.save()
  }

  public async addNewURI (uri: string): Promise<void> {
    await this.handleDroppedUri(uri, kToCombo(1))
    await this.controller.save()
  }

  private async handleDroppedUris (uris: string[], combo: string): Promise<void> {
    try {
      await Promise.all(uris.map(uri => this.handleDroppedUri(uri, combo)))
      await this.controller.save()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  private async handleDroppedUri (uri: string, combo: string, secondAttempt: boolean = false): Promise<void> {
    const agent = findAgent(uri, this.store) // eg 'agent', 'origin', agentClass'
    const thing = sym(uri)
    if (!agent && !secondAttempt) {
      debug.log(`   Not obvious: looking up dropped thing ${thing}`)
      try {
        await (this.store as any).fetcher.load(thing.doc())
      } catch (error) {
        const message = `Ignore error looking up dropped thing: ${error}`
        debug.error(message)
        return Promise.reject(new Error(message))
      }
      return this.handleDroppedUri(uri, combo, true)
    } else if (!agent) {
      const error = `   Error: Drop fails to drop appropriate thing! ${uri}`
      debug.error(error)
      return Promise.reject(new Error(error))
    }
    this.setACLCombo(combo, uri, agent, this.controller.subject)
  }

  private setACLCombo (combo: string, uri: string, res: PartialAgentTriple, subject: NamedNode): void {
    if (!(combo in this.byCombo)) {
      this.byCombo[combo] = []
    }
    this.removeAgentFromCombos(uri) // Combos are mutually distinct
    this.byCombo[combo].push([res.pred, res.obj.uri])
    debug.log(`ACL: setting access to ${subject} by ${res.pred}: ${res.obj}`)
  }

  private removeAgentFromCombos (uri: string): void {
    for (let k = 0; k < 16; k++) {
      const combos = this.byCombo[kToCombo(k)]
      if (combos) {
        for (let i = 0; i < combos.length; i++) {
          while (i < combos.length && combos[i][1] === uri) {
            combos.splice(i, 1)
          }
        }
      }
    }
  }
}

function kToCombo (k: number): string {
  const y = ['Read', 'Append', 'Write', 'Control']
  const combo: string[] = []
  for (let i = 0; i < 4; i++) {
    if (k & (1 << i)) {
      combo.push('http://www.w3.org/ns/auth/acl#' + y[i])
    }
  }
  combo.sort()
  return combo.join('\n')
}

function ktToList (k: number): string {
  let list = ''
  const y = ['Read', 'Append', 'Write', 'Control']
  for (let i = 0; i < 4; i++) {
    if (k & (1 << i)) {
      list += y[i]
    }
  }
  return list
}

function findAgent (uri, kb): PartialAgentTriple | null {
  const obj = sym(uri)
  const types = kb.findTypeURIs(obj)
  for (const ty in types) {
    debug.log('    drop object type includes: ' + ty)
  }
  // An Origin URI is one like https://fred.github.io eith no trailing slash
  if (uri.startsWith('http') && uri.split('/').length === 3) {
    // there is no third slash
    return { pred: 'origin', obj: obj } // The only way to know an origin alas
  }
  // @@ This is an almighty kludge needed because drag and drop adds extra slashes to origins
  if (
    uri.startsWith('http') &&
    uri.split('/').length === 4 &&
    uri.endsWith('/')
  ) {
    // there  IS third slash
    debug.log('Assuming final slash on dragged origin URI was unintended!')
    return { pred: 'origin', obj: sym(uri.slice(0, -1)) } // Fix a URI where the drag and drop system has added a spurious slash
  }

  if (ns.vcard('WebID').uri in types) return { pred: 'agent', obj: obj }

  if (ns.vcard('Group').uri in types) {
    return { pred: 'agentGroup', obj: obj } // @@ note vcard membership not RDFs
  }
  if (
    obj.sameTerm(ns.foaf('Agent')) ||
    obj.sameTerm(ns.acl('AuthenticatedAgent')) || // AuthenticatedAgent
    obj.sameTerm(ns.rdf('Resource')) ||
    obj.sameTerm(ns.owl('Thing'))
  ) {
    return { pred: 'agentClass', obj: obj }
  }
  if (
    ns.vcard('Individual').uri in types ||
    ns.foaf('Person').uri in types ||
    ns.foaf('Agent').uri in types
  ) {
    const pref = kb.any(obj, ns.foaf('preferredURI'))
    if (pref) return { pred: 'agent', obj: sym(pref) }
    return { pred: 'agent', obj: obj }
  }
  if (ns.solid('AppProvider').uri in types) {
    return { pred: 'origin', obj: obj }
  }
  if (ns.solid('AppProviderClass').uri in types) {
    return { pred: 'originClass', obj: obj }
  }
  debug.log('    Triage fails for ' + uri)
  return null
}
