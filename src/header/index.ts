import { IndexedFormula, NamedNode, sym } from 'rdflib'
import { loginStatusBox, solidAuthClient } from '../authn/authn'
import { widgets } from '../widgets'
import { icon } from './icon'
import { log } from '../debug'
import { getClasses } from '../jss'
import { styleMap } from './styleMap'
// import { SolidSession } from '../../typings/solid-auth-client'
// import { emptyProfile } from './empty-profile'
// import { throttle } from '../helpers/throttle'
// import { getPod } from './metadata'
// Just for now..  ./metadata in mashlib
// 3 variables below including at_hash in Solid claim had to make camelcase...
interface SolidAuthorization {
  accessToken: string;
  clientId: string;
  idToken: string;
}

type Menu = {
  label: string,
  url: string
}
type HeaderOptions = {
  logo?: string,
  menuList?: Menu[]
}
interface SolidClaim {
  atHash: string;
  aud: string;
  azp: string;
  cnf: {
    jwk: string;
  };
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  nonce: string;
  sub: string;
}
export interface SolidSession {
  authorization: SolidAuthorization;
  credentialType: string;
  idClaims: SolidClaim;
  idp: string;
  issuer: string;
  sessionKey: string;
  webId: string;
}

export function getPod (): NamedNode {
  // @@ TODO: This is given that mashlib runs on NSS - might need to change when we want it to run on other Pod servers
  return sym(document.location.origin).site()
}

export const emptyProfile = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M13 25C19.6274 25 25 19.6274 25 13C25 6.37258 19.6274 1 13 1C6.37258 1 1 6.37258 1 13C1 19.6274 6.37258 25 13 25Z" fill="#D8D8D8" stroke="#8B8B8B"/>
    <mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="26" height="26">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M13 25C19.6274 25 25 19.6274 25 13C25 6.37258 19.6274 1 13 1C6.37258 1 1 6.37258 1 13C1 19.6274 6.37258 25 13 25Z" fill="white" stroke="white"/>
    </mask>
    <g mask="url(#mask0)">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M17.0468 10.4586C17.0468 14.4979 15.4281 16.9214 12.9999 16.9214C10.5718 16.9214 8.95298 14.4979 8.95298 10.4586C8.95298 6.41931 12.9999 6.41931 12.9999 6.41931C12.9999 6.41931 17.0468 6.41931 17.0468 10.4586ZM4.09668 23.3842C6.52483 17.7293 12.9999 17.7293 12.9999 17.7293C12.9999 17.7293 19.475 17.7293 21.9031 23.3842C21.9031 23.3842 17.8481 25 12.9999 25C8.15169 25 4.09668 23.3842 4.09668 23.3842Z" fill="#8B8B8B"/>
    </g>
