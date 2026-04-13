import Stripe from 'stripe';
import { loadStripe, type Stripe as StripeClient } from '@stripe/stripe-js';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

let stripePromise: Promise<StripeClient | null> | null = null;

export const getStripePromise = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};
