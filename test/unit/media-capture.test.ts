import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import { cameraCaptureControl, cameraButton } from '../../src/media-capture'
import { graph } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('cameraCaptureControl', () => {
  it('exists', () => {
    expect(cameraCaptureControl).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(() => {
      cameraCaptureControl(
        dom,
        graph(),
        () => {},
        () => {}
      )
    }).toThrowError('navigator.mediaDevices not available')
  })
})

describe('cameraButton', () => {
  it('exists', () => {
    expect(cameraButton).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(cameraButton(
      dom,
      graph(),
      () => {},
      () => {}
    )).toBeTruthy()
  })
})
