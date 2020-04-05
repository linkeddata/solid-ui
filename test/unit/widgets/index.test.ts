import { silenceDebugMessages } from '../../helpers/setup'
import * as DragAndDrop from '../../../src/widgets/dragAndDrop'
import * as Error from '../../../src/widgets/error'
import * as Buttons from '../../../src/widgets/buttons'
import * as Forms from '../../../src/widgets/forms'
import * as PeoplePicker from '../../../src/widgets/peoplePicker'
import * as Index from '../../../src/widgets/index'

silenceDebugMessages()

jest.mock('solid-auth-client')

describe('index', () => {
  it('contains all exports from DragAndDrop', () => {
    for (const k in DragAndDrop) {
      if (k !== 'default') {
        expect(Index[k]).toEqual(DragAndDrop[k])
      }
    }
  })
  it('contains all exports from Error', () => {
    for (const k in Error) {
      if (k !== 'default') {
        expect(Index[k]).toEqual(Error[k])
      }
    }
  })
  it('contains all exports from Buttons', () => {
    for (const k in Buttons) {
      if (k !== 'default') {
        expect(Index[k]).toEqual(Buttons[k])
      }
    }
  })
  it('contains all exports from Forms', () => {
    for (const k in Forms) {
      if (k !== 'default') {
        expect(Index[k]).toEqual(Forms[k])
      }
    }
  })
  it('contains all exports from PeoplePicker', () => {
    for (const k in PeoplePicker) {
      if (k !== 'default') {
        expect(Index[k]).toEqual(PeoplePicker[k])
      }
    }
  })
})
