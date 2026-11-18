import { BookOpen, BriefcaseBusiness, Coffee, Dumbbell, House, Leaf, Moon, ShoppingCart, Sun, type LucideIcon } from 'lucide-react';
import type { BlockKind } from '@/lib/day-plan';

/** One icon per activity type, shared by Today and the Agenda. */
export const activityIcons: Record<BlockKind, LucideIcon> = { rutina: Sun, comida: Coffee, trabajo: BriefcaseBusiness, estudio: BookOpen, descanso: Leaf, entreno: Dumbbell, noche: Moon, compra: ShoppingCart, casa: House };

export default function ActivityIcon({ kind, size = 20 }: { kind?: BlockKind | null; size?: number }) {
  const Icon = (kind && activityIcons[kind]) || Sun;
  return <Icon size={size} strokeWidth={2} aria-hidden="true"/>;
}
