import store from './store'
import { cancelButton } from './widgets'
import { label } from './utils'
import { NamedNode } from 'rdflib'

type TabWidgetOptions = {
  backgroundColor?: string
  dom?: HTMLDocument
  items?: Array<NamedNode>
  onClose?: (event: Event) => void
  ordered?: boolean
  orientation?: '0' | '1' | '2' | '3'
  predicate?: NamedNode
  renderMain?: (bodyMain: HTMLElement, subject: NamedNode) => void
  renderTab?: (tabDiv: HTMLDivElement, subject: NamedNode) => void
  renderTabSettings?: (bodyMain: ContainerElement, subject: NamedNode) => void
  selectedTab?: string
  startEmpty?: boolean
  subject?: NamedNode
}

export class TabWidgetElement extends HTMLElement {
  bodyContainer?: HTMLElement
  refresh?: () => void
  tabContainer?: HTMLElement
}

/**
 * @ignore
 */
class ContainerElement extends HTMLElement {
  asSettings?: boolean
}

/**
 * @ignore
 */
class TabElement extends HTMLElement {
  bodyTR?: HTMLElement
  subject?: NamedNode
}

/**
 * Use this widget to generate tabs from triples set in the global store.
 *
 * [Here you can see examples of the tabs](https://solid.github.io/solid-ui/examples/tabs/).
 *
 * It assumes that items to use for tabs will be in a collection by default,
 * e.g.:
 *
 * ```turtle
 * :subject :predicate ( :item1 :item2 ) .
 * ```
 *
 * You can override this by setting `ordered: false`, in which case it expects
 * unordered triples:
 *
 * ```turtle
 * :subject :predicate :item1, :item 2 .
 * ```
 *
 * Triples that are not ordered in collection are in principle not sorted,
 * which means that tabs could change order every time you render the widget.
 * But in this case the widget will try to sort it in order to keep it
 * consistent.
 *
 * In both of these cases you need to define options `subject` and `predicate`
 * to tell the widget which triples it should be looking for.
 *
 * Finally you can set items manually, using the `items` option, e.g.:
 *
 * ```javascript
 * {
 *   items: [
 *     namedNode('https://domain.tld/#item1'),
 *     namedNode('https://domain.tld/#item2')
 *   ]
 * }
 * ```
 *
 * When you set items manually you do not need to set `subject` and
 * `predicate`.
 *
 * In any case you probably want to set the renderMain option to specify
 * what should be rendered for the various items, e.g.:
 *
 * ```javascript
 * {
 *   renderMain: (bodyMain, subject) => {
 *     bodyMain.innerHTML = renderItem(subject)
 *   }
 * }
 * ```
 *
 * **Note:** `renderItem` is a custom function that you need to define yourself.
 *
 * The option `renderTabSettings` allows you to render a custom view in the
 * body container that is shown when you hold the ALT key and click on a
 * tab. It works very much like the `renderMain` option:
 *
 * ```javascript
 * {
 *   renderTabSettings: (bodyMain, subject) => {
 *     bodyMain.innerHTML = renderTabSettings(subject)
 *   }
 * }
 * ```
 *
 * **Note:** `renderTabSettings` is a custom function that you need to define
 * yourself.
 *
 * By default the widget will try to guess the label by using the
 * [[utils.label]] function. If you want to customize this yourself, you can
 * use the `renderTab` option:
 *
 * ```javascript
 * {
 *   renderTab: (tabDiv, subject) => {
 *     tabDiv.innerText = renderTabText(subject)
 *   }
 * }
 * ```
 *
 * **Note:** `renderTabText` is a custom function you need to define yourself.
 *
 * The option renderTab is also important if you want to set which tab should
 * be selected once the widget is rendered. By default it will simply select
 * the first tab, but you can override by setting `dataset.name` on the tab
 * and referring to the same string in `selectedTab`:
 *
 * ```javascript
 * {
 *   renderTab: (tabDiv, subject)  => {
 *     tabDiv.dataset.name = subject.uri
 *   },
 *   selectedTab: item2.uri
 * }
 * ```
 *
 * You can apply a color to use for tabs and border of the container by using
 * option `background-color`. This is #ddddcc by default.
 *
 * You can override the document object that the widget uses to generate DOM
 * elements by setting the option `dom`. This is encouraged to set if you
 * intend your functionality to be used in environments that don't provide
 * a global `document` object.
 *
 * If you want to render a close button next to the tabs you can set option
 * `onClose` which takes a callback function that is triggered when the
 * button is clicked:
 *
 * ```javascript
 * {
 *   onClose: (event) => {
 *     // do something that hides the widget altogether
 *   }
 * }
 * ```
 *
 * The option `orientation` allows you to set which side the tabs should be
 * located: `'0'` = Top, `'1'` = Left, `'2'` = Bottom, `'3'` = Right
 *
 * If you don't want to render anything in the body container by default,
 * you can set the option `startEmpty` to `true`.
 *
 * @param options
 */
