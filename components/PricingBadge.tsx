"use client";

interface PricingBadgeProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function PricingBadge({
  price,
  originalPrice,
  currency = "$",
  size = "md",
  className = "",
}: PricingBadgeProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const strikeSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`font-bold text-primary-600 ${sizeClasses[size]}`}
      >
        {currency}
        {price.toFixed(2)}
      </span>

      {originalPrice && originalPrice > price && (
        <span
          className={`text-gray-400 dark:text-slate-500 line-through ${strikeSizeClasses[size]}`}
        >
          {currency}
          {originalPrice.toFixed(2)}
        </span>
      )}

      {discount && (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
          {discount}% off
        </span>
      )}
    </div>
  );
}
