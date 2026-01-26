import React from 'react';
import { useTranslation } from 'react-i18next';

const PageContainer = ({ titleKey, titleDefault }) => {
    const { t } = useTranslation();
    const title = titleKey ? t(titleKey) : titleDefault;

    return (
        <div className="card fade-in" style={{ padding: '2rem', height: '100%' }}>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{title}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
                {t('pages.content_placeholder', { title })}
            </p>
        </div>
    );
};

export const Live = () => <PageContainer titleKey="navigation.live" />;
export const Organizer = () => <PageContainer titleKey="navigation.organizer" />;

export { default as Standings } from './Standings';

import { useState, useEffect } from 'react';
import { usePlayers } from '../hooks/usePlayers';
import { useMatches } from '../hooks/useMatches';

export const Settings = () => {
    const { t } = useTranslation();
    return (
        <div className="card fade-in" style={{ padding: '2rem', height: '100%' }}>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t('navigation.settings')}</h1>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', color: '#0369a1' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{t('settings.localModeTitle')}</h3>
                <p>{t('settings.localModeDesc')}</p>
            </div>
        </div>
    );
};
