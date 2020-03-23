import { JSDOM } from 'jsdom'

import {
  makeDropTarget,
  makeDraggable,
  uploadFiles
} from '../../../src/widgets/dragAndDrop'
import { fetcher } from 'rdflib'

jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document
const element = dom.createElement('div')

describe('makeDropTarget', () => {
  it('exists', () => {
    expect(makeDropTarget).toBeInstanceOf(Function)
  })
  it('runs', () => {
    const handler = () => {}
    expect(makeDropTarget(element, handler, handler)).toEqual(undefined)
  })
  it.skip('returns undefined when given an element ', () => {
    const element = document.createElement('textarea')
    const handler = () => {}
    makeDropTarget(element, handler, handler)
    const event = document.createEvent('HTMLEvents')
    // debug.log(event)
    event.initEvent('dragover', true, true)
    // event.dataTransfer = () => {}
    // element.dispatchEvent(event)
    expect(element.dispatchEvent(event)).toReturn()
    // debugger
    // const event = new window.DragEvent
    //  window.dispatchEvent(event)
    expect(makeDropTarget(element, handler, handler)).toMatchInlineSnapshot(
      'undefined'
    )
  })
})

describe('makeDraggable', () => {
  it('exists', () => {
    expect(makeDraggable).toBeInstanceOf(Function)
  })
  it('runs', () => {
    const tr = element
    const obj = {}
    expect(makeDraggable(tr, obj)).toEqual(undefined)
  })
})

describe('uploadFiles', () => {
  it('exists', () => {
    expect(uploadFiles).toBeInstanceOf(Function)
  })
  it('runs', () => {
    const files = []
    const fileBase = ''
    const imageBase = ''
    const successHandler = () => {}
    expect(
      uploadFiles(fetcher, files, fileBase, imageBase, successHandler)
    ).toEqual(undefined)
  })
})
