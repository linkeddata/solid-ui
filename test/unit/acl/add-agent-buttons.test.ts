import { silenceDebugMessages } from '../../helpers/setup'
import { AddAgentButtons } from '../../../src/acl/add-agent-buttons'
import { instantiateAccessGroups } from '../helpers/instantiateAccessGroups'
import { JSDOM } from 'jsdom'
import store from '../../../src/store'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document

function instantiateAddAgentButtons () {
  const groupList = instantiateAccessGroups(dom, store)
  return new AddAgentButtons(groupList)
}

function getButtonName (element: HTMLElement): string {
  expect(element.tagName).toEqual('BUTTON')
  expect((element.childNodes[0] as HTMLElement).tagName).toEqual('IMG')
  return (element.childNodes[0] as HTMLImageElement).title
}

describe('AddAgentButtons', () => {
  it('exists', () => {
    expect(AddAgentButtons).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(instantiateAddAgentButtons()).toBeInstanceOf(Object)
  })
})

describe('AddAgentButtons#render', () => {
  it('exists', () => {
    expect(instantiateAddAgentButtons().render).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(instantiateAddAgentButtons().render()).toBeInstanceOf(Object)
  })
})

describe('AgentButtons', () => {
  let agentButtons: any
  beforeEach(() => {
    agentButtons = instantiateAddAgentButtons().render()
  })
  it('exists', () => {
    expect(agentButtons.constructor).toBeTruthy()
    expect(agentButtons.childNodes.length).toEqual(2)
  })
  it('contains an add button', () => {
    expect(getButtonName(agentButtons.childNodes[0])).toEqual('Add ...')
  })
  it('contains a bar element', () => {
    expect(agentButtons.childNodes[1].tagName).toEqual('DIV')
    expect(agentButtons.childNodes[1].innerHTML).toEqual('')
  })
})

const barButtons = [
  'Add Person',
  'Add Group',
  'Add Everyone',
  'Anyone logged In',
  'A Software Agent (bot)',
  'A Web App (origin)'
]

describe('When add button is clicked', () => {
  let bar: any
  beforeEach(() => {
    const agentButtons = instantiateAddAgentButtons().render()
    const addButton = agentButtons.childNodes[0] as HTMLButtonElement
    addButton.click()
    bar = agentButtons.childNodes[1] as HTMLDivElement
  })
  it('bar is filled', () => {
    expect(bar.childNodes.length).toEqual(barButtons.length)
  })
  for (let i = 0; i < barButtons.length; i++) {
    it(`Bar contains a "${barButtons[i]}" button`, () => {
      expect(getButtonName(bar.childNodes[i])).toEqual(barButtons[i])
    })
  }
})

describe('When "Add Person" button is clicked', () => {
  let bar
  const buttonIndex = 0
  beforeEach(() => {
    const agentButtons = instantiateAddAgentButtons().render()
    const addButton = agentButtons.childNodes[0] as HTMLButtonElement
    addButton.click()
    bar = agentButtons.childNodes[1] as HTMLDivElement
    const buttonToClick = bar.childNodes[buttonIndex] as HTMLButtonElement
    buttonToClick.click()
  })
  it('bar is simplified', () => {
    // expect(bar.childNodes.length).toEqual(1) ???
    expect(bar.childNodes.length).toEqual(2)
  })
  it('Bar still contains the button that was clicked', () => {
    expect(getButtonName(bar.childNodes[0])).toEqual(barButtons[buttonIndex])
  })
  it('Bar now contains askName form', () => {
    expect(bar.childNodes[1].tagName).toEqual('DIV')
  })
})

describe('When "Add Group" button is clicked', () => {
  let bar
  const buttonIndex = 1
  beforeEach(() => {
    const agentButtons = instantiateAddAgentButtons().render()
    const addButton = agentButtons.childNodes[0] as HTMLButtonElement
    addButton.click()
    bar = agentButtons.childNodes[1] as HTMLDivElement
    const buttonToClick = bar.childNodes[buttonIndex] as HTMLButtonElement
    buttonToClick.click()
  })
  it('bar is simplified', () => {
    expect(bar.childNodes.length).toEqual(2)
  })
  it('Bar still contains the button that was clicked', () => {
    expect(getButtonName(bar.childNodes[0])).toEqual(barButtons[buttonIndex])
  })
  it('Bar now contains askName form', () => {
    expect(bar.childNodes[1].tagName).toEqual('DIV')
  })
})

describe('When "Add Bot" button is clicked', () => {
  let bar
  const buttonIndex = 4
  beforeEach(() => {
    const agentButtons = instantiateAddAgentButtons().render()
    const addButton = agentButtons.childNodes[0] as HTMLButtonElement
    addButton.click()
    bar = agentButtons.childNodes[1] as HTMLDivElement
    const buttonToClick = bar.childNodes[buttonIndex] as HTMLButtonElement
    buttonToClick.click()
  })
  it('bar is simplified', () => {
    expect(bar.childNodes.length).toEqual(2)
  })
  it('Bar still contains the button that was clicked', () => {
    expect(getButtonName(bar.childNodes[0])).toEqual(barButtons[buttonIndex])
  })
  it('Bar now contains askName form', () => {
    expect(bar.childNodes[1].tagName).toEqual('DIV')
  })
})
describe('When "Add App" button is clicked', () => {
  let bar
  const buttonIndex = 5
  beforeEach(() => {
    const agentButtons = instantiateAddAgentButtons().render()
    const addButton = agentButtons.childNodes[0] as HTMLButtonElement
    addButton.click()
    bar = agentButtons.childNodes[1] as HTMLDivElement
    const buttonToClick = bar.childNodes[buttonIndex] as HTMLButtonElement
    buttonToClick.click()
  })
  it('bar is simplified', () => {
    expect(bar.childNodes.length).toEqual(3)
    // Adds a third element to list, for reason I cannot understand - This does
    // not happen when I "manually test" it, ie run it in the browser
    // https://github.com/solid/solid-ui/issues/236
  })
  it('Bar still contains the button that was clicked', () => {
    expect(getButtonName(bar.childNodes[0])).toEqual(barButtons[buttonIndex])
  })
  it('Bar now contains apss table', () => {
    expect(bar.childNodes[1].tagName).toEqual('DIV')
  })
})