export function tabWidget (options: TabWidgetOptions) {
  const subject = options.subject
  const dom = options.dom || document
  const orientation = parseInt(options.orientation || '0')
  const backgroundColor = options.backgroundColor || '#ddddcc'
  const flipped = orientation & 2
  const vertical = orientation & 1
  const onClose = options.onClose

  const [selectedColor, color] = getColors(backgroundColor)
  const bodyMainStyle = `flex: 2; width: auto; height: 100%; border: 0.1em; border-style: solid; border-color: ${selectedColor}; padding: 1em;`
  const rootElement: TabWidgetElement = dom.createElement('div') // 20200117a

  rootElement.setAttribute('style', 'display: flex; height: 100%; width: 100%; flex-direction: ' +
    (vertical ? 'row' : 'column') + (flipped ? '-reverse;' : ';'))

  const navElement = rootElement.appendChild(dom.createElement('nav'))
  navElement.setAttribute('style', 'margin: 0;')

  const mainElement = rootElement.appendChild(dom.createElement('main'))

  mainElement.setAttribute('style', 'margin: 0; width:100%; height: 100%;') // override tabbedtab.css
  const tabContainer = navElement.appendChild(dom.createElement('ul'))
  tabContainer.setAttribute('style', `
    list-style-type: none;
    display: flex; 
    height: 100%; 
    width: 100%;
    margin: 0;
    padding: 0; 
    flex-direction: ${(vertical ? 'column' : 'row')}
  `)

  const tabElement = 'li'

  const bodyContainer = mainElement
  rootElement.tabContainer = tabContainer
  rootElement.bodyContainer = bodyContainer

  const corners = ['2em', '2em', '0', '0'] // top left, TR, BR, BL
  const cornersPrepped = corners.concat(corners).slice(orientation, orientation + 4)
  const cornersStyle = `border-radius: ${cornersPrepped.join(' ')};`

  const margins = ['0.3em', '0.3em', '0', '0.3em'] // top, right, bottom, left
  const marginsPrepped = margins.concat(margins).slice(orientation, orientation + 4)
  const marginsStyle = `margin: ${marginsPrepped.join(' ')};`

  const paddingStyle = `padding: ${marginsPrepped.join(' ')};`

  const tabStyle = cornersStyle + `padding: 0.7em; max-width: 20em; color: ${color};`
  const unselectedStyle = `${tabStyle + marginsStyle}opacity: 50%; background-color: ${backgroundColor};`
  const selectedStyle = `${tabStyle + marginsStyle}background-color: ${selectedColor};`
  const shownStyle = 'height: 100%; width: 100%;'
  const hiddenStyle = shownStyle + 'display: none;'
  rootElement.refresh = orderedSync
  orderedSync()

  if (!options.startEmpty && tabContainer.children.length && options.selectedTab) {
    const selectedTab = Array.from(tabContainer.children)
      .map(tab => tab.firstChild as HTMLElement)
      .find(tab => tab.dataset.name === options.selectedTab)
    const tab = selectedTab || tabContainer.children[0].firstChild as HTMLButtonElement
    tab.click()
  } else if (!options.startEmpty) {
    (tabContainer.children[0].firstChild as HTMLButtonElement).click() // Open first tab
  }
  return rootElement

  function addCancelButton (tabContainer) {
    if (tabContainer.dataset.onCloseSet) {
      // @@ TODO: this is only here to make the browser tests work
      // Discussion at https://github.com/solid/solid-ui/pull/110#issuecomment-527080663
      const existingCancelButton = tabContainer.querySelector('.unstyled')
      tabContainer.removeChild(existingCancelButton)
    }
    const extraTab = dom.createElement(tabElement)
    extraTab.classList.add('unstyled')
    const tabCancelButton = cancelButton(dom, onClose)
    tabCancelButton.setAttribute('style', tabCancelButton.getAttribute('style') + paddingStyle)
    extraTab.appendChild(tabCancelButton)
    tabContainer.appendChild(extraTab)
    tabContainer.dataset.onCloseSet = 'true'
  }

  function getItems (): Array<NamedNode> {
    if (options.items) return options.items
    if (options.ordered !== false) {
      // options.ordered defaults to true
      return store.the(subject, options.predicate).elements
    } else {
      return store.each(subject, options.predicate)
    }
  }

  function makeNewSlot (item: NamedNode) {
    const ele = dom.createElement(tabElement) as TabElement
    ele.subject = item
    const div = ele.appendChild(dom.createElement('div'))
    div.setAttribute('style', unselectedStyle)

    div.addEventListener('click', function (e) {
      if (!e.metaKey) {
        resetTabStyle()
        resetBodyStyle()
      }
      div.setAttribute('style', selectedStyle)
      if (!ele.bodyTR) return
      ele.bodyTR.setAttribute('style', shownStyle)
      const bodyMain = getOrCreateContainerElement(ele)
      if (options.renderTabSettings && e.altKey && ele.subject && bodyMain.asSettings !== true) {
        bodyMain.innerHTML = 'loading settings ...' + item
        options.renderTabSettings(bodyMain, ele.subject)
        bodyMain.asSettings = true
      } else if (options.renderMain && ele.subject && bodyMain.asSettings !== false) {
        bodyMain.innerHTML = 'loading item ...' + item
        options.renderMain(bodyMain, ele.subject)
        bodyMain.asSettings = false
      }
    })

    if (options.renderTab) {
      options.renderTab(div, item)
    } else {
      div.textContent = label(item)
    }
    return ele

    function getOrCreateContainerElement (ele: TabElement): ContainerElement {
      const bodyMain = ele.bodyTR?.children[0] as ContainerElement
      if (bodyMain) return bodyMain
      const newBodyMain = ele.bodyTR!.appendChild(dom.createElement('main'))
      newBodyMain.setAttribute('style', bodyMainStyle)
      return newBodyMain
    }
  }

  // @@ Use common one from utils?
  function orderedSync () {
    const items = getItems()
    let slot: TabElement, i, j, left, right
    let differ = false
    // Find how many match at each end
    for (left = 0; left < tabContainer.children.length; left++) {
      slot = tabContainer.children[left] as TabElement
      if (
        left >= items.length ||
        (slot.subject && !slot.subject.sameTerm(items[left]))
      ) {
        differ = true
        break
      }
    }
    if (!differ && items.length === tabContainer.children.length) {
      return // The two just match in order: a case to optimize for
    }
    for (right = tabContainer.children.length - 1; right >= 0; right--) {
      slot = tabContainer.children[right] as TabElement
      j = right - tabContainer.children.length + items.length
      if (slot.subject && !slot.subject.sameTerm(items[j])) {
        break
      }
    }
    // The elements left ... right in tabContainer.children do not match
    const insertables = items.slice(left, right - tabContainer.children.length + items.length + 1)
    while (right >= left) {
      // remove extra
      tabContainer.removeChild(tabContainer.children[left])
      bodyContainer.removeChild(bodyContainer.children[left])
      right -= 1
    }
    for (i = 0; i < insertables.length; i++) {
      const newSlot = makeNewSlot(insertables[i])
      const newBodyDiv = dom.createElement('div')
      newSlot.bodyTR = newBodyDiv
      if (left === tabContainer.children.length) {
        // None left of original on right
        tabContainer.appendChild(newSlot)
        bodyContainer.appendChild(newBodyDiv)
      } else {
        tabContainer.insertBefore(newSlot, tabContainer.children[left + i])
        bodyContainer.insertBefore(newBodyDiv, bodyContainer.children[left + i])
      }
    }
    if (onClose) {
      addCancelButton(tabContainer)
    }
  }

  function resetTabStyle () {
    for (let i = 0; i < tabContainer.children.length; i++) {
      const tab = tabContainer.children[i]
      if (tab.classList.contains('unstyled')) {
        continue
      }
      if (tab.children[0]) {
        tab.children[0].setAttribute('style', unselectedStyle)
      }
    }
  }

  function resetBodyStyle () {
    for (let i = 0; i < bodyContainer.children.length; i++) {
      bodyContainer.children[i].setAttribute('style', hiddenStyle)
    }
  }
}

