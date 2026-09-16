import { NextRequest, NextResponse } from 'next/server'
import {
  completePreparedOrder,
  prepareOrderForAuthenticatedPatient,
  type CartItemInput,
  type ShippingAddressInput,
} from '../_lib/place-order'
import {
  extractEwayCodes,
  getEwayCustomerMessage,
  getPaymentGatewayHttpMessage,
} from '@/lib/eway-errors'

interface EwayTransactionResponse {
  TransactionStatus?: boolean
  TransactionID?: number
  ResponseCode?: string
  ResponseMessage?: string
  Errors?: string | null
  AuthorisationCode?: string
  TotalAmount?: number
}

const getEwayEndpoint = () => {
  if (process.env.EWAY_API_BASE_URL) {
    return `${process.env.EWAY_API_BASE_URL.replace(/\/$/, '')}/Transaction`
  }

  return process.env.EWAY_ENVIRONMENT === 'production'
    ? 'https://api.ewaypayments.com/Transaction'
    : 'https://api.sandbox.ewaypayments.com/Transaction'
}

const getEwayAuthHeader = () => {
  const apiKey = process.env.EWAY_API_KEY
  const password = process.env.EWAY_API_PASSWORD

  if (!apiKey || !password) {
    throw new Error('EWAY_API_KEY and EWAY_API_PASSWORD must be set')
  }

  return `Basic ${Buffer.from(`${apiKey}:${password}`).toString('base64')}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { items, securedCardData, discountCode, shippingAddress, deliveryNotes } = body as {
    items: CartItemInput[]
    securedCardData?: string
    discountCode?: string
    shippingAddress?: ShippingAddressInput
    deliveryNotes?: string
  }

  if (!securedCardData) {
    return NextResponse.json(
      { error: 'Payment details are incomplete. Please check the card fields.' },
      { status: 400 }
    )
  }

  let paymentApproved = false

  try {
    const preparedOrder = await prepareOrderForAuthenticatedPatient(
      items,
      discountCode
    )
    const totalAmount = Math.round(preparedOrder.total * 100)
    const invoiceReference = `cart-${Date.now()}`
    const ewayAuthHeader = getEwayAuthHeader()

    let ewayRes: Response
    try {
      ewayRes = await fetch(getEwayEndpoint(), {
        method: 'POST',
        headers: {
          Authorization: ewayAuthHeader,
          'Content-Type': 'application/json',
          'X-EWAY-APIVERSION': '47',
        },
        body: JSON.stringify({
          Customer: {
            Reference: preparedOrder.customer.id,
            Email: preparedOrder.customer.email,
          },
          Payment: {
            TotalAmount: totalAmount,
            InvoiceNumber: invoiceReference,
            InvoiceReference: invoiceReference,
            InvoiceDescription: 'E-commerce order',
            CurrencyCode: process.env.EWAY_CURRENCY || 'AUD',
          },
          Method: 'ProcessPayment',
          TransactionType: 'Purchase',
          SecuredCardData: securedCardData,
        }),
      })
    } catch (error) {
      console.error('[pay order] eWAY payment status is unknown:', error)
      return NextResponse.json(
        {
          error:
            'Payment status could not be confirmed. Please do not retry payment and contact support.',
          code: 'PAYMENT_STATUS_UNKNOWN',
        },
        { status: 502 }
      )
    }

    const payment = (await ewayRes.json().catch(() => ({}))) as EwayTransactionResponse

    if (!ewayRes.ok) {
      if (ewayRes.status >= 500) {
        return NextResponse.json(
          {
            error:
              'Payment status could not be confirmed. Please do not retry payment and contact support.',
            code: 'PAYMENT_STATUS_UNKNOWN',
          },
          { status: 502 }
        )
      }

      return NextResponse.json(
        {
          error:
            getEwayCustomerMessage(payment.Errors, payment.ResponseMessage) ??
            getPaymentGatewayHttpMessage(ewayRes.status),
          code: extractEwayCodes(payment.Errors, payment.ResponseMessage)[0],
          payment,
        },
        { status: ewayRes.status }
      )
    }

    if (payment.TransactionStatus !== true) {
      return NextResponse.json(
        {
          error:
            getEwayCustomerMessage(payment.Errors, payment.ResponseMessage) ??
            'Your payment was declined. Please use another card or contact your bank.',
          code: extractEwayCodes(payment.Errors, payment.ResponseMessage)[0],
          payment,
        },
        { status: 402 }
      )
    }

    paymentApproved = true
    let order
    try {
      order = await completePreparedOrder(preparedOrder, {
        payment: {
          transactionId: payment.TransactionID,
          responseCode: payment.ResponseCode,
          responseMessage: payment.ResponseMessage,
          authorisationCode: payment.AuthorisationCode,
        },
        shippingAddress,
        deliveryNotes,
      })
    } catch (completionError) {
      const error =
        completionError instanceof Error
          ? completionError.message
          : 'Post-payment order finalization failed'
      console.error(
        '[pay order] Payment approved but order finalization failed:',
        completionError
      )

      return NextResponse.json({
        success: true,
        payment: {
          transactionId: payment.TransactionID,
          responseCode: payment.ResponseCode,
          responseMessage: payment.ResponseMessage,
          authorisationCode: payment.AuthorisationCode,
          totalAmount: payment.TotalAmount,
        },
        failures: [{ category: 'post-payment', error }],
        discount: preparedOrder.discount,
        totals: {
          subtotal: preparedOrder.subtotal,
          shipping: preparedOrder.shipping,
          total: preparedOrder.total,
        },
      })
    }

    return NextResponse.json({
      success: true,
      payment: {
        transactionId: payment.TransactionID,
        responseCode: payment.ResponseCode,
        responseMessage: payment.ResponseMessage,
        authorisationCode: payment.AuthorisationCode,
        totalAmount: payment.TotalAmount,
      },
      failures: order.failures,
      medusaOrder: order.medusaOrder,
      discount: order.discount,
      totals: {
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment failed'
    const lowered = message.toLowerCase()
    const status =
      message === 'Cart is empty'
        ? 400
        : message === 'NOT_AUTHENTICATED'
          ? 401
          : lowered.includes('not found')
            ? 404
            : lowered.includes('out of stock')
              ? 409
              : lowered.includes('discount')
                ? 400
                : 500

    return NextResponse.json({ error: message }, { status })
  }
}
