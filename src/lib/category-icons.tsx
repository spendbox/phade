import {
  Baby,
  Briefcase,
  Crown,
  Feather,
  Flower2,
  Footprints,
  Gem,
  Gift,
  Glasses,
  Handbag,
  Heart,
  Layers,
  Package,
  Palette,
  PersonStanding,
  Ribbon,
  Scissors,
  Shapes,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Umbrella,
  Wallet,
  Watch,
} from "lucide-react";

/**
 * The icon set an admin can pick from when creating a category.
 *
 * Stored on the category row as a plain key, so swapping the icon library later
 * is a change in this file rather than a data migration. `Tag` is the fallback
 * for a category saved before icons existed, or with an unknown key.
 */
export const CATEGORY_ICONS = {
  handbag: { label: "Handbag", Icon: Handbag },
  bag: { label: "Shopping bag", Icon: ShoppingBag },
  shoes: { label: "Shoes", Icon: Footprints },
  shirt: { label: "Top", Icon: Shirt },
  dress: { label: "Full-length", Icon: PersonStanding },
  crown: { label: "Crown", Icon: Crown },
  gem: { label: "Jewellery", Icon: Gem },
  watch: { label: "Watch", Icon: Watch },
  glasses: { label: "Eyewear", Icon: Glasses },
  ribbon: { label: "Ribbon", Icon: Ribbon },
  sparkles: { label: "Sparkles", Icon: Sparkles },
  scissors: { label: "Tailoring", Icon: Scissors },
  palette: { label: "Colour", Icon: Palette },
  feather: { label: "Feather", Icon: Feather },
  flower: { label: "Flower", Icon: Flower2 },
  heart: { label: "Heart", Icon: Heart },
  star: { label: "Star", Icon: Star },
  gift: { label: "Gift", Icon: Gift },
  briefcase: { label: "Work", Icon: Briefcase },
  wallet: { label: "Wallet", Icon: Wallet },
  umbrella: { label: "Umbrella", Icon: Umbrella },
  baby: { label: "Kids", Icon: Baby },
  layers: { label: "Layers", Icon: Layers },
  package: { label: "Package", Icon: Package },
  shapes: { label: "Shapes", Icon: Shapes },
  tag: { label: "Tag", Icon: Tag },
} as const;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_KEYS = Object.keys(
  CATEGORY_ICONS,
) as CategoryIconKey[];

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "tag";

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  return typeof value === "string" && value in CATEGORY_ICONS;
}

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const key = isCategoryIconKey(icon) ? icon : DEFAULT_CATEGORY_ICON;
  const { Icon } = CATEGORY_ICONS[key];
  return <Icon className={className} aria-hidden />;
}
