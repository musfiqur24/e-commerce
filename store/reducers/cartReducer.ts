import { CartState, CartAction } from '@/types/cart'

export const initialState: CartState = {
  cart: [],
}

export const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'HYDRATE':
      return { cart: action.payload, hydrated: true }
    case 'CONSUME_ORDER':
      return { ...state, cart: state.cart.flatMap(item => {
        const purchased = action.payload.filter(line => line.variant_id === item.product.variantId).reduce((sum, line) => sum + line.quantity, 0)
        const quantity = item.quantity - purchased
        return quantity > 0 ? [{ ...item, quantity }] : []
      }) }
    case 'ADD_TO_CART': {
      if (!action.payload.variantId || action.payload.available === 0) return state
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
                  product: action.payload,
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
      if (!Number.isSafeInteger(quantity)) return state
      const item = state.cart.find((cartItem) => cartItem.product.id === id)
      const maxQuantity = item?.product.maxQuantity ?? Number.POSITIVE_INFINITY
      const nextQuantity = Math.min(quantity, maxQuantity)

      if (nextQuantity <= 0) {
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
