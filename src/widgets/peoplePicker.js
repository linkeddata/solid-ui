/**
 *
 * People Picker Pane
 *
 * This pane offers a mechanism for selecting a set of individuals, groups, or
 * organizations to take some action on.
 *
 * Assumptions
 *   - Assumes that the user has a type index entry for vcard:AddressBook.
 *
 */
import escape from 'escape-html'
import uuid from 'node-uuid'
import * as rdf from 'rdflib'
import * as debug from '../debug'

// const webClient = require('solid-web-client')(rdf)

import { makeDropTarget } from './dragAndDrop'
import { errorMessageBlock } from './error'
import { iconBase } from '../iconBase'
import ns from '../ns'
import kb from '../store'

export class PeoplePicker {
  constructor (element, typeIndex, groupPickedCb, options) {
    this.options = options || {}
    this.element = element
    this.typeIndex = typeIndex
    this.groupPickedCb = groupPickedCb
    this.selectedgroup = this.options.selectedgroup // current selected group if any
    this.onSelectGroup = this.onSelectGroup.bind(this)
  }

  render () {
    const container = document.createElement('div')
    container.style.maxWidth = '350px'
    container.style.minHeight = '200px'
    container.style.outline = '1px solid black'
    container.style.display = 'flex'

    if (this.selectedgroup) {
      container.style.flexDirection = 'column'
      const selectedGroup = document.createElement('div')
      new Group(selectedGroup, this.selectedgroup).render()
      const changeGroupButton = document.createElement('button')
      changeGroupButton.textContent = escape('Change group')
      changeGroupButton.addEventListener('click', _event => {
        this.selectedgroup = null
        this.render()
      })
      container.appendChild(selectedGroup)
      container.appendChild(changeGroupButton)
    } else {
      this.findAddressBook(this.typeIndex)
        .then(({ book }) => {
          const chooseExistingGroupButton = document.createElement('button')
          chooseExistingGroupButton.textContent = escape(
            'Pick an existing group'
          )
          chooseExistingGroupButton.style.margin = 'auto'
          chooseExistingGroupButton.addEventListener('click', _event => {
            new GroupPicker(container, book, this.onSelectGroup).render()
          })

          const createNewGroupButton = document.createElement('button')
          createNewGroupButton.textContent = escape('Create a new group')
          createNewGroupButton.style.margin = 'auto'
          createNewGroupButton.addEventListener('click', _event => {
            this.createNewGroup(book, this.options.defaultNewGroupName)
              .then(({ group }) => {
                new GroupBuilder(
                  this.element,
                  book,
                  group,
                  this.onSelectGroup
                ).render()
              })
              .catch(errorBody => {
                this.element.appendChild(
                  errorMessageBlock(
                    document,
                    escape(`Error creating a new group. (${errorBody})`)
                  )
                )
              })
          })

          container.appendChild(chooseExistingGroupButton)
          container.appendChild(createNewGroupButton)

          this.element.innerHTML = ''
          this.element.appendChild(container)
        })
        .catch(err => {
          this.element.appendChild(
            errorMessageBlock(
              document,
              escape(`Could find your groups. (${err})`)
            )
          )
        })
    }

    this.element.innerHTML = ''
    this.element.appendChild(container)
    return this
  }

  findAddressBook (typeIndex) {
    return new Promise((resolve, reject) => {
      kb.fetcher.nowOrWhenFetched(typeIndex, (ok, err) => {
        if (!ok) {
          return reject(err)
        }
        const bookRegistration = kb.any(
          null,
          ns.solid('forClass'),
          ns.vcard('AddressBook')
        )
        if (!bookRegistration) {
          return reject(
            new Error(
              'no address book registered in the solid type index ' + typeIndex
            )
          )
        }
        const book = kb.any(bookRegistration, ns.solid('instance'))
        if (!book) {
          return reject(new Error('incomplete address book registration'))
        }
        kb.fetcher
          .load(book)
          .then(function (_xhr) {
            return resolve({ book })
          })
          .catch(function (err) {
            return reject(new Error('Could not load address book ' + err))
          })
      })
    })
  }

  createNewGroup (book, defaultNewGroupName) {
    const { groupIndex, groupContainer } = indexes(book)
    const group = rdf.sym(
      `${groupContainer.uri}${uuid.v4().slice(0, 8)}.ttl#this`
    )
    const name = defaultNewGroupName || 'Untitled Group'

    // NOTE that order matters here.  Unfortunately this type of update is
    // non-atomic in that solid requires us to send two PATCHes, either of which
    // might fail.
    const patchPromises = [group.doc(), groupIndex].map(doc => {
      const typeStatement = rdf.st(group, ns.rdf('type'), ns.vcard('Group'), doc)
      const nameStatement = rdf.st(group, ns.vcard('fn'), name, group.doc(), doc)
      const includesGroupStatement = rdf.st(
        book,
        ns.vcard('includesGroup'),
        group,
        doc
      )
      const toIns = doc.equals(groupIndex)
        ? [typeStatement, nameStatement, includesGroupStatement]
        : [typeStatement, nameStatement]
      return patch(doc.uri, { toIns }).then(() => {
        toIns.forEach(st => {
          kb.add(st)
        })
      })
    })
    return Promise.all(patchPromises)
      .then(() => ({ group }))
      .catch(err => {
        debug.log('Could not create new group.  PATCH failed ' + err)
        throw new Error(
          `Couldn't create new group.  PATCH failed for (${
          err.xhr ? err.xhr.responseURL : ''
          } )`
        )
      })
  }

