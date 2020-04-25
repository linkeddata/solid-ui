/*
    This file was copied from mashlib/src/global/header.ts file. It is modified to
    work in solid-ui by adjusting where imported functions are found.
 */
import { IndexedFormula, NamedNode, sym } from 'rdflib'
import { loginStatusBox, solidAuthClient } from '../authn/authn'
import { widgets } from '../widgets'
import { icon } from './icon'
import { emptyProfile } from './empty-profile'
import { throttle, getPod, addStyleClassToElement } from './headerHelpers'
import { log } from '../debug'
import { getClasses } from '../jss'
import { styleMap } from './styleMap'

// SolidAuthorization, SolidClam, and SolidSession was copied from mashlib/typings/solid-auth-client
// access_token, client_id, id_token, at_hash had to be converted to camelcase for typescript compatibility

interface SolidAuthorization {
    accessToken: string;
    clientId: string;
    idToken: string;
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

export type MenuItemLink = {
    label: string,
    url: string
}

export type MenuItemButton = {
    label: string,
    onclick: () => {}
}

export type MenuItems = MenuItemLink | MenuItemButton

/*
HeaderOptions allow for customizing the logo and menu list.  If a logo is not provided the default
    is solid.  menuList ..
 */
export type HeaderOptions = {
    logo?: string,
    menuList?: MenuItems[]
}

/**
 * Initialize header component, the header object returned depends on whether the user is authenticated.
 * @param store
 * @param options .....
 * @returns a header for an authenticated user with menu items given or a login screen
 */
export async function initHeader (store: IndexedFormula, options: HeaderOptions) {
  const header = document.getElementById('PageHeader')
  if (!header) {
    return
  }

  const pod = getPod()
  solidAuthClient.trackSession(rebuildHeader(header, store, pod, options))
}
/**
 * @internal
 */
function rebuildHeader (header: HTMLElement, store: IndexedFormula, pod: NamedNode, options: HeaderOptions) {
  return async (session: SolidSession | null) => {
    const user = session ? sym(session.webId) : null
    // const user = sym('https://sharonstrats.inrupt.net/profile/card#me')
    header.innerHTML = ''
    header.appendChild(await createBanner(store, pod, user, options))
  }
}
/**
 * @internal
 */
async function createBanner (store: IndexedFormula, pod: NamedNode, user: NamedNode | null, options: HeaderOptions): Promise<HTMLElement> {
  const podLink = document.createElement('a')
  podLink.href = pod.uri
  addStyleClassToElement(podLink, ['header-banner__link'])
  podLink.innerHTML = "<span style='background-size: 65px 60px'>" + icon + '</span>'

  const menu = user
    ? await createUserMenu(store, user, options)
    : createLoginSignUpButtons()

  const banner = document.createElement('div')
  addStyleClassToElement(banner, ['header-banner'])
  banner.appendChild(podLink)
  banner.appendChild(menu)

  return banner
}
/**
 * @internal
 */
function createLoginSignUpButtons () {
  const profileLoginButtonPre = document.createElement('div')
  addStyleClassToElement(profileLoginButtonPre, ['header-banner__login'])
  profileLoginButtonPre.appendChild(loginStatusBox(document, null, {}))
  return profileLoginButtonPre
}
/**
 * @internal
 */
function createUserMenuButton (label: string, onClick: EventListenerOrEventListenerObject): HTMLElement {
  const button = document.createElement('button')
  addStyleClassToElement(button, ['header-user-menu__button'])
  button.addEventListener('click', onClick)
  button.innerText = label
  return button
}
/**
 * @internal
 */
function createUserMenuLink (label: string, href: string): HTMLElement {
  const link = document.createElement('a')
  addStyleClassToElement(link, ['header-user-menu__link'])
  link.href = href
  link.innerText = label
  return link
}

/**
 * @internal
 */
async function createUserMenu (store: IndexedFormula, user: NamedNode, options: HeaderOptions): Promise<HTMLElement> {
  const fetcher = (<any>store).fetcher
  if (fetcher) {
    // Making sure that Profile is loaded before building menu
    await fetcher.load(user)
  }
  const loggedInMenuList = document.createElement('ul')
  addStyleClassToElement(loggedInMenuList, ['header-user-menu__list'])
  loggedInMenuList.appendChild(createUserMenuItem(createUserMenuLink('Show your profile', user.uri)))
  if (options.menuList) {
    options.menuList.map(function (menuItem) {
      const menuItemType: string = 'url'
      // if ((menuItem as MenuItemButton).onclick()) {
      //  const menuType: string = 'onclick'
      // }
      loggedInMenuList.appendChild(createUserMenuItem(createUserMenuLink(menuItem.label, menuItem[menuItemType])))
    })
    // SAM test this if works then add button code instead of url code
  }

  loggedInMenuList.appendChild(createUserMenuItem(createUserMenuButton('Log out', () => solidAuthClient.logout())))

  const loggedInMenu = document.createElement('nav')

  addStyleClassToElement(loggedInMenu, ['header-user-menu__navigation-menu'])
  loggedInMenu.setAttribute('aria-hidden', 'true')
  loggedInMenu.appendChild(loggedInMenuList)

  const loggedInMenuTrigger = document.createElement('button')
  addStyleClassToElement(loggedInMenuTrigger, ['header-user-menu__trigger'])
  loggedInMenuTrigger.type = 'button'
  const profileImg = getProfileImg(store, user)
  if (typeof profileImg === 'string') {
    loggedInMenuTrigger.innerHTML = profileImg
  } else {
    loggedInMenuTrigger.appendChild(profileImg)
  }

  const loggedInMenuContainer = document.createElement('div')
  addStyleClassToElement(loggedInMenuContainer, ['header-banner__user-menu'])
  addStyleClassToElement(loggedInMenuContainer, ['header-user-menu'])
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

/**
 * @internal
 */
function createUserMenuItem (child: HTMLElement): HTMLElement {
  const menuProfileItem = document.createElement('li')
  addStyleClassToElement(menuProfileItem, ['header-user-menu__list-item'])
  menuProfileItem.appendChild(child)
  return menuProfileItem
}
/**
 * @internal
 */
function getProfileImg (store: IndexedFormula, user: NamedNode): string | HTMLElement {
  const profileUrl = null
  try {
    const profileUrl = widgets.findImage(user)
    if (!profileUrl) {
      return emptyProfile
    }
  } catch {
    return emptyProfile
  }

  const profileImage = document.createElement('div')
  addStyleClassToElement(profileImage, ['header-user-menu__photo'])
  profileImage.style.backgroundImage = `url("${profileUrl}")`
  return profileImage
}

/**
 * @internal
 */
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