import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

export function StarRating({
  rating,
  count,
  size = "sm",
}: {
  rating: number | null;
  count: number;
  size?: "sm" | "md";
}) {
  if (count === 0 || rating === null) {
    return (
      <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
        No ratings yet
      </span>
    );
  }

  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span className={cn("flex items-center gap-1", size === "sm" ? "text-xs" : "text-sm")}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              iconSize,
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/40"
            )}
          />
        ))}
      </span>
      <span className="text-muted-foreground">
        {rating.toFixed(1)} ({count})
      </span>
    </span>
  );
}

export function InteractiveStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={cn(
              "size-6",
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/40 hover:text-yellow-300"
            )}
          />
        </button>
      ))}
    </span>
  );
}
