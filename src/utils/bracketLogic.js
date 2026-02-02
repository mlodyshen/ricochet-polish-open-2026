import { v4 as uuidv4 } from 'uuid';

// --------------------------------------------------------------------------
// CONFIGURATION & BLUEPRINT
// --------------------------------------------------------------------------

// 1. Seeding Order (Standard 32-player snake/standard spread)
// [Seed1, Seed2] for the 16 matches in WB Round 1
const SEEDING_PAIRS = [
    [1, 32],   // wb-r1-m1
    [16, 17],  // wb-r1-m2
    [9, 24],   // wb-r1-m3
    [8, 25],   // wb-r1-m4
    [5, 28],   // wb-r1-m5
    [12, 21],  // wb-r1-m6
    [13, 20],  // wb-r1-m7
    [4, 29],   // wb-r1-m8
    [3, 30],   // wb-r1-m9
    [14, 19],  // wb-r1-m10
    [11, 22],  // wb-r1-m11
    [6, 27],   // wb-r1-m12
    [7, 26],   // wb-r1-m13
    [10, 23],  // wb-r1-m14
    [15, 18],  // wb-r1-m15
    [2, 31]    // wb-r1-m16
];

// Helper to generate match structure
const mkMatch = (id, bracket, round, extras = {}) => ({
    id, bracket, round,
    player1Id: null, player2Id: null,
    score1: null, score2: null,
    winnerId: null,
    status: 'scheduled',
    microPoints: [],
    ...extras
});