/**
 * @internal
 */
function getColors (backgroundColor: string): [string, string] {
  return isLight(backgroundColor)
    ? [colorBlend(backgroundColor, '#ffffff', 0.3), '#000000']
    : [colorBlend(backgroundColor, '#000000', 0.3), '#ffffff']
}

/**
 * @internal
 */
function colorBlend (a: string, b: string, mix: number): string {
  let ca, cb, res
  let str = '#'
  const hex = '0123456789abcdef'
  for (let i = 0; i < 3; i++) {
    ca = parseInt(a.slice(i * 2 + 1, i * 2 + 3), 16)
    cb = parseInt(b.slice(i * 2 + 1, i * 2 + 3), 16)
    res = ca * (1.0 - mix) + cb * mix // @@@ rounding
    const res2 = parseInt(('' + res).split('.')[0]) // @@ ugh
    const h = parseInt(('' + res2 / 16).split('.')[0]) // @@ ugh
    const l = parseInt(('' + (res2 % 16)).split('.')[0]) // @@ ugh
    str += hex[h] + hex[l]
  }
  return str
}

/**
 * @internal
 */
function isLight (x: string): boolean {
  let total = 0
  for (let i = 0; i < 3; i++) {
    total += parseInt(x.slice(i * 2 + 1, i * 2 + 3), 16)
  }
  return total > 128 * 3
}
