
// --------------------------------------------------------------------------
// CONFIGURATION & BLUEPRINT
// --------------------------------------------------------------------------

// 1. Seeding Order (Standard 32-player snake/standard spread)
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

// STRICT BRAZILIAN MAPPING LOGIC (v15)
// Definitive source of truth for drops
const getTargetDropId = (sourceId) => {
    const parts = sourceId.split('-');
    if (parts.length < 3 || parts[0] !== 'wb') return null;

    const r = parseInt(parts[1].replace('r', ''), 10);
    const m = parseInt(parts[2].replace('m', ''), 10);

    // WB R1 -> LB R1
    if (r === 1) return `lb-r1-m${Math.ceil(m / 2)}`;
    // WB R2 -> LB R2 (Diagonal)
    if (r === 2) return `lb-r2-m${9 - m}`;
    // WB R3 -> LB R4 (Cross)
    if (r === 3) {
        if (m === 1) return 'lb-r4-m2';
        if (m === 2) return 'lb-r4-m1';
        if (m === 3) return 'lb-r4-m4';
        if (m === 4) return 'lb-r4-m3';
    }
    // WB R4 -> LB R6 (Cross)
    if (r === 4) {
        if (m === 1) return 'lb-r6-m2';
        if (m === 2) return 'lb-r6-m1';
    }
    // WB R5 (Final) -> Loser drops to Consolation Final (3rd Place Match / GF Qualifier)
    if (r === 5) {
        return `consolation-final`;
    }
    return null;
};

