import { silenceDebugMessages } from '../../../helpers/setup'
import ns from '../../../../src/ns'
import { fieldParams } from '../../../../src/widgets/forms/fieldParams'

silenceDebugMessages()

describe('fieldParams', () => {
  it('exists', () => {
    expect(fieldParams).toBeTruthy()
  })
})

describe('ColorField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('ColorField').uri]).toBeTruthy()
  })
})

describe('DateField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('DateField').uri]).toBeTruthy()
  })
})

describe('DateTimeField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('DateTimeField').uri]).toBeTruthy()
  })
})

describe('TimeField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('TimeField').uri]).toBeTruthy()
  })
})

describe('IntegerField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('IntegerField').uri]).toBeTruthy()
  })
})

describe('DecimalField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('DecimalField').uri]).toBeTruthy()
  })
})

describe('FloatField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('FloatField').uri]).toBeTruthy()
  })
})

describe('SingleLineTextField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('SingleLineTextField').uri]).toBeTruthy()
  })
})

describe('NamedNodeURIField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('NamedNodeURIField').uri]).toBeTruthy()
  })
})

describe('TextField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('TextField').uri]).toBeTruthy()
  })
})

describe('PhoneField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('PhoneField').uri]).toBeTruthy()
  })
})

describe('EmailField params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('EmailField').uri]).toBeTruthy()
  })
})

describe('Comment params', () => {
  it('exists', () => {
    expect(fieldParams[ns.ui('Comment').uri]).toBeTruthy()
  })
})
