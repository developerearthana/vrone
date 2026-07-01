// Festival theming for calendar holidays. Each theme drives the day-cell background,
// the ribbon chip colour, and an emoji. `festive` themes get a gentle animated glow.
export interface HolidayTheme {
    emoji: string;
    chip: string;   // ribbon chip background
    cell: string;   // full day-cell background wash
    festive?: boolean;
}

export const HOLIDAY_THEMES: Record<string, HolidayTheme> = {
    diwali: { emoji: '🪔', chip: 'bg-amber-500 text-white', cell: 'bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100', festive: true },
    pongal: { emoji: '🌾', chip: 'bg-lime-600 text-white', cell: 'bg-gradient-to-br from-lime-100 via-yellow-50 to-amber-100', festive: true },
    tamilnewyear: { emoji: '🎊', chip: 'bg-rose-500 text-white', cell: 'bg-gradient-to-br from-rose-100 via-fuchsia-50 to-pink-100', festive: true },
    holi: { emoji: '🎨', chip: 'bg-fuchsia-500 text-white', cell: 'bg-gradient-to-br from-fuchsia-100 via-sky-50 to-lime-100', festive: true },
    dussehra: { emoji: '🏹', chip: 'bg-orange-500 text-white', cell: 'bg-gradient-to-br from-orange-100 to-amber-100', festive: true },
    christmas: { emoji: '🎄', chip: 'bg-emerald-600 text-white', cell: 'bg-gradient-to-br from-emerald-100 to-red-50', festive: true },
    independence: { emoji: '🇮🇳', chip: 'bg-green-600 text-white', cell: 'bg-gradient-to-br from-orange-100 via-white to-green-100' },
    republic: { emoji: '🇮🇳', chip: 'bg-blue-700 text-white', cell: 'bg-gradient-to-br from-orange-100 via-white to-green-100' },
    gandhi: { emoji: '🕊️', chip: 'bg-stone-500 text-white', cell: 'bg-gradient-to-br from-stone-100 to-amber-50' },
    newyear: { emoji: '🎉', chip: 'bg-indigo-500 text-white', cell: 'bg-gradient-to-br from-indigo-100 to-sky-100', festive: true },
    default: { emoji: '🎌', chip: 'bg-red-500 text-white', cell: 'bg-gradient-to-br from-red-50 to-rose-50' },
};

export function holidayTheme(key?: string): HolidayTheme {
    return HOLIDAY_THEMES[key || 'default'] || HOLIDAY_THEMES.default;
}
