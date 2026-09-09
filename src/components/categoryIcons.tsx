import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Baby,
  Beef,
  Bike,
  Book,
  Cake,
  Camera,
  Candy,
  Car,
  Cherry,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Dumbbell,
  Egg,
  Fish,
  Flower2,
  Gamepad2,
  Gem,
  Gift,
  Headphones,
  IceCreamCone,
  Laptop,
  Leaf,
  Milk,
  Music,
  Palette,
  PenTool,
  Pizza,
  Popcorn,
  Sandwich,
  Scissors,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  ToyBrick,
  Utensils,
  Watch,
  Wrench,
} from "lucide-react";

export interface CategoryIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
}

/** Curated, shop-appropriate icon set a category can be assigned. Keyed so a
 *  category row only ever stores this string, not a component. */
export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: "coffee", label: "Coffee", Icon: Coffee },
  { key: "cup", label: "Drink cup", Icon: CupSoda },
  { key: "milk", label: "Milk", Icon: Milk },
  { key: "utensils", label: "Utensils", Icon: Utensils },
  { key: "cookie", label: "Cookie", Icon: Cookie },
  { key: "cake", label: "Cake", Icon: Cake },
  { key: "icecream", label: "Ice cream", Icon: IceCreamCone },
  { key: "candy", label: "Candy", Icon: Candy },
  { key: "croissant", label: "Croissant", Icon: Croissant },
  { key: "sandwich", label: "Sandwich", Icon: Sandwich },
  { key: "pizza", label: "Pizza", Icon: Pizza },
  { key: "burger", label: "Beef", Icon: Beef },
  { key: "popcorn", label: "Popcorn", Icon: Popcorn },
  { key: "apple", label: "Apple", Icon: Apple },
  { key: "cherry", label: "Cherry", Icon: Cherry },
  { key: "egg", label: "Egg", Icon: Egg },
  { key: "fish", label: "Fish", Icon: Fish },
  { key: "leaf", label: "Leaf", Icon: Leaf },
  { key: "bag", label: "Shopping bag", Icon: ShoppingBag },
  { key: "store", label: "Store", Icon: Store },
  { key: "shirt", label: "Clothes", Icon: Shirt },
  { key: "baby", label: "Baby", Icon: Baby },
  { key: "toy", label: "Toy", Icon: ToyBrick },
  { key: "watch", label: "Watch", Icon: Watch },
  { key: "gem", label: "Gem", Icon: Gem },
  { key: "gift", label: "Gift", Icon: Gift },
  { key: "book", label: "Book", Icon: Book },
  { key: "flower", label: "Flower", Icon: Flower2 },
  { key: "scissors", label: "Scissors", Icon: Scissors },
  { key: "palette", label: "Palette", Icon: Palette },
  { key: "smartphone", label: "Phone case", Icon: Smartphone },
  { key: "laptop", label: "Laptop", Icon: Laptop },
  { key: "camera", label: "Camera", Icon: Camera },
  { key: "headphones", label: "Headphones", Icon: Headphones },
  { key: "gamepad", label: "Game", Icon: Gamepad2 },
  { key: "music", label: "Music", Icon: Music },
  { key: "sparkles", label: "Sparkles", Icon: Sparkles },
  { key: "pen", label: "Pen", Icon: PenTool },
  { key: "dumbbell", label: "Fitness", Icon: Dumbbell },
  { key: "bike", label: "Bike", Icon: Bike },
  { key: "car", label: "Car", Icon: Car },
  { key: "tools", label: "Tools", Icon: Wrench },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((o) => [o.key, o.Icon]),
);

/** Resolve a stored category icon key to its component (null when unset or
 *  unknown). */
export function iconForKey(key: string | null | undefined): LucideIcon | null {
  if (!key) return null;
  return ICON_MAP[key] ?? null;
}
