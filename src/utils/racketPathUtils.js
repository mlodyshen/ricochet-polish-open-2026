import { RACKET_COLORS } from '../components/RacketBadge';

const COLOR_KEYS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

/**
 * Returns the "Racket Path" configuration for a given match ID.
 * 
 * Rules:
 * WB Round 1 Matches (1-16):
 *  - Assigned a color based on their pair index.
 *  - Show a Single Racket with their Match Number.
 * 
 * LB Round 1 Matches (1-8):
 *  - These are the destination for WB R1 Losers.
 *  - Show Dual Rackets with logic "X + Y" (e.g. 1 + 2).
 *  - Same color as the source pair.
 */
export const getRacketPathConfig = (matchId, bracketType, round, matchNumber) => {
    // 1. WB Round 1 Sources
    if (bracketType === 'wb' && round === 1) {
        // Pairs: (1,2), (3,4), etc.
        // Index within pairs: Math.ceil(matchNumber / 2) - 1
        const pairIndex = Math.ceil(matchNumber / 2) - 1;
        const colorKey = COLOR_KEYS[pairIndex % COLOR_KEYS.length];

        return {
            showBadge: true,
            colorKey,
            text: `${matchNumber}`,
            isDual: false,
            type: 'source'
        };
    }

    // 2. LB Round 1 Destinations (where WB R1 losers go)
    if (bracketType === 'lb' && round === 1) {
        // Match 1 in LB R1 corresponds to WB Pair 1 (Matches 1 & 2)
        // Match m corresponds to WB Pair m
        const pairIndex = matchNumber - 1;
        const colorKey = COLOR_KEYS[pairIndex % COLOR_KEYS.length];

        const source1 = pairIndex * 2 + 1;
        const source2 = pairIndex * 2 + 2;

        return {
            showBadge: true,
            colorKey,
            text: `${source1} + ${source2}`,
            isDual: true,
            type: 'destination'
        };
    }

    // 3. WB Round 2 Sources (drop to LB Round 2)
    // Matches 1-8 in WB R2
    // They drop to LB R2 Matches 1-8 (Slot 2)
    /* 
       Optimally, we could color code these too, maybe recycling colors or simplified gray.
       Let's add them as 'Single Racket' indicators if they lose.
    */
    if (bracketType === 'wb' && round > 1) {
        // Future expansion: visual cues for other rounds? 
        // For now, adhering strictly to the "Pair" system request for the "Flow".
        // The user specifically mentioned "Mecze 1 i 2".
        return null;
    }

    // 4. LB Round 2+ Destinations
    // These matches wait for WB losers. 
    // E.g. LB R2 M1 waits for Loser of WB R2 M1.
    // We could mark that slot specifically.

    return null;
};

/**
 * Returns Zone Configuration for a given Bracket Volume (Column/Round).
 * Specifies what place the Loser gets.
 */
export const getZoneConfig = (bracketType, round) => {
    if (bracketType === 'lb') {
        switch (round) {
            case 1: return { label: 'Survival Stage', places: '25-32', color: '#ef4444' }; // Red - High danger
            case 2: return { label: 'Round 2', places: '17-24', color: '#f97316' }; // Orange
            case 3: return { label: 'Sweet 16 Qualifier', places: '13-16', color: '#eab308' }; // Yellow
            case 4: return { label: 'Top 12 Battle', places: '9-12', color: '#84cc16' }; // Lime
            case 5: return { label: 'Quarter-Finalist', places: '7-8', color: '#22c55e' }; // Green
            case 6: return { label: 'Top 6', places: '5-6', color: '#06b6d4' }; // Cyan
            case 7: return { label: 'Semi-Finalist Bubble', places: '4th', color: '#3b82f6' }; // Blue
            case 8: return { label: 'Podium Switch', places: '3rd', color: '#a855f7' }; // Purple
            default: return null;
        }
    }
    if (bracketType === 'gf') {
        return { label: 'Grand Final', places: '1-2', color: '#eab308' }; // Gold
    }
    // Placement Brackets
    if (bracketType.startsWith('p')) {
        if (bracketType.includes('25') || bracketType.includes('29')) return { label: 'Placement 25-32', places: '25-32', color: '#94a3b8' };
        if (bracketType.includes('17') || bracketType.includes('21')) return { label: 'Placement 17-24', places: '17-24', color: '#94a3b8' };
        if (bracketType.includes('13') || bracketType.includes('15')) return { label: 'Placement 13-16', places: '13-16', color: '#94a3b8' };
        if (bracketType.includes('9') || bracketType.includes('11')) return { label: 'Placement 9-12', places: '9-12', color: '#94a3b8' };
        if (bracketType === 'p7') return { label: '7th Place', places: '7-8', color: '#94a3b8' }; // Actually winner 7, loser 8
        if (bracketType === 'p5') return { label: '5th Place', places: '5-6', color: '#94a3b8' };
    }
    return null;
};
