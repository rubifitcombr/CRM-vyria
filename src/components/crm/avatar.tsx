import { cn, getInitials } from "@/lib/utils";

export function Avatar({
  name,
  phone,
  photoUrl,
  size = "md",
}: {
  name: string | null;
  phone: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12" };
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn("rounded-full object-cover", sizes[size])}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[#E8521A]/20 font-medium text-[#E8521A]",
        sizes[size]
      )}
    >
      {getInitials(name, phone)}
    </div>
  );
}
