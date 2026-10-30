import { CircleQuestionMark, Droplets, Gem, RadioTower, Route, ShieldOff, Sparkle, Tent, type LucideIcon } from "lucide-react";
import type { IncidentCategory } from "@/types/domain";

export const CATEGORY_ICON: Record<IncidentCategory, LucideIcon> = {
  magical_anomaly: Sparkle,
  cursed_artifact: Gem,
  water_food: Droplets,
  roads: Route,
  communication: RadioTower,
  wards: ShieldOff,
  shelter_healing: Tent,
  other: CircleQuestionMark,
};

export function CategoryIcon({ category, className }: { category: IncidentCategory; className?: string }) {
  const Icon = CATEGORY_ICON[category];
  return <Icon aria-hidden className={className} strokeWidth={1.5} />;
}
