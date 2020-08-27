import { silenceDebugMessages } from '../../helpers/setup'
import { JSDOM } from 'jsdom'
import {
  makeDropTarget,
  makeDraggable,
  uploadFiles
} from '../../../src/widgets/dragAndDrop'
import { fetcher } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('draganddropWidget', () => {
  const element = dom.createElement('div')
  const handler = () => { }
  describe('makeDropTarget', () => {
    it('makeDropTarget is exposed on public API', () => {
      expect(makeDropTarget).toBe(makeDropTarget)
    })
    makeDropTarget(element, handler, handler)
    const event = dom.createEvent(new CustomEvent('DragEvent'))
    event.initEvent('dragover')
    element.dispatchEvent(event)
  })
  describe('makeDraggable', () => {
    it('makeDraggable is exposed on public API', () => {
      expect(makeDraggable).toBe(makeDraggable)
    })
  })
  describe('uploadFiles', () => {
    it('uploadFiles is exposed on public API', () => {
      expect(uploadFiles).toBe(uploadFiles)
    })
  })
})
/*
describe('makeDropTarget', () => {

  it('runs', () => {
    const handler = () => { }
    expect(makeDropTarget(element, handler, handler)).toEqual(undefined)
  })
  it.skip('returns undefined when given an element ', () => {
    const element = document.createElement('textarea')
    const handler = () => { }
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
    const successHandler = () => { }
    expect(
      uploadFiles(fetcher, files, fileBase, imageBase, successHandler)
    ).toEqual(undefined)
  })
}) */