// FULLY EXPANDED MONRAD BLUEPRINT
export const getBracketBlueprint = () => {
    const matches = [];

    // --- WINNERS BRACKET (WB) ---
    // R1 (16 matches)
    for (let i = 1; i <= 16; i++) {
        const id = `wb-r1-m${i}`;
        matches.push(mkMatch(id, 'wb', 1, {
            nextMatchId: `wb-r2-m${Math.ceil(i / 2)}`,
            loserMatchId: getTargetDropId(id)
        }));
    }
    // R2 (8 matches)
    for (let i = 1; i <= 8; i++) {
        const id = `wb-r2-m${i}`;
        matches.push(mkMatch(id, 'wb', 2, {
            sourceMatchId1: `wb-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r3-m${Math.ceil(i / 2)}`,
            loserMatchId: getTargetDropId(id)
        }));
    }
    // R3 (4 matches)
    for (let i = 1; i <= 4; i++) {
        const id = `wb-r3-m${i}`;
        matches.push(mkMatch(id, 'wb', 3, {
            sourceMatchId1: `wb-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r4-m${Math.ceil(i / 2)}`,
            loserMatchId: getTargetDropId(id)
        }));
    }
    // R4 (2 matches)
    for (let i = 1; i <= 2; i++) {
        const id = `wb-r4-m${i}`;
        matches.push(mkMatch(id, 'wb', 4, {
            sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r5-m1`,
            loserMatchId: getTargetDropId(id)
        }));
    }
    // R5 (1 match) - WB Final
    matches.push(mkMatch(`wb-r5-m1`, 'wb', 5, {
        sourceMatchId1: `wb-r4-m1`, sourceType1: 'winner',
        sourceMatchId2: `wb-r4-m2`, sourceType2: 'winner',
        nextMatchId: `grand-final`,
        loserMatchId: `consolation-final`
    }));

    // --- LOSERS BRACKET (LB) ---

    // LB R1 (8 matches): Fed by WB R1 Losers
    for (let i = 1; i <= 8; i++) {
        matches.push(mkMatch(`lb-r1-m${i}`, 'lb', 1, {
            sourceMatchId1: `wb-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `lb-r2-m${i}`,
            loserMatchId: `p25-r1-m${Math.ceil(i / 2)}`
        }));
    }

    // LB R2 (8 matches): Fed by LB R1 Winners + WB R2 Losers
    for (let i = 1; i <= 8; i++) {
        const wbSourceIndex = 9 - i; // strict diagonal
        matches.push(mkMatch(`lb-r2-m${i}`, 'lb', 2, {
            sourceMatchId1: `lb-r1-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${wbSourceIndex}`, sourceType2: 'loser',
            nextMatchId: `lb-r3-m${Math.ceil(i / 2)}`,
            loserMatchId: `p17-r1-m${Math.ceil(i / 2)}`
        }));
    }

    // LB R3 (4 matches): Fed by LB R2 Winners
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`lb-r3-m${i}`, 'lb', 3, {
            sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `lb-r4-m${i}`,
            loserMatchId: `p13-r1-m${Math.ceil(i / 2)}`
        }));
    }

    // LB R4 (4 matches): Fed by LB R3 Winners + WB R3 Losers
    const getWbSourceR3 = (lbIdx) => {
        if (lbIdx === 1) return 2; if (lbIdx === 2) return 1;
        if (lbIdx === 3) return 4; if (lbIdx === 4) return 3;
        return 0;
    };
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`lb-r4-m${i}`, 'lb', 4, {
            sourceMatchId1: `lb-r3-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r3-m${getWbSourceR3(i)}`, sourceType2: 'loser',
            nextMatchId: `lb-r5-m${Math.ceil(i / 2)}`,
            loserMatchId: `p9-r1-m${Math.ceil(i / 2)}`
        }));
    }

    // LB R5 (2 matches): Fed by LB R4 Winners
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`lb-r5-m${i}`, 'lb', 5, {
            sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `lb-r6-m${i}`,
            loserMatchId: `p7-f`
        }));
    }

    // LB R6 (2 matches): Fed by LB R5 Winners + WB R4 Losers
    const getWbSourceR4 = (lbIdx) => {
        if (lbIdx === 1) return 2; if (lbIdx === 2) return 1;
        return 0;
    };
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`lb-r6-m${i}`, 'lb', 6, {
            sourceMatchId1: `lb-r5-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r4-m${getWbSourceR4(i)}`, sourceType2: 'loser',
            nextMatchId: `lb-final`,
            loserMatchId: `p5-f`
        }));
    }

    // LB Final
    matches.push(mkMatch(`lb-final`, 'lb', 7, {
        sourceMatchId1: `lb-r6-m1`, sourceType1: 'winner',
        sourceMatchId2: `lb-r6-m2`, sourceType2: 'winner',
        nextMatchId: `consolation-final`,
        loserMatchId: `p4-f`
    }));

    // --- FINALS ---

    // Consolation Final (3rd Place Match / Gateway to GF)
    // Winner goes to Grand Final.
    // Loser is 3rd Place.
    matches.push(mkMatch(`consolation-final`, 'gf', 1, {
        sourceMatchId1: `wb-r5-m1`, sourceType1: 'loser',
        sourceMatchId2: `lb-final`, sourceType2: 'winner',
        nextMatchId: `grand-final`
        // Loser gets 3rd place implicitly (terminal for loser)
    }));

    // Grand Final
    // Winner is 1st, Loser is 2nd.
    matches.push(mkMatch(`grand-final`, 'gf', 2, {
        sourceMatchId1: `wb-r5-m1`, sourceType1: 'winner',
        sourceMatchId2: `consolation-final`, sourceType2: 'winner'
    }));


    // --- PLACEMENT BRACKETS (MONRAD EXPANSION) ---

    // 1. Group 25-32 (Fed by LB R1 losers)
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`p25-r1-m${i}`, 'p25', 1, {
            sourceMatchId1: `lb-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p25-r2-m${Math.ceil(i / 2)}`,
            loserMatchId: `p29-r1-m${Math.ceil(i / 2)}`
        }));
    }
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


    // 2. Group 17-24 (Fed by LB R2 losers)
    for (let i = 1; i <= 4; i++) {
        matches.push(mkMatch(`p17-r1-m${i}`, 'p17', 1, {
            sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p17-r2-m${Math.ceil(i / 2)}`,
            loserMatchId: `p21-r1-m${Math.ceil(i / 2)}`
        }));
    }
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p17-r2-m${i}`, 'p17', 2, {
            sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `p17-f`,
            loserMatchId: `p19-f`
        }));
    }
    matches.push(mkMatch(`p17-f`, 'p17', 3, { // 17th Place
        sourceMatchId1: `p17-r2-m1`, sourceType1: 'winner',
        sourceMatchId2: `p17-r2-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p19-f`, 'p19', 3, { // 19th Place
        sourceMatchId1: `p17-r2-m1`, sourceType1: 'loser',
        sourceMatchId2: `p17-r2-m2`, sourceType2: 'loser'
    }));
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p21-r1-m${i}`, 'p21', 1, {
            sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p21-f`,
            loserMatchId: `p23-f`
        }));
    }
    matches.push(mkMatch(`p21-f`, 'p21', 2, { // 21st Place
        sourceMatchId1: `p21-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p21-r1-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p23-f`, 'p23', 2, { // 23rd Place
        sourceMatchId1: `p21-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p21-r1-m2`, sourceType2: 'loser'
    }));


    // 3. Group 13-16 (Fed by LB R3 losers)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p13-r1-m${i}`, 'p13', 1, {
            sourceMatchId1: `lb-r3-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r3-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p13-f`,
            loserMatchId: `p15-f`
        }));
    }
    matches.push(mkMatch(`p13-f`, 'p13', 2, { // 13th Place
        sourceMatchId1: `p13-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p13-r1-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p15-f`, 'p15', 2, { // 15th Place
        sourceMatchId1: `p13-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p13-r1-m2`, sourceType2: 'loser'
    }));


    // 4. Group 9-12 (Fed by LB R4 losers)
    for (let i = 1; i <= 2; i++) {
        matches.push(mkMatch(`p9-r1-m${i}`, 'p9', 1, {
            sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p9-f`,
            loserMatchId: `p11-f`
        }));
    }
    matches.push(mkMatch(`p9-f`, 'p9', 2, { // 9th Place
        sourceMatchId1: `p9-r1-m1`, sourceType1: 'winner',
        sourceMatchId2: `p9-r1-m2`, sourceType2: 'winner'
    }));
    matches.push(mkMatch(`p11-f`, 'p11', 2, { // 11th Place
        sourceMatchId1: `p9-r1-m1`, sourceType1: 'loser',
        sourceMatchId2: `p9-r1-m2`, sourceType2: 'loser'
    }));


    // 5. 7th Place (Fed by LB R5 losers)
    matches.push(mkMatch(`p7-f`, 'p7', 1, {
        sourceMatchId1: `lb-r5-m1`, sourceType1: 'loser',
        sourceMatchId2: `lb-r5-m2`, sourceType2: 'loser'
    }));

    // 6. 5th Place (Fed by LB R6 losers)
    matches.push(mkMatch(`p5-f`, 'p5', 1, {
        sourceMatchId1: `lb-r6-m1`, sourceType1: 'loser',
        sourceMatchId2: `lb-r6-m2`, sourceType2: 'loser'
    }));

    // 7. 4th Place (Fed by LB Final loser)
    matches.push(mkMatch(`p4-f`, 'p4', 1, {
        sourceMatchId1: `lb-final`, sourceType1: 'loser',
        sourceMatchId2: null, sourceType2: null // One player? No, waiting for logic or just a slot. Actually, normally p4 is just the label for the loser. 
        // But the user requested "assign to p4-f for order".
        // Wait, p4-f is a match? With whom? 
        // 4th place is a SINGLE player (the loser of LB Final). They don't play a match for 4th. They ARE 4th.
        // If I create a match `p4-f`, it will look empty if it has only 1 player.
        // However, I will create it as a placeholder if requested, maybe for display.
        // Or I can just leave it as a terminal state.
        // Let's create it but populated by just one player to signify the rank? 
        // No, standard is: loser of LB Final IS 4th.
        // But user said: "Przegrany zajmuje 4. miejsce (możesz go przypisać do p4-f dla porządku)".
        // I will link it. Display might be weird if single player.
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

    // 4. Processing Order: WB -> LB -> Placement
    const sortedMatches = [...allMatches].sort((a, b) => {
        if (a.bracket === 'wb' && b.bracket !== 'wb') return -1;
        if (a.bracket !== 'wb' && b.bracket === 'wb') return 1;
        if (a.bracket === 'lb' && b.bracket !== 'lb') return -1;
        if (a.bracket !== 'lb' && b.bracket === 'lb') return 1;
        return a.round - b.round;
    });

    // 5. RESOLVE LOOP
    const resolve = () => {
        let changed = false;
        sortedMatches.forEach(match => {
            // A. STANDARD SOURCE PULL (Parent -> Child)
            if (match.sourceMatchId1 && !match.player1Id) {
                const src = matchMap.get(match.sourceMatchId1);
                if (src && src.winnerId && src.status === 'finished') {
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

            // B. STRICT MAPPING ENFORCEMENT (WB -> LB Overrides)
            if (match.bracket === 'wb' && match.status === 'finished' && match.winnerId) {
                const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
                const targetId = getTargetDropId(match.id);

                if (loserId && targetId) {
                    const targetMatch = matchMap.get(targetId);
                    if (targetMatch) {
                        let slot = 0;
                        if (targetMatch.sourceMatchId1 === match.id) slot = 1;
                        else if (targetMatch.sourceMatchId2 === match.id) slot = 2;

                        if (slot === 1 && targetMatch.player1Id !== loserId) {
                            targetMatch.player1Id = loserId;
                            changed = true;
                        }
                        if (slot === 2 && targetMatch.player2Id !== loserId) {
                            targetMatch.player2Id = loserId;
                            changed = true;
                        }
                    }
                }
            }

            // C. Apply Scores / Auto-Win
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

                // Auto-determine winner
                if (!newState.winnerId && (newState.score1 !== null && newState.score2 !== null)) {
                    // BO5 Logic for Finals
                    const isBo5 = match.bracket === 'wb' || match.bracket === 'gf' || match.id === 'lb-final';
                    const bestOf = isBo5 ? 5 : 3;
                    const thresh = Math.ceil(bestOf / 2);
                    if (newState.score1 >= thresh) newState.winnerId = match.player1Id;
                    else if (newState.score2 >= thresh) newState.winnerId = match.player2Id;
                }

                // FORCE LIVE STATUS if scores exist but no winner
                if (newState.winnerId) {
                    newState.status = 'finished';
                } else if (newState.score1 > 0 || newState.score2 > 0 || (newState.microPoints && newState.microPoints.length > 0)) {
                    newState.status = 'live';
                } else {
                    // Keep existing status if provided (e.g. from saved) or default to live if strictly score present
                    newState.status = saved.status === 'finished' ? 'finished' : 'live';
                }
            } else {
                newState.status = (match.player1Id && match.player2Id) ? 'pending' : 'scheduled';
                newState.winnerId = null;
            }

            if (newState.winnerId !== match.winnerId || newState.player1Id !== match.player1Id || newState.player2Id !== match.player2Id) {
                Object.assign(match, newState);
                changed = true;
            }
        });
        return changed;
    };

    for (let i = 0; i < 20; i++) {
        if (!resolve()) break;
    }

    return sortedMatches;
};

// Wrapper for compatibility
export const generateDoubleEliminationBracket = (players) => rebuildBracketState(players, {});

export const updateBracketMatch = (matches, matchId, score1, score2, microPoints = [], playersSource, winnerId = null, status = 'live') => {
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

    resultsMap[matchId] = {
        score1: Number(score1),
        score2: Number(score2),
        micro_points: microPoints,
        winnerId,
        status
    };

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