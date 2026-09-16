import type { Product } from '@/components/portal/ProductCard'

export interface CartItem {
  product: Product
  quantity: number
}

export interface CartState {
  cart: CartItem[]
}

export interface CartContextType extends CartState {
  subtotal: number
  itemCount: number
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

export type CartAction =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
