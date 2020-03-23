import store from '../../../src/store'

export function clearStore () {
  store.statements.slice().forEach(store.remove.bind(store))
}
