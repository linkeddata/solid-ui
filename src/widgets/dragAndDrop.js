/* Drag and drop common functionality
 */
import * as debug from '../debug'

const mime = require('mime-types')

/* global FileReader alert */
module.exports = {
  makeDropTarget: makeDropTarget,
  makeDraggable: makeDraggable,
  uploadFiles: uploadFiles
}
// const UI = require('../index.js') // this package

function makeDropTarget (ele, droppedURIHandler, droppedFileHandler) {
  var dragoverListener = function (e) {
    e.preventDefault() // Neeed else drop does not work [sic]
    e.dataTransfer.dropEffect = 'copy'
  }

  var dragenterListener = function (e) {
    debug.log('dragenter event dropEffect: ' + e.dataTransfer.dropEffect)
    if (this.style) {
      //  necessary not sure when
      if (!this.savedStyle) {
        this.savedStyle = {}
        this.savedStyle.border = this.style.border
        this.savedStyle.backgroundColor = this.style.backgroundColor
        this.savedStyle.borderRadius = this.style.borderRadius
      }
      this.style.backgroundColor = '#ccc'
      this.style.border = '0.25em dashed black'
      this.style.borderRadius = '0.3em'
    }

    e.dataTransfer.dropEffect = 'link'
    debug.log('dragenter event dropEffect 2: ' + e.dataTransfer.dropEffect)
  }
  var dragleaveListener = function (e) {
    debug.log('dragleave event dropEffect: ' + e.dataTransfer.dropEffect)
    if (this.savedStyle) {
      this.style.border = this.savedStyle.border
      this.style.backgroundColor = this.savedStyle.backgroundColor
      this.style.borderRadius = this.savedStyle.borderRadius
    } else {
      this.style.backgroundColor = 'white'
      this.style.border = '0em solid black'
    }
  }

  var dropListener = function (e) {
    if (e.preventDefault) e.preventDefault() // stops the browser from redirecting off to the text.
    debug.log('Drop event. dropEffect: ' + e.dataTransfer.dropEffect)
    debug.log(
      'Drop event. types: ' +
        (e.dataTransfer.types ? e.dataTransfer.types.join(', ') : 'NOPE')
    )

    var uris = null
    var text
    if (e.dataTransfer.types) {
      for (var t = 0; t < e.dataTransfer.types.length; t++) {
        var type = e.dataTransfer.types[t]
        if (type === 'text/uri-list') {
          uris = e.dataTransfer.getData(type).split('\n') // @ ignore those starting with #
          debug.log('Dropped text/uri-list: ' + uris)
        } else if (type === 'text/plain') {
          text = e.dataTransfer.getData(type)
        } else if (type === 'Files' && droppedFileHandler) {
          var files = e.dataTransfer.files // FileList object.
          for (let i = 0; files[i]; i++) {
            const f = files[i]
            debug.log(
              'Filename: ' +
                f.name +
                ', type: ' +
                (f.type || 'n/a') +
                ' size: ' +
                f.size +
                ' bytes, last modified: ' +
                (f.lastModifiedDate
                  ? f.lastModifiedDate.toLocaleDateString()
                  : 'n/a')
            )
          }
          droppedFileHandler(files)
        }
      }
      if (uris === null && text && text.slice(0, 4) === 'http') {
        uris = text
        debug.log("Waring: Poor man's drop: using text for URI") // chrome disables text/uri-list??
      }
    } else {
      // ... however, if we're IE, we don't have the .types property, so we'll just get the Text value
      uris = [e.dataTransfer.getData('Text')]
      debug.log('WARNING non-standard drop event: ' + uris[0])
    }
    debug.log('Dropped URI list (2): ' + uris)
    if (uris) {
      droppedURIHandler(uris)
    }
    this.style.backgroundColor = 'white' // restore style
    return false
  } // dropListener

  var addTargetListeners = function (ele) {
    if (!ele) {
      debug.log('@@@ addTargetListeners: ele ' + ele)
    }
    ele.addEventListener('dragover', dragoverListener)
    ele.addEventListener('dragenter', dragenterListener)
    ele.addEventListener('dragleave', dragleaveListener)
    ele.addEventListener('drop', dropListener)
  }
  addTargetListeners(ele, droppedURIHandler)
} // listen for dropped URIs

