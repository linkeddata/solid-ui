import ns from '../../ns'
import { formHeadingColor } from '../../style'

export type FieldParamsObject = {
  size?: number, // input element size attribute
  type?: string, // input element type attribute. Default: 'text' (not for Comment and Heading)
  element?: string, // element type to use (Comment and Heading only)
  style?: string, // style to use
  dt?: string, // xsd data type for the RDF Literal corresponding to the field value. Default: xsd:string
  uriPrefix?: string, // e.g. 'mailto:', will be removed when displaying value to user. Overrides dt.
  namedNode?: boolean, // if true, field value corresponds to the URI of an RDF NamedNode. Overrides dt and uriPrefix.
  pattern?: RegExp // for client-side input validation; field will go red if violated, green if ok
}

/**
 * The fieldParams object defines various constants
 * for use in various form fields. Depending on the
 * field in questions, different values may be read
 * from here.
 */
export const fieldParams: { [ fieldUri: string ]: FieldParamsObject } = {
  /**
   * Text field
   *
   * For possible date popups see e.g. http://www.dynamicdrive.com/dynamicindex7/jasoncalendar.htm
   * or use HTML5: http://www.w3.org/TR/2011/WD-html-markup-20110113/input.date.html
   */
  [ns.ui('ColorField').uri]: {
    size: 9,
    type: 'color',
    dt: 'color',
    pattern: /^\s*#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]([0-9a-f][0-9a-f])?\s*$/
  }, // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color

  [ns.ui('DateField').uri]: {
    size: 20,
    type: 'date',
    dt: 'date',
    pattern: /^\s*[0-9][0-9][0-9][0-9](-[0-1]?[0-9]-[0-3]?[0-9])?Z?\s*$/
  },

  [ns.ui('DateTimeField').uri]: {
    size: 20,
    type: 'date',
    dt: 'dateTime',
    pattern: /^\s*[0-9][0-9][0-9][0-9](-[0-1]?[0-9]-[0-3]?[0-9])?(T[0-2][0-9]:[0-5][0-9](:[0-5][0-9])?)?Z?\s*$/
  },

  [ns.ui('TimeField').uri]: {
    size: 10,
    type: 'time',
    dt: 'time',
    pattern: /^\s*([0-2]?[0-9]:[0-5][0-9](:[0-5][0-9])?)\s*$/
  },

  [ns.ui('IntegerField').uri]: {
    size: 12,
    style: 'text-align: right',
    dt: 'integer',
    pattern: /^\s*-?[0-9]+\s*$/
  },

  [ns.ui('DecimalField').uri]: {
    size: 12,
    style: 'text-align: right',
    dt: 'decimal',
    pattern: /^\s*-?[0-9]*(\.[0-9]*)?\s*$/
  },

  [ns.ui('FloatField').uri]: {
    size: 12,
    style: 'text-align: right',
    dt: 'float',
    pattern: /^\s*-?[0-9]*(\.[0-9]*)?((e|E)-?[0-9]*)?\s*$/
  },

  [ns.ui('SingleLineTextField').uri]: {

  },
  [ns.ui('NamedNodeURIField').uri]: {
    namedNode: true
  },
  [ns.ui('TextField').uri]: {

  },

  [ns.ui('PhoneField').uri]: {
    size: 20,
    uriPrefix: 'tel:',
    pattern: /^\+?[\d-]+[\d]*$/
  },

  [ns.ui('EmailField').uri]: {
    size: 30,
    uriPrefix: 'mailto:',
    pattern: /^\s*.*@.*\..*\s*$/ // @@ Get the right regexp here
  },

  /**
   * Non-interactive fields
   */
  [ns.ui('Comment').uri]: {
    element: 'p',
    style: `padding: 0.1em 1.5em; color: ${formHeadingColor}; white-space: pre-wrap;`
  },
  [ns.ui('Heading').uri]: {
    element: 'h3',
    style: `font-size: 110%; color: ${formHeadingColor};`
  }
}
