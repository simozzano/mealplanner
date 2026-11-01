import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

// Valore: { source, settings, isMock, logout, resetMock }
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
