export const styleMap = {
  'header-user-menu__link': {
    background: 'none',
    border: '0',
    color: 'black',
    cursor: 'pointer',
    display: 'block',
    fontFamily: 'Arial',
    fontSize: '1em',
    textAlign: 'left',
    padding: '1em',
    width: '100%',
    '&:focus': {
      backgroundColor: '#eee'
    },
    '&:hover': {
      backgroundColor: '#eee'
    }
  },
  headerUserMenuList: {
    listStyle: 'none',
    margin: '0',
    padding: '0'
  },
  headerUserMenuNavigationMenu: {
    background: 'white',
    border: 'solid 1px $divider-color',
    borderRight: '0',
    position: 'absolute',
    right: '0',
    top: '60px',
    width: '200px',
    'z-index': '1',
    '&[aria-hidden = true]': {
      display: 'none'
    }
  }
}
