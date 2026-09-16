import { CartState, CartAction } from '@/types/cart'

export const initialState: CartState = {
  cart: [],
}

export const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(
        (item) => item.product.id === action.payload.id
      )
      const maxQuantity = action.payload.maxQuantity ?? Number.POSITIVE_INFINITY

      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.product.id === action.payload.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, maxQuantity),
                }
              : item
          ),
        }
      }

      return {
        ...state,
        cart: [...state.cart, { product: action.payload, quantity: 1 }],
      }
    }

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.product.id !== action.payload),
      }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload
      const item = state.cart.find((cartItem) => cartItem.product.id === id)
      const maxQuantity = item?.product.maxQuantity ?? Number.POSITIVE_INFINITY
      const nextQuantity = Math.min(quantity, maxQuantity)

      if (quantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter((item) => item.product.id !== id),
        }
      }
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.product.id === id ? { ...item, quantity: nextQuantity } : item
        ),
      }
    }

    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
      }

    default:
      return state
  }
}
