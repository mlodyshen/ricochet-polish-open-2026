import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Trophy, TrendingUp, Filter } from 'lucide-react';
import { getCountryCode } from '../constants/countries';
import './Ranking.css';

const TOURNAMENTS = [
    "Polish 2026", "Hungary 2025", "German 2025", "Czech 2025",
    "Poland 2025", "Hungary 2024", "German 2024", "Czech 2024"
];

const RANKING_DATA = [
    { rank: 1, lastRank: 1, name: "Michal Bodis", country: "Czech Republic", points: 3200, tournaments: 4, average: 800, results: { "Hungary 2025": { place: 1, pts: 800 }, "Czech 2025": { place: 1, pts: 800 }, "Poland 2025": { place: 1, pts: 800 }, "German 2024": { place: 1, pts: 800 } } },
    { rank: 2, lastRank: 3, name: "Jiří Krůček", country: "Czech Republic", points: 2600, tournaments: 8, average: 325, results: { "Polish 2026": { place: 1, pts: 800 }, "Hungary 2025": { place: 2, pts: 650 }, "German 2025": { place: 3, pts: 300 }, "Czech 2025": { place: 5, pts: 175 }, "Poland 2025": { place: 3, pts: 300 }, "Hungary 2024": { place: 7, pts: 125 }, "German 2024": { place: 3, pts: 300 }, "Czech 2024": { place: 2, pts: 400 } } },
    { rank: 3, lastRank: 2, name: "Petr Malý", country: "Czech Republic", points: 2000, tournaments: 4, average: 500, results: { "Hungary 2025": { place: 4, pts: 200 }, "German 2025": { place: 1, pts: 800 }, "Czech 2025": { place: 2, pts: 400 }, "Poland 2025": { place: 2, pts: 400 } } },
    { rank: 4, lastRank: 5, name: "Martin Portl", country: "Czech Republic", points: 1352, tournaments: 7, average: 193, results: { "Hungary 2025": { place: 9, pts: 90 }, "German 2025": { place: 11, pts: 80 }, "Czech 2025": { place: 10, pts: 85 }, "Poland 2025": { place: 6, pts: 150 }, "Hungary 2024": { place: 10, pts: 85 }, "German 2024": { place: 18, pts: 62 }, "Czech 2024": { place: 1, pts: 800 } } },
    { rank: 5, lastRank: 7, name: "Elisabeth Faust", country: "Germany", points: 1328, tournaments: 8, average: 166, results: { "Polish 2026": { place: 2, pts: 400 }, "Hungary 2025": { place: 8, pts: 100 }, "German 2025": { place: 4, pts: 200 }, "Czech 2025": { place: 8, pts: 100 }, "Poland 2025": { place: 12, pts: 78 }, "Hungary 2024": { place: 5, pts: 175 }, "German 2024": { place: 6, pts: 150 }, "Czech 2024": { place: 7, pts: 125 } } },
    { rank: 6, lastRank: 4, name: "Eduard Kočvara", country: "Czech Republic", points: 1125, tournaments: 7, average: 161, results: { "Hungary 2025": { place: 6, pts: 150 }, "German 2025": { place: 13, pts: 75 }, "Czech 2025": { place: 13, pts: 75 }, "Poland 2025": { place: 4, pts: 200 }, "Hungary 2024": { place: 3, pts: 300 }, "German 2024": { place: 5, pts: 175 }, "Czech 2024": { place: 6, pts: 150 } } },
    { rank: 7, lastRank: 6, name: "Gábor Szabo jr.", country: "Hungary", points: 1100, tournaments: 2, average: 550, results: { "Hungary 2025": { place: 3, pts: 300 }, "Hungary 2024": { place: 1, pts: 800 } } },
    { rank: 8, lastRank: 6, name: "András Csala", country: "Hungary", points: 1100, tournaments: 5, average: 220, results: { "Hungary 2025": { place: 5, pts: 175 }, "German 2025": { place: 6, pts: 150 }, "Poland 2025": { place: 5, pts: 175 }, "Hungary 2024": { place: 2, pts: 400 }, "German 2024": { place: 4, pts: 200 } } },
    { rank: 9, lastRank: 9, name: "Ralf Pretzschner", country: "Germany", points: 1025, tournaments: 4, average: 256, results: { "Polish 2026": { place: 3, pts: 300 }, "German 2025": { place: 5, pts: 175 }, "Hungary 2024": { place: 6, pts: 150 }, "German 2024": { place: 2, pts: 400 } } },
    { rank: 10, lastRank: 8, name: "Marc Müller", country: "Germany", points: 740, tournaments: 6, average: 123, results: { "Hungary 2025": { place: 7, pts: 125 }, "German 2025": { place: 7, pts: 125 }, "Czech 2025": { place: 7, pts: 125 }, "Poland 2025": { place: 9, pts: 90 }, "Hungary 2024": { place: 8, pts: 100 }, "Czech 2024": { place: 5, pts: 175 } } },
    { rank: 11, lastRank: 12, name: "Lubos Falada", country: "Czech Republic", points: 665, tournaments: 5, average: 133, results: { "Polish 2026": { place: 4, pts: 200 }, "German 2025": { place: 8, pts: 100 }, "Czech 2025": { place: 6, pts: 150 }, "Poland 2025": { place: 7, pts: 125 }, "Czech 2024": { place: 9, pts: 90 } } },
    { rank: 12, lastRank: 15, name: "Bartosz Anzulewicz", country: "Poland", points: 601, tournaments: 8, average: 75, results: { "Polish 2026": { place: 5, pts: 175 }, "Hungary 2025": { place: 12, pts: 78 }, "German 2025": { place: 18, pts: 62 }, "Czech 2025": { place: 22, pts: 54 }, "Poland 2025": { place: 26, pts: 47 }, "Hungary 2024": { place: 13, pts: 75 }, "German 2024": { place: 20, pts: 58 }, "Czech 2024": { place: 23, pts: 52 } } },
    { rank: 13, lastRank: 10, name: "Marco Müller", country: "Germany", points: 530, tournaments: 5, average: 106, results: { "Czech 2025": { place: 11, pts: 80 }, "Poland 2025": { place: 11, pts: 80 }, "Hungary 2024": { place: 4, pts: 200 }, "German 2024": { place: 10, pts: 85 }, "Czech 2024": { place: 10, pts: 85 } } },
    { rank: 14, lastRank: 14, name: "Szymon Gober", country: "Poland", points: 524, tournaments: 8, average: 66, results: { "Polish 2026": { place: 13, pts: 75 }, "Hungary 2025": { place: 14, pts: 73 }, "German 2025": { place: 15, pts: 70 }, "Czech 2025": { place: 26, pts: 47 }, "Poland 2025": { place: 23, pts: 52 }, "Hungary 2024": { place: 11, pts: 80 }, "German 2024": { place: 16, pts: 65 }, "Czech 2024": { place: 18, pts: 62 } } },
    { rank: 15, lastRank: 13, name: "Felix Förster", country: "Germany", points: 520, tournaments: 6, average: 87, results: { "Polish 2026": { place: 6, pts: 150 }, "German 2025": { place: 22, pts: 54 }, "Poland 2025": { place: 8, pts: 100 }, "Hungary 2024": { place: 9, pts: 90 }, "German 2024": { place: 12, pts: 78 }, "Czech 2024": { place: 48, pts: 48 } } },
    { rank: 16, lastRank: 11, name: "Jos Slob", country: "Netherlands", points: 489, tournaments: 6, average: 82, results: { "Polish 2026": { place: 7, pts: 125 }, "Hungary 2025": { place: 11, pts: 80 }, "German 2025": { place: 12, pts: 78 }, "Czech 2025": { place: 14, pts: 73 }, "German 2024": { place: 19, pts: 60 }, "Czech 2024": { place: 14, pts: 73 } } },
    { rank: 17, lastRank: 16, name: "Martin Kloucek", country: "Czech Republic", points: 403, tournaments: 3, average: 134, results: { "Czech 2025": { place: 12, pts: 78 }, "German 2024": { place: 7, pts: 125 }, "Czech 2024": { place: 4, pts: 200 } } },
    { rank: 18, lastRank: 17, name: "Oliver Mende", country: "Germany", points: 400, tournaments: 1, average: 400, results: { "German 2025": { place: 2, pts: 400 } } },
    { rank: 19, lastRank: 22, name: "Adam Andzel", country: "Poland", points: 380, tournaments: 5, average: 76, results: { "Polish 2026": { place: 8, pts: 100 }, "Czech 2025": { place: 15, pts: 70 }, "Poland 2025": { place: 15, pts: 70 }, "German 2024": { place: 11, pts: 80 }, "Czech 2024": { place: 19, pts: 60 } } },
    { rank: 20, lastRank: 19, name: "Phillip Träber", country: "Germany", points: 379, tournaments: 5, average: 76, results: { "German 2025": { place: 9, pts: 90 }, "Czech 2025": { place: 17, pts: 64 }, "Poland 2025": { place: 13, pts: 75 }, "German 2024": { place: 13, pts: 75 }, "Czech 2024": { place: 13, pts: 75 } } },
    { rank: 21, lastRank: 18, name: "Stefan Jacob", country: "Germany", points: 355, tournaments: 5, average: 71, results: { "Polish 2026": { place: 10, pts: 85 }, "Hungary 2025": { place: 10, pts: 85 }, "German 2025": { place: 14, pts: 73 }, "Poland 2025": { place: 17, pts: 64 }, "German 2024": { place: 25, pts: 48 } } },
    { rank: 22, lastRank: 25, name: "Adam Pomian", country: "Poland", points: 343, tournaments: 5, average: 69, results: { "Polish 2026": { place: 9, pts: 90 }, "German 2025": { place: 21, pts: 56 }, "Czech 2025": { place: 18, pts: 62 }, "Poland 2025": { place: 18, pts: 62 }, "German 2024": { place: 14, pts: 73 } } },
    { rank: 23, lastRank: 21, name: "Martin Volf", country: "Czech Republic", points: 300, tournaments: 1, average: 300, results: { "Czech 2025": { place: 3, pts: 300 } } },
    { rank: 23, lastRank: 21, name: "Jakub Solin", country: "Czech Republic", points: 300, tournaments: 1, average: 300, results: { "Czech 2024": { place: 3, pts: 300 } } },
    { rank: 25, lastRank: 21, name: "Jaroslav Třasák", country: "Czech Republic", points: 300, tournaments: 5, average: 60, results: { "Polish 2026": { place: 16, pts: 65 }, "Czech 2025": { place: 27, pts: 46 }, "Poland 2025": { place: 16, pts: 65 }, "Hungary 2024": { place: 12, pts: 78 }, "Czech 2024": { place: 27, pts: 46 } } },
    { rank: 26, lastRank: 23, name: "Thomas Sablotni", country: "Germany", points: 279, tournaments: 5, average: 56, results: { "Hungary 2025": { place: 13, pts: 75 }, "German 2025": { place: 27, pts: 46 }, "Poland 2025": { place: 22, pts: 54 }, "German 2024": { place: 27, pts: 46 }, "Czech 2024": { place: 20, pts: 58 } } },
    { rank: 27, lastRank: 26, name: "Daria Kwiatkowska", country: "Poland", points: 266, tournaments: 6, average: 44, results: { "Polish 2026": { place: 31, pts: 42 }, "Hungary 2025": { place: 19, pts: 60 }, "Czech 2025": { place: 29, pts: 44 }, "Poland 2025": { place: 31, pts: 42 }, "German 2024": { place: 34, pts: 35 }, "Czech 2024": { place: 30, pts: 43 } } },
    { rank: 28, lastRank: 29, name: "Rocco Klemm", country: "Germany", points: 263, tournaments: 5, average: 53, results: { "Polish 2026": { place: 29, pts: 44 }, "Hungary 2025": { place: 17, pts: 64 }, "Poland 2025": { place: 32, pts: 41 }, "Hungary 2024": { place: 14, pts: 73 }, "Czech 2024": { place: 32, pts: 41 } } },
    { rank: 29, lastRank: 24, name: "Michael van Noort", country: "Netherlands", points: 254, tournaments: 4, average: 64, results: { "Polish 2026": { place: 17, pts: 64 }, "German 2025": { place: 19, pts: 60 }, "Czech 2025": { place: 19, pts: 60 }, "Czech 2024": { place: 15, pts: 70 } } },
    { rank: 30, lastRank: 20, name: "Tobias Hambsch", country: "Germany", points: 235, tournaments: 3, average: 78, results: { "Poland 2025": { place: 10, pts: 85 }, "German 2024": { place: 15, pts: 70 }, "Czech 2024": { place: 11, pts: 80 } } },
    { rank: 31, lastRank: 35, name: "Jeanette Groh", country: "Germany", points: 231, tournaments: 5, average: 46, results: { "Polish 2026": { place: 23, pts: 52 }, "German 2025": { place: 28, pts: 45 }, "Poland 2025": { place: 27, pts: 46 }, "German 2024": { place: 29, pts: 44 }, "Czech 2024": { place: 29, pts: 44 } } },
    { rank: 32, lastRank: 27, name: "Ladislav Tesárek", country: "Czech Republic", points: 228, tournaments: 3, average: 76, results: { "Hungary 2025": { place: 15, pts: 70 }, "Czech 2025": { place: 20, pts: 58 }, "Czech 2024": { place: 8, pts: 100 } } },
    { rank: 33, lastRank: 36, name: "Igor Gober", country: "Poland", points: 218, tournaments: 4, average: 55, results: { "Polish 2026": { place: 21, pts: 56 }, "Hungary 2025": { place: 16, pts: 65 }, "Czech 2025": { place: 23, pts: 52 }, "Poland 2025": { place: 28, pts: 45 } } },
    { rank: 34, lastRank: 30, name: "Jochen Rudolph", country: "Germany", points: 210, tournaments: 3, average: 70, results: { "German 2025": { place: 24, pts: 50 }, "Poland 2025": { place: 19, pts: 60 }, "German 2024": { place: 8, pts: 100 } } },
    { rank: 35, lastRank: 31, name: "Rigo Grunert", country: "Germany", points: 205, tournaments: 3, average: 68, results: { "German 2025": { place: 10, pts: 85 }, "Poland 2025": { place: 21, pts: 56 }, "German 2024": { place: 17, pts: 64 } } },
    { rank: 36, lastRank: 32, name: "Pavel Bodis", country: "Czech Republic", points: 200, tournaments: 1, average: 200, results: { "Czech 2025": { place: 4, pts: 200 } } },
    { rank: 37, lastRank: 33, name: "Sonja de Ruiter", country: "Netherlands", points: 193, tournaments: 3, average: 64, results: { "Polish 2026": { place: 15, pts: 70 }, "German 2025": { place: 20, pts: 58 }, "Czech 2025": { place: 16, pts: 65 } } },
    { rank: 38, lastRank: 34, name: "Nick van Delden", country: "Netherlands", points: 180, tournaments: 3, average: 60, results: { "Polish 2026": { place: 11, pts: 80 }, "German 2025": { place: 23, pts: 52 }, "Czech 2025": { place: 25, pts: 48 } } },
    { rank: 39, lastRank: 41, name: "Patryk Bacewicz", country: "Poland", points: 177, tournaments: 3, average: 59, results: { "Polish 2026": { place: 14, pts: 73 }, "Poland 2025": { place: 25, pts: 48 }, "German 2024": { place: 21, pts: 56 } } },
    { rank: 40, lastRank: 42, name: "Mateusz Danielewicz", country: "Poland", points: 162, tournaments: 3, average: 54, results: { "Polish 2026": { place: 19, pts: 60 }, "Poland 2025": { place: 24, pts: 50 }, "German 2024": { place: 23, pts: 52 } } },
    { rank: 41, lastRank: 51, name: "Arkadiusz Borkiewicz", country: "Poland", points: 151, tournaments: 2, average: 76, results: { "Polish 2026": { place: 12, pts: 78 }, "Poland 2025": { place: 14, pts: 73 } } },
    { rank: 42, lastRank: 37, name: "André Steiner", country: "Germany", points: 142, tournaments: 3, average: 47, results: { "Czech 2025": { place: 30, pts: 43 }, "German 2024": { place: 28, pts: 45 }, "Czech 2024": { place: 22, pts: 54 } } },
    { rank: 43, lastRank: 38, name: "Matthias Schulz", country: "Germany", points: 138, tournaments: 3, average: 46, results: { "Czech 2025": { place: 24, pts: 50 }, "Poland 2025": { place: 30, pts: 43 }, "Czech 2024": { place: 28, pts: 45 } } },
    { rank: 44, lastRank: 39, name: "Jan Škutina", country: "Czech Republic", points: 121, tournaments: 2, average: 61, results: { "Czech 2025": { place: 21, pts: 56 }, "Czech 2024": { place: 16, pts: 65 } } },
    { rank: 45, lastRank: 40, name: "Marcin Myszkowski", country: "Poland", points: 108, tournaments: 2, average: 54, results: { "Hungary 2024": { place: 16, pts: 65 }, "German 2024": { place: 30, pts: 43 } } },
    { rank: 46, lastRank: 59, name: "Sylvester Rötschke", country: "Germany", points: 108, tournaments: 2, average: 54, results: { "Polish 2026": { place: 27, pts: 46 }, "Hungary 2025": { place: 18, pts: 62 } } },
    { rank: 47, lastRank: 66, name: "Szymon Witkowski", country: "Poland", points: 106, tournaments: 2, average: 53, results: { "Polish 2026": { place: 18, pts: 62 }, "Poland 2025": { place: 29, pts: 44 } } },
    { rank: 48, lastRank: 43, name: "René Wieten", country: "Netherlands", points: 101, tournaments: 2, average: 51, results: { "German 2025": { place: 26, pts: 47 }, "German 2024": { place: 22, pts: 54 } } },
    { rank: 49, lastRank: 44, name: "Cezary Butkiewicz", country: "Poland", points: 100, tournaments: 2, average: 50, results: { "Poland 2025": { place: 20, pts: 58 }, "Czech 2024": { place: 31, pts: 42 } } },
    { rank: 50, lastRank: 45, name: "Michael Meyreiß", country: "Germany", points: 93, tournaments: 2, average: 47, results: { "German 2025": { place: 30, pts: 43 }, "German 2024": { place: 24, pts: 50 } } },
    { rank: 51, lastRank: 46, name: "Stephan Rusdorf", country: "Germany", points: 90, tournaments: 1, average: 90, results: { "German 2024": { place: 9, pts: 90 } } },
    { rank: 52, lastRank: 46, name: "Roman Cenek", country: "Czech Republic", points: 90, tournaments: 1, average: 90, results: { "Czech 2025": { place: 9, pts: 90 } } },
    { rank: 53, lastRank: 65, name: "Marta Lachacz", country: "Czech Republic", points: 90, tournaments: 2, average: 45, results: { "Polish 2026": { place: 28, pts: 45 }, "German 2025": { place: 28, pts: 45 } } },
    { rank: 54, lastRank: 47, name: "Gennadie Kleister", country: "Germany", points: 84, tournaments: 2, average: 42, results: { "German 2025": { place: 31, pts: 42 }, "German 2024": { place: 31, pts: 42 } } },
    { rank: 55, lastRank: 48, name: "Filip Rolenec", country: "Czech Republic", points: 78, tournaments: 1, average: 78, results: { "Czech 2024": { place: 12, pts: 78 } } },
    { rank: 56, lastRank: 49, name: "Eva Dvořáková", country: "Czech Republic", points: 77, tournaments: 2, average: 39, results: { "Czech 2025": { place: 32, pts: 41 }, "German 2024": { place: 33, pts: 36 } } },
    { rank: 57, lastRank: 52, name: "Jens Schwitalle", country: "Germany", points: 70, tournaments: 1, average: 70, results: { "Hungary 2024": { place: 15, pts: 70 } } },
    { rank: 58, lastRank: 54, name: "Maria ter Hoek", country: "Netherlands", points: 68, tournaments: 2, average: 34, results: { "Polish 2026": { place: 35, pts: 34 }, "German 2024": { place: 35, pts: 34 } } },
    { rank: 59, lastRank: 56, name: "Sylvio Lohs", country: "Germany", points: 65, tournaments: 1, average: 65, results: { "Polish 2026": { place: 16, pts: 65 } } },
    { rank: 60, lastRank: 57, name: "Jereon Wolvers", country: "Netherlands", points: 64, tournaments: 1, average: 64, results: { "Polish 2026": { place: 17, pts: 64 } } },
    { rank: 61, lastRank: 57, name: "Mirko Harnisch", country: "Germany", points: 64, tournaments: 1, average: 64, results: { "Czech 2024": { place: 17, pts: 64 } } },
    { rank: 62, lastRank: 60, name: "Gábor Szabo sr.", country: "Hungary", points: 58, tournaments: 1, average: 58, results: { "German 2025": { place: 20, pts: 58 } } },
    { rank: 63, lastRank: 0, name: "Kamil Waszkiewicz", country: "Poland", points: 58, tournaments: 1, average: 58, results: { "Polish 2026": { place: 20, pts: 58 } } },
    { rank: 64, lastRank: 61, name: "Tomás Zeman", country: "Czech Republic", points: 56, tournaments: 1, average: 56, results: { "Czech 2024": { place: 21, pts: 56 } } },
    { rank: 65, lastRank: 0, name: "Daniel Bilbin", country: "Poland", points: 54, tournaments: 1, average: 54, results: { "Polish 2026": { place: 22, pts: 54 } } },
    { rank: 66, lastRank: 62, name: "Jirí Herda", country: "Czech Republic", points: 50, tournaments: 1, average: 50, results: { "Czech 2024": { place: 24, pts: 50 } } },
    { rank: 67, lastRank: 0, name: "Karol Romanowski", country: "Poland", points: 50, tournaments: 1, average: 50, results: { "Polish 2026": { place: 24, pts: 50 } } },
    { rank: 68, lastRank: 63, name: "Christian Kauper", country: "Germany", points: 48, tournaments: 1, average: 48, results: { "German 2025": { place: 25, pts: 48 } } },
    { rank: 69, lastRank: 0, name: "Mariusz Chalecki", country: "Poland", points: 48, tournaments: 1, average: 48, results: { "Polish 2026": { place: 25, pts: 48 } } },
    { rank: 70, lastRank: 64, name: "Kacper Gober", country: "Poland", points: 47, tournaments: 1, average: 47, results: { "Czech 2024": { place: 26, pts: 47 } } },
    { rank: 71, lastRank: 64, name: "Jens Bartelt", country: "Germany", points: 47, tournaments: 1, average: 47, results: { "German 2024": { place: 26, pts: 47 } } },
    { rank: 72, lastRank: 0, name: "Aleksandra Bylak", country: "Poland", points: 47, tournaments: 1, average: 47, results: { "Polish 2026": { place: 26, pts: 47 } } },
    { rank: 73, lastRank: 66, name: "Jens Reuter-Schneider", country: "Germany", points: 44, tournaments: 1, average: 44, results: { "German 2025": { place: 29, pts: 44 } } },
    { rank: 74, lastRank: 0, name: "Maciej Letkiewicz", country: "Poland", points: 43, tournaments: 1, average: 43, results: { "Polish 2026": { place: 30, pts: 43 } } },
    { rank: 75, lastRank: 67, name: "Cindy Konkol", country: "Germany", points: 42, tournaments: 1, average: 42, results: { "German 2024": { place: 31, pts: 42 } } },
    { rank: 76, lastRank: 68, name: "Marco Wendrock", country: "Germany", points: 41, tournaments: 1, average: 41, results: { "German 2025": { place: 32, pts: 41 } } },
    { rank: 77, lastRank: 68, name: "Martin Prox", country: "Germany", points: 41, tournaments: 1, average: 41, results: { "German 2024": { place: 32, pts: 41 } } },
    { rank: 78, lastRank: 0, name: "Magda Zaborowska", country: "Poland", points: 41, tournaments: 1, average: 41, results: { "Polish 2026": { place: 32, pts: 41 } } },
    { rank: 79, lastRank: 69, name: "Stephanie Förster", country: "Germany", points: 36, tournaments: 1, average: 36, results: { "German 2025": { place: 33, pts: 36 } } },
    { rank: 80, lastRank: 70, name: "Svenja Hartmann", country: "Germany", points: 35, tournaments: 1, average: 35, results: { "German 2025": { place: 34, pts: 35 } } }
];

