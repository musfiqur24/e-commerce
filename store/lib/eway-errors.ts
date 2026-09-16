const EXACT_EWAY_MESSAGES: Record<string, string> = {
  V6000: "Some payment details are invalid. Please check the form and try again.",
  V6010: "Card payments are not available for this transaction. Please contact support.",
  V6011: "The payment amount is invalid. Please refresh the checkout and try again.",
  V6015: "The payment currency is not supported. Please contact support.",
  V6016: "Payment information is missing. Please check your card details.",
  V6017: "The payment currency is missing. Please contact support.",
  V6018: "The payment currency is not recognised. Please contact support.",
  V6019: "Your bank requires additional card verification. Please try again.",
  V6020: "Please complete your card details.",
  V6021: "Please enter the name shown on the card.",
  V6022: "Please enter a valid card number.",
  V6023: "Please enter the card security code (CVN).",
  V6033: "Please enter a valid future expiry date in MM/YY format.",
  V6040: "The saved payment method is invalid. Please enter the card details again.",
  V6100: "Please enter a valid cardholder name.",
  V6101: "Please enter a valid expiry month.",
  V6102: "Please enter a valid future expiry year.",
  V6106: "Please enter a valid card security code (CVN).",
  V6110: "Please enter a valid card number.",
  V6111: "Card payments are not configured correctly. Please contact support.",
  V6125: "This payment method is not currently available. Please use another card.",
  V6126: "The card number could not be read securely. Please re-enter it.",
  V6127: "The security code could not be read securely. Please re-enter it.",
  V6143: "The payment form could not be verified. Please refresh and try again.",
  V6147: "The secure payment form could not be created. Please refresh and try again.",
  V6148: "The secure payment session expired. Please refresh and enter the card again.",
  V6149: "The secure payment session is invalid. Please refresh and enter the card again.",
  V6155: "One or more required payment fields are missing.",
  D4401: "Your bank needs you to contact them before this payment can be approved.",
  D4402: "Your bank needs you to contact them before this payment can be approved.",
  D4404: "This card cannot be used. Please contact your bank or use another card.",
  D4405: "Your bank declined the payment. Please use another card or contact your bank.",
  D4414: "The card details were not accepted. Please check them or use another card.",
  D4419: "The payment could not be processed. Please wait a moment and try again.",
  D4434: "The payment could not be approved. Please use another card or contact your bank.",
  D4441: "This card has been reported lost. Please use another card and contact your bank.",
  D4443: "This card has been reported stolen. Please use another card and contact your bank.",
  D4451: "The card has insufficient funds. Please use another card or contact your bank.",
  D4454: "The card has expired. Please use another card.",
  D4457: "Your bank does not permit this payment. Please use another card or contact your bank.",
  D4461: "The card limit was exceeded. Please use another card or contact your bank.",
  D4462: "This card is restricted. Please use another card or contact your bank.",
  D4482: "The card security code (CVN) is incorrect.",
  D4483: "The payment network is temporarily unavailable. Please try again later.",
  D4484: "The payment network is not accepting this transaction. Please try another card.",
  D4491: "Your bank is temporarily unavailable. Please try again later.",
  D4492: "The payment could not be routed to your bank. Please try again later.",
  D4494: "This payment appears to be a duplicate. Please check your orders before retrying.",
  D4495: "American Express declined the payment. Please use another card or contact Amex.",
  D4496: "The payment network returned an error. Please try again later.",
  F7001: "The payment could not be approved. Please use another card or contact your bank.",
  F7009: "The payment could not be approved. Please use another card or contact your bank.",
  S5000: "The payment service is temporarily unavailable. Please try again later.",
  S5010: "The payment service returned an unexpected error. Please try again later.",
  S5020: "The payment request timed out. Please check your orders before retrying.",
  S5029: "The payment service is busy. Please wait a moment and try again.",
  S5666: "The payment status could not be confirmed. Please do not retry and contact support.",
};

const EWAY_CODE_PATTERN = /\b(?:[ADFVS]\d{4}|3D\d{2})\b/gi;

export function extractEwayCodes(
  ...values: Array<string | string[] | null | undefined>
): string[] {
  const codes = values.flatMap((value) => {
    const text = Array.isArray(value) ? value.join(",") : value;
    return text?.match(EWAY_CODE_PATTERN) ?? [];
  });

  return [...new Set(codes.map((code) => code.toUpperCase()))];
}

function getFallbackMessageForCode(code: string): string {
  if (code.startsWith("V")) {
    return "Some payment details are invalid. Please check them and try again.";
  }
  if (code.startsWith("D")) {
    return "Your bank declined the payment. Please use another card or contact your bank.";
  }
  if (code.startsWith("F")) {
    return "The payment could not be approved. Please use another card or contact your bank.";
  }
  if (code.startsWith("S")) {
    return "The payment service is temporarily unavailable. Please try again later.";
  }
  if (code.startsWith("3D")) {
    return "Your card verification could not be completed. Please try again or use another card.";
  }

  return "The payment could not be processed. Please check your details and try again.";
}

export function getEwayCustomerMessage(
  ...values: Array<string | string[] | null | undefined>
): string | null {
  const codes = extractEwayCodes(...values);
  if (codes.length === 0) return null;

  const messages = codes.map(
    (code) => EXACT_EWAY_MESSAGES[code] ?? getFallbackMessageForCode(code),
  );

  return [...new Set(messages)].join(" ");
}

export function getPaymentGatewayHttpMessage(status: number): string {
  if (status === 400) {
    return "The payment details were not accepted. Please check them and try again.";
  }
  if (status === 401 || status === 403 || status === 404) {
    return "The payment service is not available right now. Please contact support. You have not been charged.";
  }
  if (status === 408) {
    return "The payment request timed out. Please check your orders before trying again.";
  }
  if (status === 429) {
    return "The payment service is busy. Please wait a moment and try again.";
  }
  if (status >= 500) {
    return "The payment status could not be confirmed. Please do not retry and contact support.";
  }

  return "The payment could not be processed. Please check your details or use another card.";
}