  onSelectGroup (group) {
    this.selectedgroup = group
    this.groupPickedCb(group)
    this.render()
  }
}

export class GroupPicker {
  constructor (element, book, onSelectGroup) {
    this.element = element
    this.book = book
    this.onSelectGroup = onSelectGroup
  }

  render () {
    this.loadGroups()
      .then(groups => {
        // render the groups
        const container = document.createElement('div')
        container.style.display = 'flex'
        container.style.flexDirection = 'column'
        groups.forEach(group => {
          const groupButton = document.createElement('button')
          groupButton.addEventListener('click', this.handleClickGroup(group))
          new Group(groupButton, group).render()
          container.appendChild(groupButton)
        })
        this.element.innerHTML = ''
        this.element.appendChild(container)
      })
      .catch(err => {
        this.element.appendChild(
          errorMessageBlock(
            document,
            escape(`There was an error loading your groups. (${err})`)
          )
        )
      })
    return this
  }

  loadGroups () {
    return new Promise((resolve, reject) => {
      const { groupIndex } = indexes(this.book)
      kb.fetcher.nowOrWhenFetched(groupIndex, (ok, err) => {
        if (!ok) {
          return reject(err)
        }
        const groups = kb.each(this.book, ns.vcard('includesGroup'))
        return resolve(groups)
      })
    })
  }

  handleClickGroup (group) {
    return _event => {
      this.onSelectGroup(group)
    }
  }
}

export class Group {
  constructor (element, group) {
    this.element = element
    this.group = group
  }

  render () {
    const container = document.createElement('div')
    container.textContent = escape(
      // @@@@@ need to escape??
      getWithDefault(this.group, ns.vcard('fn'), `[${this.group.value}]`)
    )
    this.element.innerHTML = ''
    this.element.appendChild(container)
    return this
  }
}

export class GroupBuilder {
  constructor (element, book, group, doneBuildingCb, groupChangedCb) {
    this.element = element
    this.book = book
    this.group = group
    this.onGroupChanged = (err, changeType, agent) => {
      if (groupChangedCb) {
        groupChangedCb(err, changeType, agent)
      }
    }
    this.groupChangedCb = groupChangedCb
    this.doneBuildingCb = doneBuildingCb
  }

  refresh () {
    // TODO: implement
  }

  render () {
    const dropContainer = document.createElement('div')
    dropContainer.style.maxWidth = '350px'
    dropContainer.style.minHeight = '200px'
    dropContainer.style.outline = '1px solid black'
    dropContainer.style.display = 'flex'
    dropContainer.style.flexDirection = 'column'

    makeDropTarget(dropContainer, uris => {
      uris.map(uri => {
        this.add(uri).catch(err => {
          this.element.appendChild(
            errorMessageBlock(
              document,
              escape(`Could not add the given WebId. (${err})`)
            )
          )
        })
      })
    })

    const groupNameInput = document.createElement('input')
    groupNameInput.type = 'text'
    groupNameInput.value = getWithDefault(
      this.group,
      ns.vcard('fn'),
      'Untitled Group'
    )
    groupNameInput.addEventListener('change', event => {
      this.setGroupName(event.target.value).catch(err => {
        this.element.appendChild(
          errorMessageBlock(document, `Error changing group name. (${err})`)
        )
      })
    })
    const groupNameLabel = document.createElement('label')
    groupNameLabel.textContent = escape('Group Name:')
    groupNameLabel.appendChild(groupNameInput)
    dropContainer.appendChild(groupNameLabel)

    if (kb.any(this.group, ns.vcard('hasMember'))) {
      kb.match(this.group, ns.vcard('hasMember')).forEach(statement => {
        const webIdNode = statement.object
        const personDiv = document.createElement('div')
        new Person(personDiv, webIdNode, this.handleRemove(webIdNode)).render()
        dropContainer.appendChild(personDiv)
      })
    } else {
      const copy = document.createElement('p')
      copy.textContent = escape`
        To add someone to this group, drag and drop their WebID URL onto the box.
      `
      dropContainer.appendChild(copy)
    }

    const doneBuildingButton = document.createElement('button')
    doneBuildingButton.textContent = escape('Done')
    doneBuildingButton.addEventListener('click', _event => {
      this.doneBuildingCb(this.group)
    })
    dropContainer.appendChild(doneBuildingButton)

    this.element.innerHTML = ''
    this.element.appendChild(dropContainer)
    return this
  }

