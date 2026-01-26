import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const storedAuth = localStorage.getItem('rpo_admin');
        if (storedAuth === 'true') {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const login = (username: string, password: string): boolean => {
        const u = username.normalize("NFKC").trim();
        const p = password.normalize("NFKC").trim();

        if (u === 'kacper' && p === 'rpo26') {
            localStorage.setItem('rpo_admin', 'true');
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        localStorage.removeItem('rpo_admin');
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        // If used outside provider, return default "guest" state or throw
        // For safety, let's return a default object to avoid crashes, 
        // essentially mocking a not-authenticated state.
        return {
            isAuthenticated: false,
            isLoading: false,
            login: () => false,
            logout: () => { }
        };
    }
    return context;
};