const Ranking = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRanking = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return RANKING_DATA.filter(p =>
            p.points > 0 &&
            (p.name.toLowerCase().includes(lower) || p.country.toLowerCase().includes(lower))
        );
    }, [searchTerm]);

    const getRankClass = (rank) => {
        if (rank === 1) return 'rank-top-1';
        if (rank === 2) return 'rank-top-2';
        if (rank === 3) return 'rank-top-3';
        return '';
    };

    const renderTrend = (cur, last) => {
        if (!last || cur === last) return <span className="trend-neutral">●</span>;
        if (cur < last) return <span className="trend-up">▲ {last - cur}</span>;
        return <span className="trend-down">▼ {cur - last}</span>;
    };

    return (
        <div className="ranking-container">
            <div className="ranking-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <TrendingUp className="accent-pink" size={32} />
                    <h1 className="ranking-title text-gradient">{t('navigation.ranking')}</h1>
                </div>

                <div className="search-input-wrapper" style={{ minWidth: '300px' }}>
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder={t('players.searchPlaceholder')}
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            <div className="ranking-card">
                <div className="ranking-table-wrapper">
                    <table className="ranking-table">
                        <thead>
                            <tr>
                                <th rowSpan={2} className="sticky-col sticky-rank">Rank</th>
                                <th rowSpan={2} className="sticky-col sticky-trend">Trend</th>
                                <th rowSpan={2} className="sticky-col sticky-player">Player</th>

                                {TOURNAMENTS.map(tourney => (
                                    <th key={tourney} colSpan={2} className="tourney-group">
                                        {tourney}
                                    </th>
                                ))}

                                <th rowSpan={2} style={{ textAlign: 'center' }}>Points</th>
                                <th rowSpan={2} style={{ textAlign: 'center' }}>Tournaments</th>
                                <th rowSpan={2} style={{ textAlign: 'center' }}>Average</th>
                            </tr>
                            <tr>
                                {TOURNAMENTS.map(tourney => (
                                    <React.Fragment key={`${tourney}-sub`}>
                                        <th className="sub-header">Place</th>
                                        <th className="sub-header">Points</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRanking.map((player) => (
                                <tr key={player.rank}>
                                    <td className={`rank-cell sticky-col sticky-rank ${getRankClass(player.rank)}`}>
                                        #{player.rank}
                                    </td>
                                    <td className="trend-cell sticky-col sticky-trend">
                                        {renderTrend(player.rank, player.lastRank)}
                                    </td>
                                    <td className="sticky-col sticky-player">
                                        <div className="player-cell">
                                            {getCountryCode(player.country) && (
                                                <img
                                                    className="flag-icon"
                                                    src={`https://flagcdn.com/24x18/${getCountryCode(player.country)}.png`}
                                                    alt={player.country}
                                                />
                                            )}
                                            <div className="player-info">
                                                <span className="player-name">{player.name}</span>
                                                <span className="player-country">{player.country}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {TOURNAMENTS.map(tourney => {
                                        const result = player.results?.[tourney];
                                        return (
                                            <React.Fragment key={`${player.rank}-${tourney}`}>
                                                <td className="secondary-cell cell-place">
                                                    {result?.place || '-'}
                                                </td>
                                                <td className="secondary-cell cell-pts">
                                                    {result?.pts || '-'}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}

                                    <td className="points-cell">
                                        {player.points.toLocaleString()}
                                    </td>
                                    <td className="secondary-cell">
                                        {player.tournaments}
                                    </td>
                                    <td className="secondary-cell">
                                        {player.average.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRanking.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No players found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Ranking;