  add (webId) {
    return new Promise((resolve, reject) => {
      kb.fetcher.nowOrWhenFetched(webId, (ok, err) => {
        if (!ok) {
          this.onGroupChanged(err)
          return reject(err)
        }
        // make sure it's a valid person, group, or entity (for now just handle
        // webId)
        const webIdNode = rdf.namedNode(webId)
        const rdfClass = kb.any(webIdNode, ns.rdf('type'))
        if (!rdfClass || !rdfClass.equals(ns.foaf('Person'))) {
          return reject(
            new Error(
              `Only people supported right now. (tried to add something of type ${rdfClass.value})`
            )
          )
        }
        return resolve(webIdNode)
      })
    }).then(webIdNode => {
      const statement = rdf.st(this.group, ns.vcard('hasMember'), webIdNode)
      if (kb.holdsStatement(statement)) {
        return webIdNode
      }
      return patch(this.group.doc().uri, { toIns: [statement] }).then(() => {
        statement.why = this.group.doc()
        kb.add(statement)
        this.onGroupChanged(null, 'added', webIdNode)
        this.render()
      })
    })
  }

  handleRemove (webIdNode) {
    return _event => {
      const statement = rdf.st(this.group, ns.vcard('hasMember'), webIdNode)
      return patch(this.group.doc().uri, { toDel: [statement] })
        .then(() => {
          kb.remove(statement)
          this.onGroupChanged(null, 'removed', webIdNode)
          this.render()
          return true
        })
        .catch(err => {
          const name = kb.any(webIdNode, ns.foaf('name'))
          const errorMessage =
            name && name.value
              ? `Could not remove ${name.value}. (${err})`
              : `Could not remove ${webIdNode.value}. (${err})`
          throw new Error(errorMessage)
        })
    }
  }

  setGroupName (name) {
    const { groupIndex } = indexes(this.book)
    const updatePromises = [this.group.doc(), groupIndex].map(namedGraph => {
      const oldNameStatements = kb.match(
        this.group,
        ns.vcard('fn'),
        null,
        namedGraph
      )
      const newNameStatement = rdf.st(
        this.group,
        ns.vcard('fn'),
        rdf.literal(name)
      )
      return patch(namedGraph.value, {
        toDel: oldNameStatements,
        toIns: [newNameStatement]
      }).then(_solidResponse => {
        kb.removeStatements(oldNameStatements)
        newNameStatement.why = namedGraph
        kb.add(newNameStatement)
      })
    })
    return Promise.all(updatePromises)
  }
}
// @ignore exporting this only for the unit test
// @@ TODO maybe I should move this down at end, but for
// now I will leave it where it was
export class Person {
  constructor (element, webIdNode, handleRemove) {
    this.webIdNode = webIdNode
    this.element = element
    this.handleRemove = handleRemove
  }

  render () {
    const container = document.createElement('div')
    container.style.display = 'flex'

    // TODO: take a look at UI.widgets.setName
    const imgSrc = getWithDefault(
      this.webIdNode,
      ns.foaf('img'),
      iconBase + 'noun_15059.svg'
    )
    const profileImg = document.createElement('img')
    profileImg.src = escape(imgSrc)
    profileImg.width = '50'
    profileImg.height = '50'
    profileImg.style.margin = '5px'

    // TODO: take a look at UI.widgets.setImage
    const name = getWithDefault(
      this.webIdNode,
      ns.foaf('name'),
      `[${this.webIdNode}]`
    )
    const nameSpan = document.createElement('span')
    nameSpan.innerHTML = escape(name)
    nameSpan.style.flexGrow = '1'
    nameSpan.style.margin = 'auto 0'

    const removeButton = document.createElement('button')
    removeButton.textContent = 'Remove'
    removeButton.addEventListener('click', _event =>
      this.handleRemove().catch(err => {
        this.element.appendChild(errorMessageBlock(document, escape(`${err}`)))
      })
    )
    removeButton.style.margin = '5px'

    container.appendChild(profileImg)
    container.appendChild(nameSpan)
    container.appendChild(removeButton)

    this.element.innerHTML = ''
    this.element.appendChild(container)
    return this
  }
}

function getWithDefault (subject, predicate, defaultValue) {
  const object = kb.any(subject, predicate)
  return object ? object.value : defaultValue
}

function patch (url, { toDel, toIns }) {
  return new Promise((resolve, reject) => {
    kb.updater.update(toDel, toIns, (uri, success, errorMessage) => {
      if (!success) {
        return reject(
          new Error(`PATCH failed for resource <${uri}>: ${errorMessage}`)
        )
      }
      resolve()
    })
  })
  // return webClient.patch(url, toDel, toIns)
  //   .then(solidResponse => {
  //     const status = solidResponse.xhr.status
  //     if (status < 200 || status >= 400) {
  //       const err = new Error(`PATCH failed for resource <${solidResponse.url}>`)
  //       err.solidResponse = solidResponse
  //       throw err
  //     }
  //   })
}

function indexes (book) {
  return {
    // bookIndex: book,
    groupIndex: kb.any(book, ns.vcard('groupIndex')),
    groupContainer: kb.sym(book.dir().uri + 'Group/')
  }
}
