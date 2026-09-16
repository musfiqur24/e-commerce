'use client'

import React, { useReducer, useMemo, useCallback } from 'react'
import { CartContext } from '@/context/CartContext'
import { cartReducer, initialState } from '@/reducers/cartReducer'
import type { Product } from '@/components/portal/ProductCard'

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  React.useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        parsedCart.forEach((item: any) => {
          dispatch({ type: 'ADD_TO_CART', payload: item.product })
          // If quantity > 1, update it
          if (item.quantity > 1) {
            dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.product.id, quantity: item.quantity } })
          }
        })
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e)
      }
    }
  }, [])

  // Save cart to localStorage on change
  React.useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.cart))
  }, [state.cart])

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
    }),
    [state.cart, subtotal, itemCount, addToCart, removeFromCart, updateQuantity, clearCart]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