export const getBracketBlueprint = () => {
    const matches = [];

    // --- WINNERS BRACKET (WB) ---
    // R1 (16 matches)
    for (let i = 1; i <= 16; i++) {
        matches.push(mkMatch(`wb-r1-m${i}`, 'wb', 1, {
            nextMatchId: `wb-r2-m${Math.ceil(i / 2)}`,
            loserMatchId: `p17-r1-m${Math.ceil(i / 2)}` // Drops to 17-32 Bracket
        }));
    }
    // R2 (8 matches)
    for (let i = 1; i <= 8; i++) {
        matches.push(mkMatch(`wb-r2-m${i}`, 'wb', 2, {
            sourceMatchId1: `wb-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r3-m${Math.ceil(i / 2)}`,
            loserMatchId: `p9-r1-m${Math.ceil(i / 2)}` // Drops to 9-16 Bracket
        }));
    }
    // R3 (4 matches) - Quarterfinals
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`wb-r3-m${i}`, 'wb', 3, {
            sourceMatchId1: `wb-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r4-m${Math.ceil(i / 2)}`,
            loserMatchId: `p5-r1-m${Math.ceil(i / 2)}` // Drops to 5-8 Bracket
        }));
    }
    // R4 (2 matches) - Semifinals
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`wb-r4-m${i}`, 'wb', 4, {
            sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r5-m1`,
            loserMatchId: `p3-f` // Drops to 3rd Place Match
        }));
    }
    // R5 (1 match) - Final
    matches.push(mkMatch(`wb-r5-m1`, 'wb', 5, { // Main Final
        sourceMatchId1: `wb-r4-m1`, sourceType1: 'winner',
        sourceMatchId2: `wb-r4-m2`, sourceType2: 'winner'
    }));


    // --- PLACEMENT 3rd (Bronze) ---
    matches.push(mkMatch(`p3-f`, 'p3', 1, {
        sourceMatchId1: `wb-r4-m1`, sourceType1: 'loser',
        sourceMatchId2: `wb-r4-m2`, sourceType2: 'loser'
    }));

    // --- PLACEMENT 5-8 SECTION ---
    // R1 (Founding of 5-8): Fed by WB R3 Losers
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p5-r1-m${i}`, 'p5', 1, {
            sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p5-f`,       // Winner plays for 5th
            loserMatchId: `p7-f`       // Loser plays for 7th
        }));
    }
    // 5th Place
    matches.push(mkMatch(`p5-f`, 'p5', 2, {
        sourceMatchId1: `p5-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p5-r1-m2`, sourceType2: 'winner'
    }));
    // 7th Place
    matches.push(mkMatch(`p7-f`, 'p5', 2, { // Technically p7 bracket but grouped in p5 logic often
        sourceMatchId1: `p5-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p5-r1-m2`, sourceType2: 'loser'
    }));

    // --- PLACEMENT 9-16 SECTION ---
    // R1: Fed by WB R2 Losers (8 players, 4 matches)
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`p9-r1-m${i}`, 'p9', 1, {
            sourceMatchId1: `wb-r2-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r2-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p9-r2-m${Math.ceil(i / 2)}`,  // Winner to 9-12 semis
            loserMatchId: `p13-r1-m${Math.ceil(i / 2)}` // Loser to 13-16 semis
        }));
    }

    // 9-12 Sub-bracket (Winners of p9-r1)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p9-r2-m${i}`, 'p9', 2, {
            sourceMatchId1: `p9-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p9-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `p9-f`,
            loserMatchId: `p11-f`
        }));
    }
    matches.push(mkMatch(`p9-f`, 'p9', 3, { // 9th Place
        sourceMatchId1: `p9-r2-m1`, sourceType1: 'winner',
        sourceMatchId2: `p9-r2-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p11-f`, 'p9', 3, { // 11th Place
        sourceMatchId1: `p9-r2-m1`, sourceType1: 'loser',
        sourceMatchId2: `p9-r2-m2`, sourceType2: 'loser'
    }));

    // 13-16 Sub-bracket (Losers of p9-r1)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p13-r1-m${i}`, 'p13', 1, { // Note: round 1 of this sub-bracket
            sourceMatchId1: `p9-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p9-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p13-f`,
            loserMatchId: `p15-f`
        }));
    }
    matches.push(mkMatch(`p13-f`, 'p13', 2, { // 13th Place
        sourceMatchId1: `p13-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p13-r1-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p15-f`, 'p13', 2, { // 15th Place
        sourceMatchId1: `p13-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p13-r1-m2`, sourceType2: 'loser'
    }));

    // --- PLACEMENT 17-32 SECTION ---
    // R1: Fed by WB R1 Losers (16 players, 8 matches)
    for (let i = 1; i <= 8; i++) {
        matches.push(mkMatch(`p17-r1-m${i}`, 'p17', 1, {
            sourceMatchId1: `wb-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p17-r2-m${Math.ceil(i / 2)}`,   // Winner to 17-24 path
            loserMatchId: `p25-r1-m${Math.ceil(i / 2)}`   // Loser to 25-32 path
        }));
    }

    // 17-24 Path (Winners of p17-r1)
    for (let i = 1; i <= 4; i++) { // R2 of P17
        matches.push(mkMatch(`p17-r2-m${i}`, 'p17', 2, {
            sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `p17-r3-m${Math.ceil(i / 2)}`, // Winner to 17-20
            loserMatchId: `p21-r1-m${Math.ceil(i / 2)}` // Loser to 21-24
        }));
    }
    // 17-20 Path (Winners of p17-r2)
    for (let i = 1; i <= 2; i++) { // R3 of P17
        matches.push(mkMatch(`p17-r3-m${i}`, 'p17', 3, {
            sourceMatchId1: `p17-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p17-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `p17-f`,
            loserMatchId: `p19-f`
        }));
    }
    matches.push(mkMatch(`p17-f`, 'p17', 4, { // 17th Place
        sourceMatchId1: `p17-r3-m1`, sourceType1: 'winner',
        sourceMatchId2: `p17-r3-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p19-f`, 'p17', 4, { // 19th Place
        sourceMatchId1: `p17-r3-m1`, sourceType1: 'loser',
        sourceMatchId2: `p17-r3-m2`, sourceType2: 'loser'
    }));

    // 21-24 Path (Losers of p17-r2)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p21-r1-m${i}`, 'p21', 1, {
            sourceMatchId1: `p17-r2-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p17-r2-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p21-f`,
            loserMatchId: `p23-f`
        }));
    }
    matches.push(mkMatch(`p21-f`, 'p21', 2, { // 21st Place
        sourceMatchId1: `p21-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p21-r1-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p23-f`, 'p21', 2, { // 23rd Place
        sourceMatchId1: `p21-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p21-r1-m2`, sourceType2: 'loser'
    }));


    // 25-32 Path (Losers of p17-r1)
    // R1 for this group (4 matches)
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`p25-r1-m${i}`, 'p25', 1, {
            sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p25-r2-m${Math.ceil(i / 2)}`,  // Winner to 25-28
            loserMatchId: `p29-r1-m${Math.ceil(i / 2)}`  // Loser to 29-32
        }));
    }
    // 25-28 Path (Winners of p25-r1)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p25-r2-m${i}`, 'p25', 2, {
            sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `p25-f`,
            loserMatchId: `p27-f`
        }));
    }
    matches.push(mkMatch(`p25-f`, 'p25', 3, { // 25th Place
        sourceMatchId1: `p25-r2-m1`, sourceType1: 'winner',
        sourceMatchId2: `p25-r2-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p27-f`, 'p27', 3, { // 27th Place
        sourceMatchId1: `p25-r2-m1`, sourceType1: 'loser',
        sourceMatchId2: `p25-r2-m2`, sourceType2: 'loser'
    }));

    // 29-32 Path (Losers of p25-r1)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p29-r1-m${i}`, 'p29', 1, {
            sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p29-f`,
            loserMatchId: `p31-f`
        }));
    }
    matches.push(mkMatch(`p29-f`, 'p29', 2, { // 29th Place
        sourceMatchId1: `p29-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p29-r1-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p31-f`, 'p31', 2, { // 31st Place
        sourceMatchId1: `p29-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p29-r1-m2`, sourceType2: 'loser'
    }));

    return matches;
};

// --------------------------------------------------------------------------
// LOGIC: HYDRATION & UPDATES
// --------------------------------------------------------------------------

export const rebuildBracketState = (players, existingMatchesMap = {}) => {
    // 1. Prepare Seeds
    const seeds = [...players].sort((a, b) => {
        const eloA = parseInt(a.elo || 0);
        const eloB = parseInt(b.elo || 0);
        if (eloA !== eloB) return eloB - eloA;
        return (a.full_name || "").localeCompare(b.full_name || "");
    });
    // Fill to 32
    while (seeds.length < 32) seeds.push({ id: `bye-${seeds.length}`, full_name: "BYE", isBye: true });

    // Map players
    const playerMap = new Map();
    seeds.forEach(p => playerMap.set(p.id, p));

    // 2. Load Blueprint
    const allMatches = getBracketBlueprint().map(m => ({ ...m }));
    const matchMap = new Map();
    allMatches.forEach(m => matchMap.set(m.id, m));

    // 3. Initial Seeding (WB R1)
    const wbR1 = allMatches.filter(m => m.bracket === 'wb' && m.round === 1);
    wbR1.forEach((m, i) => {
        const [seed1Idx, seed2Idx] = SEEDING_PAIRS[i];
        if (seeds[seed1Idx - 1]) m.player1Id = seeds[seed1Idx - 1].id;
        if (seeds[seed2Idx - 1]) m.player2Id = seeds[seed2Idx - 1].id;
    });

    // 4. Processing Order (Topological Sort approximation)
    // We process WB 1->5, then generic placement rounds
    const processingGroups = [
        allMatches.filter(m => m.bracket === 'wb' && m.round === 1),
        allMatches.filter(m => m.bracket === 'wb' && m.round > 1),
        allMatches.filter(m => m.bracket !== 'wb') // Then everything else often resolves dynamically
    ];
    // Flatten
    // Better to just loop multiple passes or use strict dependency checks, 
    // but for this structure, we can just process all matches in id-order a few times or 
    // rely on a robust single pass if ordered correctly. 
    // Since our IDs imply dependency (R1->R2), sorting by Round helps.
    // However, Drops go from WB R1 -> P17 R1.
    // So WB R1 must be before P17 R1.
    const sortedMatches = [...allMatches].sort((a, b) => {
        // WB First
        if (a.bracket === 'wb' && b.bracket !== 'wb') return -1;
        if (a.bracket !== 'wb' && b.bracket === 'wb') return 1;
        // Then by Round
        return a.round - b.round;
    });

    // We might need multi-pass for complex drops, but let's try a directed resolve
    // Actually, just looping is safer.

    // 5. RESOLVE LOOP
    const resolve = () => {
        let changed = false;
        sortedMatches.forEach(match => {
            // A. Resolve Parents
            if (match.sourceMatchId1 && !match.player1Id) {
                const src = matchMap.get(match.sourceMatchId1);
                if (src && src.winnerId && src.status === 'finished') {
                    // Decide Winner vs Loser
                    const p = match.sourceType1 === 'winner' ? src.winnerId : (src.winnerId === src.player1Id ? src.player2Id : src.player1Id);
                    if (p && match.player1Id !== p) { match.player1Id = p; changed = true; }
                }
            }
            if (match.sourceMatchId2 && !match.player2Id) {
                const src = matchMap.get(match.sourceMatchId2);
                if (src && src.winnerId && src.status === 'finished') {
                    const p = match.sourceType2 === 'winner' ? src.winnerId : (src.winnerId === src.player1Id ? src.player2Id : src.player1Id);
                    if (p && match.player2Id !== p) { match.player2Id = p; changed = true; }
                }
            }

            // B. Apply Scores / Auto-Win
            const p1 = playerMap.get(match.player1Id);
            const p2 = playerMap.get(match.player2Id);
            const saved = existingMatchesMap[match.id];

            // BYE Logic
            let autoWinner = null;
            if (match.player1Id && match.player2Id) {
                if (p1?.isBye) autoWinner = match.player2Id;
                else if (p2?.isBye) autoWinner = match.player1Id;
            }

            let newState = { ...match };

            if (autoWinner) {
                newState.winnerId = autoWinner;
                newState.score1 = (autoWinner === match.player1Id) ? 1 : 0;
                newState.score2 = (autoWinner === match.player2Id) ? 1 : 0;
                newState.status = 'finished';
            } else if (saved && (saved.score1 !== null || saved.score2 !== null)) {
                newState.score1 = saved.score1;
                newState.score2 = saved.score2;
                newState.microPoints = saved.micro_points || [];
                newState.winnerId = saved.winnerId;

                // If not explicitly set winner but scores exist, deduce it
                if (!newState.winnerId && (newState.score1 !== null && newState.score2 !== null)) {
                    const bestOf = (match.bracket === 'wb' || match.id.endsWith('-f')) ? 5 : 3; // WB and Finals are Bo5
                    const thresh = Math.ceil(bestOf / 2);
                    if (newState.score1 >= thresh) newState.winnerId = match.player1Id;
                    else if (newState.score2 >= thresh) newState.winnerId = match.player2Id;
                }
                newState.status = newState.winnerId ? 'finished' : 'live';
            } else {
                newState.status = (match.player1Id && match.player2Id) ? 'pending' : 'scheduled';
                newState.winnerId = null;
            }

            // Detect Change
            if (newState.winnerId !== match.winnerId || newState.player1Id !== match.player1Id || newState.player2Id !== match.player2Id) {
                Object.assign(match, newState);
                changed = true;
            }
        });
        return changed;
    };

    // Run resolve multiple times to propagate through the tree
    for (let i = 0; i < 10; i++) {
        if (!resolve()) break;
    }

    return sortedMatches;
};

// Wrapper for compatibility
export const generateDoubleEliminationBracket = (players) => rebuildBracketState(players, {});

export const updateBracketMatch = (matches, matchId, score1, score2, microPoints = [], playersSource, winnerId = null, status = 'live') => {
    // 1. Snapshot current results
    const resultsMap = {};
    matches.forEach(m => {
        if (m.score1 !== null || m.score2 !== null || m.winnerId) {
            resultsMap[m.id] = {
                score1: m.score1,
                score2: m.score2,
                micro_points: m.microPoints,
                winnerId: m.winnerId,
                status: m.status
            };
        }
    });

    // 2. Update target
    resultsMap[matchId] = {
        score1: Number(score1),
        score2: Number(score2),
        micro_points: microPoints,
        winnerId,
        status
    };

    // 3. Rebuild
    return rebuildBracketState(playersSource, resultsMap);
};

export const clearBracketMatch = (matches, matchId, playersSource) => {
    const resultsMap = {};
    matches.forEach(m => {
        if (m.id !== matchId && (m.score1 !== null || m.score2 !== null)) {
            resultsMap[m.id] = {
                score1: m.score1,
                score2: m.score2,
                micro_points: m.microPoints,
                winnerId: m.winnerId,
                status: m.status
            };
        }
    });
    return rebuildBracketState(playersSource, resultsMap);
};
