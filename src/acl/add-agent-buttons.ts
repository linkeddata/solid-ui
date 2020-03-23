/**
 * Contains the [[AddAgentButtons]] class
 * @packageDocumentation
 */

import { AccessGroups } from './access-groups'
import icons from '../iconBase'
import widgets from '../widgets'
import ns from '../ns'
import { logInLoadProfile } from '../authn/authn'
import utils from '../utils'
import { NamedNode } from 'rdflib'
import { AuthenticationContext } from '../authn/types'
import * as debug from '../debug'

/**
 * Renders the Sharing pane's "+" button and the menus behind it,
 * see https://github.com/solid/userguide/blob/master/views/sharing/userguide.md#add
 */
export class AddAgentButtons {
  private readonly rootElement: HTMLElement
  private readonly barElement: HTMLElement
  private isExpanded: boolean = false

  constructor (private groupList: AccessGroups) {
    this.rootElement = groupList.controller.dom.createElement('div')
    this.barElement = groupList.controller.dom.createElement('div')
  }

  public render (): HTMLElement {
    this.rootElement.innerHTML = ''
    this.rootElement.appendChild(this.renderAddButton())
    this.rootElement.appendChild(this.barElement)
    return this.rootElement
  }

  private renderAddButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      `${icons.iconBase}noun_34653_green.svg`,
      'Add ...',
      () => {
        this.toggleBar()
        this.renderBar()
      }
    )
  }

  private renderBar (): void {
    this.barElement.innerHTML = ''
    if (!this.isExpanded) {
      return
    }
    this.barElement.appendChild(this.renderPersonButton())
    this.barElement.appendChild(this.renderGroupButton())
    this.barElement.appendChild(this.renderPublicButton())
    this.barElement.appendChild(this.renderAuthenticatedAgentButton())
    this.barElement.appendChild(this.renderBotButton())
    this.barElement.appendChild(this.renderAppsButton())
  }

  private renderSimplifiedBar (button: EventTarget | null) {
    Array.from(this.barElement.children)
      .filter(element => element !== button)
      .forEach(element => this.barElement.removeChild(element))
  }

  private renderPersonButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      icons.iconBase + widgets.iconForClass['vcard:Individual'],
      'Add Person',
      event => {
        this.renderSimplifiedBar(event.target)
        this.renderNameForm(ns.vcard('Individual'), 'person')
          .then(name => this.addPerson(name))
          .then(() => this.renderCleanup())
          .catch(error => this.groupList.controller.renderStatus(error))
      }
    )
  }

  private renderGroupButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      icons.iconBase + widgets.iconForClass['vcard:Group'],
      'Add Group',
      event => {
        this.renderSimplifiedBar(event.target)
        this.renderNameForm(ns.vcard('Group'), 'group')
          .then(name => this.addGroup(name))
          .then(() => this.renderCleanup())
          .catch(error => this.groupList.controller.renderStatus(error))
      }
    )
  }

  private renderNameForm (type: NamedNode, noun: string): Promise<string | undefined> {
    return widgets.askName(
      this.groupList.controller.dom,
      this.groupList.store,
      this.barElement,
      ns.vcard('URI'),
      type,
      noun
    )
  }

  private renderPublicButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      icons.iconBase + widgets.iconForClass['foaf:Agent'],
      'Add Everyone',
      () => this.addAgent(ns.foaf('Agent').uri)
        .then(() => this.groupList.controller.renderTemporaryStatus('Adding the general public to those who can read. Drag the globe to a different level to give them more access.'))
        .then(() => this.renderCleanup()))
  }

  private renderAuthenticatedAgentButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      `${icons.iconBase}noun_99101.svg`,
      'Anyone logged In',
      () => this.addAgent(ns.acl('AuthenticatedAgent').uri)
        .then(() => this.groupList.controller.renderTemporaryStatus('Adding anyone logged in to those who can read. Drag the ID icon to a different level to give them more access.'))
        .then(() => this.renderCleanup()))
  }

  private renderBotButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      icons.iconBase + 'noun_Robot_849764.svg',
      'A Software Agent (bot)',
      event => {
        this.renderSimplifiedBar(event.target)
        this.renderNameForm(ns.schema('Application'), 'bot')
          .then(name => this.addBot(name))
          .then(() => this.renderCleanup())
      })
  }

  private renderAppsButton (): HTMLElement {
    return widgets.button(
      this.groupList.controller.dom,
      `${icons.iconBase}noun_15177.svg`,
      'A Web App (origin)',
      event => {
        this.renderSimplifiedBar(event.target)
        const eventContext = {
          div: this.barElement,
          dom: this.groupList.controller.dom
        }
        const existingApps = this.renderAppsTable(eventContext)
          .catch(error => this.groupList.controller.renderStatus(error))
        this.renderAppsView()
        const newApp = this.renderNameForm(ns.schema('WebApplication'), 'webapp domain')
          .then(name => this.getOriginFromName(name))
        Promise.race([
          existingApps,
          newApp
        ])
          .then(origin => {
            if (origin) {
              this.groupList.addNewURI(origin)
            }
          })
          .then(() => this.renderCleanup())
      }
    )
  }

  private renderAppsView (): void {
    const trustedApplications = this.groupList.controller.context.session.paneRegistry.byName('trustedApplications')
    if (trustedApplications) {
      const trustedApplicationsElement = trustedApplications.render(null, this.groupList.controller.context)
      trustedApplicationsElement.classList.add(this.groupList.controller.classes.trustedAppController)

      const cancelButton = widgets.cancelButton(this.groupList.controller.dom, () => this.renderCleanup())
      cancelButton.classList.add(this.groupList.controller.classes.trustedAppCancelButton)
      trustedApplicationsElement.insertBefore(cancelButton, trustedApplicationsElement.firstChild)

      this.barElement.appendChild(trustedApplicationsElement)
    }
  }

  private async renderAppsTable (eventContext: AuthenticationContext): Promise<string> {
    await logInLoadProfile(eventContext)
    const trustedApps = this.groupList.store.each(eventContext.me, ns.acl('trustedApp'))
    const trustedOrigins = trustedApps.flatMap(app => this.groupList.store.each(app, ns.acl('origin')))

    this.barElement.appendChild(this.groupList.controller.dom.createElement('p')).textContent = `You have ${trustedOrigins.length} selected web apps.`
    return new Promise((resolve, reject) => {
      const appsTable = this.barElement.appendChild(this.groupList.controller.dom.createElement('table'))
      appsTable.classList.add(this.groupList.controller.classes.trustedAppAddApplicationsTable)
      trustedApps.forEach(app => {
        const origin = this.groupList.store.any(app, ns.acl('origin'))
        if (!origin) {
          reject(new Error(`Unable to pick app: ${app.value}`))
        }
        const thingTR = widgets.personTR(this.groupList.controller.dom, ns.acl('origin'), origin, {})
        const innerTable = this.groupList.controller.dom.createElement('table')
        const innerRow = innerTable.appendChild(this.groupList.controller.dom.createElement('tr'))

        const innerLeftColumn = innerRow.appendChild(this.groupList.controller.dom.createElement('td'))
        innerLeftColumn.appendChild(thingTR)

        const innerMiddleColumn = innerRow.appendChild(this.groupList.controller.dom.createElement('td'))
        innerMiddleColumn.textContent = `Give access to ${this.groupList.controller.noun} ${utils.label(this.groupList.controller.subject)}?`

        const innerRightColumn = innerRow.appendChild(this.groupList.controller.dom.createElement('td'))
        innerRightColumn.appendChild(widgets.continueButton(this.groupList.controller.dom, () => resolve(origin!.value)))

        appsTable.appendChild(innerTable)
      })
    })
  }

  private renderCleanup (): void {
    this.renderBar()
    this.groupList.render()
  }

  private async addPerson (name?: string): Promise<void> {
    if (!name) return this.toggleBar() // user cancelled
    const domainNameRegexp = /^https?:/i
    if (!name.match(domainNameRegexp)) {
      // @@ enforce in user input live like a form element
      return Promise.reject(new Error('Not a http URI'))
    }
    // @@ check it actually is a person and has an owner who agrees they own it
    debug.log(`Adding to ACL person: ${name}`)
    await this.groupList.addNewURI(name)
    this.toggleBar()
  }

  private async addGroup (name?: string): Promise<void> {
    if (!name) return this.toggleBar() // user cancelled

    const domainNameRegexp = /^https?:/i
    if (!name.match(domainNameRegexp)) {
      // @@ enforce in user input live like a form element
      return Promise.reject(new Error('Not a http URI'))
    }
    // @@ check it actually is a group and has an owner who agrees they own it
    debug.log('Adding to ACL group: ' + name)
    await this.groupList.addNewURI(name)
    this.toggleBar()
  }

  private async addAgent (agentUri: string): Promise<void> {
    await this.groupList.addNewURI(agentUri)
    this.toggleBar()
  }

  private async addBot (name?: string): Promise<void> {
    if (!name) return this.toggleBar() // user cancelled
    const domainNameRegexp = /^https?:/i
    if (!name.match(domainNameRegexp)) {
      // @@ enforce in user input live like a form element
      return Promise.reject(new Error('Not a http URI'))
    }
    // @@ check it actually is a bot and has an owner who agrees they own it
    debug.log('Adding to ACL bot: ' + name)
    await this.groupList.addNewURI(name)
    this.toggleBar()
  }

  private async getOriginFromName (name?: string): Promise<string | void> {
    if (!name) return Promise.resolve() // user cancelled
    const domainNameRegexp = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
    // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch08s15.html
    if (!name.match(domainNameRegexp)) {
      // @@ enforce in user input live like a form element
      return Promise.reject(new Error('Not a domain name'))
    }
    const origin = 'https://' + name
    debug.log('Adding to ACL origin: ' + origin)
    this.toggleBar()
    return origin
  }

  private toggleBar (): void {
    this.isExpanded = !this.isExpanded
  }
}