// Make an HTML element draggable as a URI-identified thing
//
// Possibly later set the drag image too?
//
function makeDraggable (tr, obj) {
  tr.setAttribute('draggable', 'true') // Stop the image being dragged instead - just the TR

  tr.addEventListener(
    'dragstart',
    function (e) {
      tr.style.fontWeight = 'bold'
      e.dataTransfer.setData('text/uri-list', obj.uri)
      e.dataTransfer.setData('text/plain', obj.uri)
      e.dataTransfer.setData('text/html', tr.outerHTML)
      debug.log(
        'Dragstart: ' + tr + ' -> ' + obj + 'de: ' + e.dataTransfer.dropEffect
      )
    },
    false
  )

  tr.addEventListener(
    'drag',
    function (e) {
      e.preventDefault()
      e.stopPropagation()
      // debug.log('Drag: dropEffect: ' + e.dataTransfer.dropEffect)
    },
    false
  )

  tr.addEventListener(
    'dragend',
    function (e) {
      tr.style.fontWeight = 'normal'
      debug.log('Dragend dropeffect: ' + e.dataTransfer.dropEffect)
      debug.log('Dragend: ' + tr + ' -> ' + obj)
    },
    false
  )
}

/* uploadFiles
 **
 **  Generic uploader of local files to the web
 **   typically called from dropped file handler
 ** Params
 **  fetcher   instance of class Fetcher as in kb.fetcher
 **  files      Array of file objects
 **  fileBase   URI of folder in which to put files (except images) (no trailing slash)
 **  imageBase  URI of folder in which to put images
 **  successHandler(file, uploadedURI)    Called after each success upload
 **                              With file object an final URI as params
 */
function uploadFiles (fetcher, files, fileBase, imageBase, successHandler) {
  for (var i = 0; files[i]; i++) {
    const f = files[i]
    debug.log(
      ' dropped: Filename: ' +
        f.name +
        ', type: ' +
        (f.type || 'n/a') +
        ' size: ' +
        f.size +
        ' bytes, last modified: ' +
        (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a')
    ) // See e.g. https://www.html5rocks.com/en/tutorials/file/dndfiles/

    // @@ Add: progress bar(s)
    var reader = new FileReader()
    reader.onload = (function (theFile) {
      return function (e) {
        var data = e.target.result
        var suffix = ''
        debug.log(' File read byteLength : ' + data.byteLength)
        var contentType = theFile.type
        if (!theFile.type || theFile.type === '') {
          // Not known by browser
          contentType = mime.lookup(theFile.name)
          if (!contentType) {
            const msg =
              'Filename needs to have an extension which gives a type we know: ' +
              theFile.name
            debug.log(msg)
            alert(msg)
            throw new Error(msg)
          }
        } else {
          var extension = mime.extension(theFile.type)
          if (theFile.type !== mime.lookup(theFile.name)) {
            suffix = '_.' + extension
            debug.log('MIME TYPE MISMATCH -- adding extension: ' + suffix)
          }
        }
        var folderName = theFile.type.startsWith('image/')
          ? imageBase || fileBase
          : fileBase
        var destURI =
          folderName +
          (folderName.endsWith('/') ? '' : '/') +
          encodeURIComponent(theFile.name) +
          suffix

        fetcher
          .webOperation('PUT', destURI, {
            data: data,
            contentType: contentType
          })
          .then(
            _response => {
              debug.log(' Upload: put OK: ' + destURI)
              successHandler(theFile, destURI)
            },
            error => {
              const msg = ' Upload: FAIL ' + destURI + ', Error: ' + error
              debug.log(msg)
              alert(msg)
              throw new Error(msg)
            }
          )
      }
    })(f)
    reader.readAsArrayBuffer(f)
  }
}
