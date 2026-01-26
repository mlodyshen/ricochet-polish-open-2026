export interface Player {
    id: string; // uuid
    full_name: string;
    country: string;
    elo: number;
}

export interface Match {
    id: string;
    match_order: number;
    bracket_type: string;
    round_id: number;
    player1_id: string | null;
    player2_id: string | null;
    score1: number;
    score2: number;
    micro_points: string; // Storing generic json/text for micro points if structure varies, or string
    status: 'scheduled' | 'in_progress' | 'finished';
    court: string;
}

export interface PlayerInput {
    full_name: string;
    country: string;
    elo: number;
}
