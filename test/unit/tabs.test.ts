import { tabs } from '../../src/index'
import { tabWidget } from '../../src/tabs'
import { Collection, lit, NamedNode, namedNode } from 'rdflib'
import store from '../../src/store'
import { JSDOM } from 'jsdom'
import { clearStore } from './helpers/clearStore'
import { label } from '../../src/utils'
import { meeting, rdfs } from '../../src/ns'

const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('tabWidget', () => {
  let tabWidgetElement

  const item1 = namedNode('https://test.com/#item1')
  const item2 = namedNode('https://test.com/#item2')
  const item3 = namedNode('https://test.com/#item3')

  const subject = namedNode('https://test.com/#test')
  const minimalOptions = {
    dom,
    subject,
    items: [item1, item2]
  }

  it('is exposed on public API', () => {
    expect(tabs.tabWidget).toBe(tabWidget)
  })

  describe('minimal setup of options', () => {
    beforeAll(() => {
      const predicate = meeting('toolList')
      store.add(subject, predicate, new Collection([item1, item2]), subject.doc())
      // @@ TODO Remove need for casting lit (fix typings in rdflib)
      store.add(item1, rdfs('label'), (lit as any)('Item 1'), subject.doc())

      tabWidgetElement = tabs.tabWidget({
        dom,
        subject,
        predicate
      })
    })

    afterAll(clearStore)

    it('creates an element', () => {
      expect(tabWidgetElement.tagName).toEqual('DIV')
      // Wanted to do the next line, but it does not work since
      // tabWidgetElement is actually a subclass of HTMLDivElement
      // expect(tabWidgetElement).toBeInstanceOf(HTMLDivElement)
    })

    it('sets up two tabs', () => {
      expect(tabWidgetElement.tabContainer.children.length).toBe(2)
    })

    it('renders tabs with label for items', () => {
      expect(tabWidgetElement.tabContainer.children[0].children[0].innerHTML).toEqual(label(item1))
    })

    it('renders content for first tab', () => {
      expect(tabWidgetElement.bodyContainer).toMatchSnapshot()
    })

    it('renders content for second tab when it is clicked', () => {
      const firstBody = { ...tabWidgetElement.bodyContainer }
      tabWidgetElement.tabContainer.children[1].children[0].click()
      expect(tabWidgetElement.bodyContainer).not.toEqual(firstBody)
    })

    describe('bodyContainer', () => {
      it('adds property bodyContainer', () => {
        expect(tabWidgetElement.bodyContainer).toBe(tabWidgetElement.querySelector('main'))
      })
    })

    describe('refresh', () => {
      it('adds method refresh on element', () => {
        expect(tabWidgetElement.refresh).toBeInstanceOf(Function)
      })

      it('sorts tabs if needed', () => {
        const reversedTabs = Array.from(tabWidgetElement.tabContainer.children).reverse()
        tabWidgetElement.tabContainer.innerHTML = ''
        reversedTabs.forEach(tab => tabWidgetElement.tabContainer.appendChild(tab))
        expect(tabWidgetElement.tabContainer.children[0]).toBe(reversedTabs[0])

        tabWidgetElement.refresh()

        expect(tabWidgetElement.tabContainer.children[0]).not.toBe(reversedTabs[0])
      })
    })

    describe('tabContainer', () => {
      it('adds property tabContainer', () => {
        expect(tabWidgetElement.tabContainer).toBe(tabWidgetElement.querySelector('nav > ul'))
      })
    })
  })

  describe('option items', () => {
    beforeEach(() => {
      tabWidgetElement = tabs.tabWidget({
        dom,
        subject,
        items: [item1, item2, item3]
      })
    })

    it('sets up two tabs', () => {
      expect(tabWidgetElement.tabContainer.children.length).toBe(3)
    })
  })

  describe('option backgroundColor', () => {
    it('sets colors for body and tabs', () => {
      tabWidgetElement = tabs.tabWidget({ backgroundColor: '#ff0000', ...minimalOptions })
      expect(tabWidgetElement.tabContainer.querySelector('[style]').style['background-color']).toEqual('rgb(178, 0, 0)')
      expect(tabWidgetElement.tabContainer.querySelector('[style]').style.color).toEqual('rgb(255, 255, 255)')
      expect(tabWidgetElement.bodyContainer.querySelector('main').style['border-color']).toEqual('#b20000')
    })

    it('considers lighter colors and set color of text accordingly', () => {
      tabWidgetElement = tabs.tabWidget({ backgroundColor: '#ffffff', ...minimalOptions })
      expect(tabWidgetElement.tabContainer.querySelector('[style]').style.color).toEqual('rgb(0, 0, 0)')
    })
  })

  describe('option onClose', () => {
    let onCloseSpy

    beforeEach(() => {
      onCloseSpy = jest.fn(() => null)
      tabWidgetElement = tabs.tabWidget({ onClose: onCloseSpy, ...minimalOptions })
    })

    it('creates an extra tab with a button', () => {
      expect(tabWidgetElement.tabContainer.children.length).toBe(3)
      expect(tabWidgetElement.tabContainer.querySelector('li:last-child > button')).toBeDefined()
    })

    it('triggers onClose when button in extra tab is closed', () => {
      tabWidgetElement.tabContainer.querySelector('li:last-child > button').click()
      expect(onCloseSpy).toHaveBeenCalled()
    })
  })

  describe('option ordered', () => {
    afterAll(clearStore)

    it('allows for tabs to be fetched from triples instead of a collection', () => {
      const predicate = meeting('toolList')
      store.add(subject, predicate, item1, subject.doc())
      store.add(subject, predicate, item2, subject.doc())
      store.add(subject, predicate, item3, subject.doc())

      tabWidgetElement = tabs.tabWidget({
        dom,
        subject,
        predicate,
        ordered: false
      })

      expect(tabWidgetElement.tabContainer.children.length).toBe(3)
    })
  })

  describe('option orientation', () => {
    it('uses flex to position tabs and container', () => {
      tabWidgetElement = tabs.tabWidget(minimalOptions)
      expect(tabWidgetElement.style.display).toEqual('flex')
    })
    it('positions tabs on top by default', () => {
      tabWidgetElement = tabs.tabWidget(minimalOptions)
      expect(tabWidgetElement.style['flex-direction']).toEqual('column')
    })

    it('can position tabs on right', () => {
      tabWidgetElement = tabs.tabWidget({ orientation: '1', ...minimalOptions })
      expect(tabWidgetElement.style['flex-direction']).toEqual('row')
    })

    it('can position tabs on bottom', () => {
      tabWidgetElement = tabs.tabWidget({ orientation: '2', ...minimalOptions })
      expect(tabWidgetElement.style['flex-direction']).toEqual('column-reverse')
    })

    it('can position tabs on left', () => {
      tabWidgetElement = tabs.tabWidget({ orientation: '3', ...minimalOptions })
      expect(tabWidgetElement.style['flex-direction']).toEqual('row-reverse')
    })
  })

  describe('option renderMain', () => {
    it('allows overriding what is rendered in container', () => {
      const renderMainSpy = jest.fn((bodyMain: HTMLElement, subject: NamedNode) => {
        expect(subject).toBe(item1)
      })
      tabWidgetElement = tabs.tabWidget({ renderMain: renderMainSpy, ...minimalOptions })
      expect(renderMainSpy).toHaveBeenCalled()
    })
  })

  describe('option renderTab', () => {
    it('allows overriding what is rendered in tab', () => {
      const renderTabSpy = jest.fn((div: HTMLElement, item: NamedNode) => {
        div.innerHTML = item.uri
      })
      tabWidgetElement = tabs.tabWidget({ renderTab: renderTabSpy, ...minimalOptions })
      expect(tabWidgetElement.tabContainer.children[0].children[0].innerHTML).toEqual(item1.uri)
    })
  })

  describe('renderTabSettings', () => {
    it('allows overriding what is rendered in container when alt+clicking on tab', () => {
      const renderTabSettingsSpy = jest.fn((bodyMain: HTMLElement, subject: NamedNode) => {
        expect(subject).toBe(item2)
      })
      tabWidgetElement = tabs.tabWidget({ renderTabSettings: renderTabSettingsSpy, ...minimalOptions })
      const event = new window.Event('click');
      (event as any).altKey = true // a bit of a hack, but works
      tabWidgetElement.tabContainer.children[1].children[0].dispatchEvent(event)
      expect(renderTabSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('option selectedTab', () => {
    it('allows you to choose which tab should be focused upon initiating the widget', () => {
      const renderTab = (div, subject) => {
        div.dataset.name = subject.uri
      }
      const renderMain = (bodyMain: HTMLElement, subject: NamedNode) => expect(subject).toBe(item2)
      tabWidgetElement = tabs.tabWidget({
        renderMain,
        renderTab,
        selectedTab: item2.uri,
        ...minimalOptions
      })
    })
  })

  describe('option startEmpty', () => {
    it('will not render the main container if set to true', () => {
      const renderMainSpy = jest.fn()
      tabWidgetElement = tabs.tabWidget({ renderMain: renderMainSpy, startEmpty: true, ...minimalOptions })
      expect(renderMainSpy).not.toHaveBeenCalled()
    })
  })
})
