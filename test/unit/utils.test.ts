import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import {
  addLoadEvent, // not used anywhere
  AJARImage,
  ancestor,
  beep,
  clearVariableNames,
  emptyNode,
  escapeForXML,
  findPos,
  genUuid,
  getAbout,
  getEyeFocus,
  getTarget,
  getTerm,
  hashColor,
  include,
  label,
  labelForXML,
  labelWithOntology,
  newVariableName,
  ontologyLabel,
  predicateLabelForXML,
  predParentOf,
  RDFComparePredicateObject,
  RDFComparePredicateSubject,
  shortName,
  stackString,
  syncTableToArray,
  syncTableToArrayReOrdered
} from '../../src/utils'
import { sym } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('addLoadEvent', () => {
  it('exists', () => {
    expect(addLoadEvent).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(addLoadEvent()).toEqual(undefined)
  })
})

describe('AJARImage', () => {
  it('exists', () => {
    expect(AJARImage).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(AJARImage()).toBeTruthy()
  })
})

describe('ancestor', () => {
  it('exists', () => {
    expect(ancestor).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(ancestor()).toEqual(undefined)
  })
})

describe('beep', () => {
  it('exists', () => {
    expect(beep).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(beep()).toEqual(undefined)
  })
})

describe('clearVariableNames', () => {
  it('exists', () => {
    expect(clearVariableNames).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(clearVariableNames()).toEqual(undefined)
  })
})

describe('emptyNode', () => {
  it('exists', () => {
    expect(emptyNode).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(emptyNode({ childNodes: [] })).toBeTruthy()
  })
})

describe('escapeForXML', () => {
  it('exists', () => {
    expect(escapeForXML).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(escapeForXML('')).toEqual('')
  })
})

describe('findPos', () => {
  it('exists', () => {
    expect(findPos).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(findPos({
      ownerDocument: {
        documentElement: dom
      }
    })).toBeTruthy()
  })
})

describe('genUuid', () => {
  it('exists', () => {
    expect(genUuid).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(genUuid()).toBeTruthy()
  })
})

describe('getAbout', () => {
  it('exists', () => {
    expect(getAbout).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(getAbout()).toEqual(undefined)
  })
})

describe('getEyeFocus', () => {
  it('exists', () => {
    expect(getEyeFocus).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(getEyeFocus({
      ownerDocument: {
        documentElement: dom
      }
    })).toBeTruthy()
  })
})

describe('getTarget', () => {
  it('exists', () => {
    expect(getTarget).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(getTarget({ target: {} })).toBeTruthy()
  })
})

describe('getTerm', () => {
  it('exists', () => {
    expect(getTerm).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(getTerm({ parentNode: {} })).toEqual(undefined)
  })
})

describe('hashColor', () => {
  it('exists', () => {
    expect(hashColor).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(hashColor(sym('https://test.test'))).toBeTruthy()
  })
})

describe('include', () => {
  it('exists', () => {
    expect(include).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(include(dom, '')).toBeTruthy()
  })
})

describe('label', () => {
  it('exists', () => {
    expect(label).toBeInstanceOf(Function)
  })
  it.skip('runs', () => { // write this properly when cleaning up utils
    expect(label()).toEqual('')
  })
})

describe('labelForXML', () => {
  it('exists', () => {
    expect(labelForXML).toBeInstanceOf(Function)
  })
  it.skip('runs', () => { // write this properly when cleaning up utils
    expect(labelForXML()).toEqual('')
  })
})

describe('labelWithOntology', () => {
  it('exists', () => {
    expect(labelWithOntology).toBeInstanceOf(Function)
  })
  it.skip('runs', () => { // write this properly when cleaning up utils
    expect(labelWithOntology()).toEqual('')
  })
})

describe('newVariableName', () => {
  it('exists', () => {
    expect(newVariableName).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(newVariableName()).toBeTruthy()
  })
})

describe('ontologyLabel', () => {
  it('exists', () => {
    expect(ontologyLabel).toBeInstanceOf(Function)
  })
  it.skip('runs', () => { // write this properly when cleaning up utils
    expect(ontologyLabel(sym('https://test.test'))).toEqual('uri?!')
  })
})

describe('predicateLabelForXML', () => {
  it('exists', () => {
    expect(predicateLabelForXML).toBeInstanceOf(Function)
  })
  it.skip('runs', () => { // write this properly when cleaning up utils
    expect(predicateLabelForXML(sym('https://test.test/#test'))).toEqual('test')
  })
})

describe('predParentOf', () => {
  it('exists', () => {
    expect(predParentOf).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(predParentOf()).toBeTruthy()
  })
})

describe('RDFComparePredicateObject', () => {
  it('exists', () => {
    expect(RDFComparePredicateObject).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(RDFComparePredicateObject()).toBeTruthy()
  })
})

describe('RDFComparePredicateSubject', () => {
  it('exists', () => {
    expect(RDFComparePredicateSubject).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(RDFComparePredicateSubject()).toBeTruthy()
  })
})

describe('shortName', () => {
  it('exists', () => {
    expect(shortName).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    // FIXME see https://github.com/solid/solid-ui/issues/194
    expect(shortName('a')).toBeTruthy()
  })
})

describe('stackString', () => {
  it('exists', () => {
    expect(stackString).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(stackString({
      stack: {
        toString () {
          return 'bla'
        }
      }
    })).toBeTruthy()
  })
})

describe('syncTableToArray', () => {
  it('exists', () => {
    expect(syncTableToArray).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(syncTableToArray({
      children: []
    }, [], () => {})).toEqual(undefined)
  })
})

describe('syncTableToArrayReOrdered', () => {
  it('exists', () => {
    expect(syncTableToArrayReOrdered).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(syncTableToArrayReOrdered({
      children: []
    }, [], () => {})).toEqual(undefined)
  })
})
