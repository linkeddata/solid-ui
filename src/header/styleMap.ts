export const styleMap = {
  headerUserMenuLink: {
    background: 'none',
    border: '0',
    color: 'black',
    cursor: 'pointer',
    display: 'block',
    'font-family': 'Arial',
    'font-size': '1em',
    'text-align': 'left',
    padding: '1em',
    width: '100%',
    '&:focus': {
      'background-color': '#eee'
    },
    '&:hover': {
      'background-color': '#eee'
    }
  },
  headerUserMenuList: {
    'list-style': 'none',
    margin: '0',
    padding: '0'
  },
  headerUserMenuNavigationMenu: {
    background: 'white',
    border: 'solid 1px $divider-color',
    'border-right': '0',
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