</svg>`

type ThrottleOptions = {
  leading?: boolean;
  throttling?: boolean;
  trailing?: boolean;
}

export function throttle (func: Function, wait: number, options: ThrottleOptions = {}): (...args: any[]) => any {
  let context: any, args: any, result: any
  let timeout: any = null
  let previous = 0
  const later = function () {
    previous = !options.leading ? 0 : Date.now()
    timeout = null
    result = func.apply(context, args)
    if (!timeout) context = args = null
  }
  return function () {
    const now = Date.now()
    if (!previous && !options.leading) previous = now
    const remaining = wait - (now - previous)
    // @ts-ignore
    context = this
    args = arguments
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      result = func.apply(context, args)
      if (!timeout) context = args = null
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining)
    }
    return result
  }
}

export async function initHeader (store: IndexedFormula, options: HeaderOptions) {
  const header = document.getElementById('PageHeader')
  if (!header) {
    return
  }
  const pod = getPod()
  log(pod)
  solidAuthClient.trackSession(rebuildHeader(header, store, pod, options))
}

function rebuildHeader (header: HTMLElement, store: IndexedFormula, pod: NamedNode, options: HeaderOptions) {
  return async (session: SolidSession | null) => {
    // const user = session ? sym(session.webId) : null
    // SAM - don't forget to put in the line above instead of the line below :)
    const user = sym('https://sharonstrats.inrupt.net/profile/card#me')
    log(user)
    header.innerHTML = ''
    header.appendChild(await createBanner(store, pod, user, options))
  }
}

async function createBanner (store: IndexedFormula, pod: NamedNode, user: NamedNode | null, options: HeaderOptions): Promise<HTMLElement> {
  const podLink = document.createElement('a')
  podLink.href = pod.uri
  podLink.classList.add('header-banner__link')
  podLink.innerHTML = icon

  const menu = user
    ? await createUserMenu(store, user, options)
    : createLoginSignUpButtons()

  const banner = document.createElement('div')
  banner.classList.add('header-banner')
  banner.appendChild(podLink)
  banner.appendChild(menu)

  return banner
}

function createLoginSignUpButtons () {
  const profileLoginButtonPre = document.createElement('div')
  profileLoginButtonPre.classList.add('header-banner__login')
  profileLoginButtonPre.appendChild(loginStatusBox(document, null, {}))
  return profileLoginButtonPre
}
async function openDashboardPane (outliner: any, pane: string): Promise<void> {
  outliner.showDashboard({
    pane
  })
}

function createUserMenuButton (label: string, onClick: EventListenerOrEventListenerObject): HTMLElement {
  const button = document.createElement('button')
  button.classList.add('header-user-menu__button')
  button.addEventListener('click', onClick)
  button.innerText = label
  return button
}

function getStyle (styleClass) {
  return styleMap[styleClass]
}

function addStyleClassToElement (element: any, styleClass: string) {
  const style = getStyle(styleClass)
  const { classes } = getClasses(document.head, { [styleClass]: style })
  element.classList.add(classes[styleClass])
}

function createUserMenuLink (label: string, href: string): HTMLElement {
  // if you have a uri then call that otherwise call on the button..
  // specify action in mashlib..  when you have onclick this function should be called
  // call property onclick if present it's a callback function, call upon that property
  // will outside of this function..
  const link = document.createElement('a')
  // link.classList.add('header-user-menu__link')
  const style = getStyle('header-user-menu__link')
  const { classes } = getClasses(document.head, { 'header-user-menu__link': style })
  link.classList.add(classes['header-user-menu__link'])
  link.href = href
  link.innerText = label
  return link
}

async function createUserMenu (store: IndexedFormula, user: NamedNode, options: HeaderOptions): Promise<HTMLElement> {
  const fetcher = (<any>store).fetcher
  if (fetcher) {
    // Making sure that Profile is loaded before building menu
    await fetcher.load(user)
  }
  // const outliner = getOutliner(document)
  // SAM Options: here is where I can take the list of options and add to loggedInMenuList...
  const loggedInMenuList = document.createElement('ul')
  // loggedInMenuList.classList.add('header-user-menu__list')
  addStyleClassToElement(loggedInMenuList, 'headerUserMenuList')
  loggedInMenuList.appendChild(createUserMenuItem(createUserMenuLink('Show your profile', user.uri)))
  if (options.menuList) {
    options.menuList.map(function (menuItem) {
      loggedInMenuList.appendChild(createUserMenuItem(createUserMenuLink(menuItem.label, menuItem.url)))
    })
  }
  /*
  const menuItems = await getMenuItems(outliner)
  menuItems.forEach(item => {
    loggedInMenuList.appendChild(createUserMenuItem(createUserMenuButton(item.label, () => openDashboardPane(outliner, item.tabName || item.paneName))))
  }) */
  loggedInMenuList.appendChild(createUserMenuItem(createUserMenuButton('Log out', () => solidAuthClient.logout())))

  const loggedInMenu = document.createElement('nav')
  loggedInMenu.classList.add('header-user-menu__navigation-menu')
  addStyleClassToElement(loggedInMenu, 'headerUserMenuNavigationMenu')
  loggedInMenu.setAttribute('aria-hidden', 'true')
  loggedInMenu.appendChild(loggedInMenuList)

  const loggedInMenuTrigger = document.createElement('button')
  loggedInMenuTrigger.classList.add('header-user-menu__trigger')
  loggedInMenuTrigger.type = 'button'
  /* const profileImg = getProfileImg(store, user)
  if (typeof profileImg === 'string') {
    loggedInMenuTrigger.innerHTML = profileImg
  } else {
    loggedInMenuTrigger.appendChild(profileImg)
  } */

  const loggedInMenuContainer = document.createElement('div')
  // loggedInMenuContainer.classList.add('header-banner__user-menu', 'header-user-menu')
  loggedInMenuContainer.appendChild(loggedInMenuTrigger)
  loggedInMenuContainer.appendChild(loggedInMenu)

  const throttledMenuToggle = throttle((event: Event) => toggleMenu(event, loggedInMenuTrigger, loggedInMenu), 50)
  loggedInMenuTrigger.addEventListener('click', throttledMenuToggle)
  let timer = setTimeout(() => null, 0)
  loggedInMenuContainer.addEventListener('mouseover', event => {
    clearTimeout(timer)
    throttledMenuToggle(event)
  })
  loggedInMenuContainer.addEventListener('mouseout', event => {
    timer = setTimeout(() => throttledMenuToggle(event), 200)
  })

  return loggedInMenuContainer
}

function createUserMenuItem (child: HTMLElement): HTMLElement {
  const menuProfileItem = document.createElement('li')
  menuProfileItem.classList.add('header-user-menu__list-item')
  menuProfileItem.appendChild(child)
  return menuProfileItem
}

async function getMenuItems (outliner: any): Promise<Array<{
  paneName: string;
  tabName?: string;
  label: string;
  icon: string;
}>> {
  return outliner.getDashboardItems()
}

function getProfileImg (store: IndexedFormula, user: NamedNode): string | HTMLElement {
  const profileUrl = widgets.findImage(user)
  if (!profileUrl) {
    return emptyProfile
  }
  const profileImage = document.createElement('div')
  profileImage.classList.add('header-user-menu__photo')
  profileImage.style.backgroundImage = `url("${profileUrl}")`
  return profileImage
}

function toggleMenu (event: Event, trigger: HTMLButtonElement, menu: HTMLElement): void {
  const isExpanded = trigger.getAttribute('aria-expanded') === 'true'
  const expand = event.type === 'mouseover'
  const close = event.type === 'mouseout'
  if ((isExpanded && expand) || (!isExpanded && close)) {
    return
  }
  trigger.setAttribute('aria-expanded', (!isExpanded).toString())
  menu.setAttribute('aria-hidden', isExpanded.toString())
}
