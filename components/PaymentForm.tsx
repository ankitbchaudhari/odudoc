"use client";

import { useState } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";

interface PaymentFormProps {
  clientSecret: string;
  doctorName: string;
  timeSlot: string;
  fee: number;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  onSuccess: (paymentIntentId: string, bookingId: string) => void;
  onError: (message: string) => void;
}

function CheckoutForm({
  clientSecret,
  doctorName,
  timeSlot,
  fee,
  patientName,
  patientPhone,
  doctorId,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setProcessing(true);
    setCardError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: patientName,
            },
          },
        }
      );

      if (error) {
        setCardError(error.message || "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Create booking after successful payment
        const bookingRes = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId,
            doctorName,
            patientName,
            patientPhone,
            timeSlot,
            fee,
            paymentStatus: "paid",
            paymentIntentId: paymentIntent.id,
          }),
        });

        const bookingData = await bookingRes.json();

        if (bookingRes.ok) {
          onSuccess(paymentIntent.id, bookingData.booking.id);
        } else {
          onSuccess(paymentIntent.id, "");
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      onError(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Order Summary */}
      <div className="mb-5 rounded-lg bg-gray-50 dark:bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Order Summary</h3>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">Doctor</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">{doctorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">Time Slot</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">{timeSlot}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">Patient</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">{patientName}</span>
          </div>
          <div className="mt-2 border-t border-gray-200 dark:border-slate-800 pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-900 dark:text-slate-100">Total</span>
              <span className="text-primary-600">${fee.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Input */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
          Card Details
        </label>
        <div className="rounded-lg border border-gray-300 dark:border-slate-700 px-4 py-3 transition-colors focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "14px",
                  color: "#1f2937",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                  fontFamily: "Inter, system-ui, sans-serif",
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
            onChange={(e) => {
              if (e.error) {
                setCardError(e.error.message);
              } else {
                setCardError(null);
              }
            }}
          />
        </div>
        {cardError && (
          <p className="mt-2 text-xs text-red-600">{cardError}</p>
        )}
      </div>

      {/* Security Note */}
      <div className="mb-5 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>Payments are secured with 256-bit SSL encryption</span>
      </div>

      {/* Pay Button */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay $${fee.toFixed(2)}`
        )}
      </button>
    </form>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  const stripePromise = getStripePromise();

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0E7490",
          },
        },
      }}
    >
      <CheckoutForm {...props} />
    </Elements>
  );
}
