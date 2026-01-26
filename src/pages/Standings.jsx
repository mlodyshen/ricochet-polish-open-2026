
import React, { useMemo } from 'react';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { Trophy, Medal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Standings = () => {
    const { t } = useTranslation();
    const { matches } = useMatches();
    const { players } = usePlayers();

    const standingsData = useMemo(() => {
        if (!matches || matches.length === 0) return Array(32).fill(null);

        // Map to store player results
        // Key: PlayerID, Value: Rank
        const finalRanks = new Map();

        // 1. Check Grand Finals
        // If GF-M2 exists and is finished:
        const gf2 = matches.find(m => m.id === 'gf-m2');
        const gf1 = matches.find(m => m.id === 'gf-m1');

        let winnerId = null;
        let secondId = null;

        if (gf2 && gf2.winnerId) {
            winnerId = gf2.winnerId;
            // Loser is the other one
            secondId = gf2.player1Id === winnerId ? gf2.player2Id : gf2.player1Id;
        } else if (gf1 && gf1.winnerId) {
            // Check if bracket reset happened (logic usually handled by bracket generator showing/hiding gf2)
            // Assuming if GF2 is not played/generated, GF1 decides.
            // But strict DE means if WB winner loses GF1, GF2 happens.
            // For now simplified: if GF1 has winner, and no GF2 active, assume result.
            winnerId = gf1.winnerId;
            secondId = gf1.player1Id === winnerId ? gf1.player2Id : gf1.player1Id;
        }

        if (winnerId) finalRanks.set(winnerId, 1);
        if (secondId) finalRanks.set(secondId, 2);

        // 2. Check Losers Bracket Losses
        const lbMatches = matches.filter(m => m.bracket === 'lb' && m.winnerId);

        lbMatches.forEach(m => {
            const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
            // Only assign if not already assigned (higher rank takes precedence, though in DE you only lose out once from LB)
            if (!finalRanks.has(loserId)) {
                let rank = 0;
                switch (m.round) {
                    case 8: rank = 3; break;
                    case 7: rank = 4; break;
                    case 6: rank = 5; break; // 5-6
                    case 5: rank = 7; break; // 7-8
                    case 4: rank = 9; break; // 9-12
                    case 3: rank = 13; break; // 13-16
                    case 2: rank = 17; break; // 17-24
                    case 1: rank = 25; break; // 25-32
                    default: rank = 99;
                }
                finalRanks.set(loserId, rank);
            }
        });

        // 3. Create List
        // We need 32 slots.
        // Slots matching ranks.
        // Handles "Shared" ranks by placing them in the slots.
        // e.g. Rank 5 (2 people) -> Slots 5 and 6.
        // Rank 25 (8 people) -> Slots 25-32.

        const filledSlots = Array(32).fill(null);

        // Helper to find first empty slot for a rank range
        const findSlot = (startRank, count, playerId) => {
            // startRank 1-indexed. Array 0-indexed.
            // e.g. Rank 5, count 2 -> indices 4, 5.
            for (let i = 0; i < count; i++) {
                if (filledSlots[startRank - 1 + i] === null) {
                    filledSlots[startRank - 1 + i] = { rank: startRank, playerId };
                    return;
                }
            }
        };

        finalRanks.forEach((rank, pid) => {
            // Map DE rounds to slot counts
            if (rank === 1) findSlot(1, 1, pid);
            else if (rank === 2) findSlot(2, 1, pid);
            else if (rank === 3) findSlot(3, 1, pid);
            else if (rank === 4) findSlot(4, 1, pid);
            else if (rank === 5) findSlot(5, 2, pid);
            else if (rank === 7) findSlot(7, 2, pid);
            else if (rank === 9) findSlot(9, 4, pid);
            else if (rank === 13) findSlot(13, 4, pid);
            else if (rank === 17) findSlot(17, 8, pid);
            else if (rank === 25) findSlot(25, 8, pid);
        });

        return filledSlots;

    }, [matches, players]);

    const getPlayer = (id) => players.find(p => p.id === id);

    const renderRankIcon = (index) => {
        if (index === 0) return <Trophy size={24} color="#fbbf24" fill="#fbbf24" />; // Gold
        if (index === 1) return <Trophy size={24} color="#9ca3af" fill="#9ca3af" />; // Silver
        if (index === 2) return <Trophy size={24} color="#b45309" fill="#b45309" />; // Bronze
        return <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{index + 1}</span>;
    };

    return (
        <div className="card fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '0' }}>
            <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {t('navigation.standings')}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {t('standings.description')}
                </p>
            </div>

            <div className="standings-list">
                {standingsData.map((slot, index) => {
                    const player = slot ? getPlayer(slot.playerId) : null;
                    const isTop3 = index < 3;

                    return (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem 2rem',
                                borderBottom: '1px solid var(--border-color)',
                                background: isTop3 && player ? 'var(--bg-secondary)' : 'transparent',
                                transition: 'all 0.2s',
                                fontWeight: isTop3 && player ? 600 : 400
                            }}
                        >
                            <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                                {renderRankIcon(index)}
                            </div>

                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {player ? (
                                    <>
                                        <div style={{ fontSize: '1.1rem' }}>
                                            {player.full_name}
                                        </div>
                                        {player.country && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>{player.country}</span>}
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                        —
                                    </span>
                                )}
                            </div>

                            {/* Optional: Add ELO change or Points if needed */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Standings;
