export const PAYMENT_STRATEGIES = ['pay_now', 'pay_after_meal', 'cashier_choice'];

export const DEFAULT_PAYMENT_STRATEGY = 'pay_after_meal';

export function normalizePaymentStrategy(value) {
  return PAYMENT_STRATEGIES.includes(value) ? value : DEFAULT_PAYMENT_STRATEGY;
}

export function validatePaymentStrategy(value) {
  if (!PAYMENT_STRATEGIES.includes(value)) {
    return 'paymentStrategy must be one of pay_now, pay_after_meal, cashier_choice';
  }

  return null;
}
