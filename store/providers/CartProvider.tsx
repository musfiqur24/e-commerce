'use client'

import React, { useReducer, useMemo, useCallback } from 'react'
import type { CartItem } from '@/types/cart'
import { CartContext } from '@/context/CartContext'
import { cartReducer, initialState } from '@/reducers/cartReducer'
import type { Product } from '@/components/portal/ProductCard'

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  React.useEffect(() => {
    let restored: CartItem[] = []
    try {
      const savedCart = localStorage.getItem('cart:v2')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        if (!Array.isArray(parsedCart)) throw new Error('Invalid cart')
        restored = parsedCart.filter((item: CartItem) => item?.product?.variantId && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.product.available !== 0)
      }
    } catch (e) {
      console.error('Failed to restore cart', e)
    }
    dispatch({ type: 'HYDRATE', payload: restored })
  }, [])

  // Save cart to localStorage on change
  React.useEffect(() => {
    if (state.hydrated) localStorage.setItem('cart:v2', JSON.stringify(state.cart))
  }, [state.cart, state.hydrated])

  const addToCart = useCallback((product: Product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])
  const consumeOrder = useCallback((items: Array<{ variant_id?: string; quantity: number }>) => {
    dispatch({ type: 'CONSUME_ORDER', payload: items })
  }, [])

  const subtotal = useMemo(
    () => state.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [state.cart]
  )

  const itemCount = useMemo(
    () => state.cart.reduce((sum, item) => sum + item.quantity, 0),
    [state.cart]
  )

  const value = useMemo(
    () => ({
      cart: state.cart,
      subtotal,
      itemCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      consumeOrder,
    }),
    [state.cart, subtotal, itemCount, addToCart, removeFromCart, updateQuantity, clearCart, consumeOrder]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
