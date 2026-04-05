import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import {
  loadPersistedAppState,
  persistAppState,
} from '../../blockhero_persistence';
import {
  appReducer,
  initialState,
} from '../../blockhero_state';
import type {AppAction, AppState} from '../../blockhero_state';

interface BlockHeroRuntimeValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  hydrated: boolean;
}

const BlockHeroRuntimeContext = createContext<BlockHeroRuntimeValue | null>(null);

export function BlockHeroRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({type: 'tick', nowMs: Date.now()});
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const snapshot = await loadPersistedAppState();
      if (!mounted) {
        return;
      }

      if (snapshot) {
        dispatch({type: 'hydrate_state', snapshot});
      }

      setHydrated(true);
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    persistAppState(state).catch(() => undefined);
  }, [hydrated, state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      hydrated,
    }),
    [hydrated, state],
  );

  return (
    <BlockHeroRuntimeContext.Provider value={value}>
      {children}
    </BlockHeroRuntimeContext.Provider>
  );
}

export function useBlockHeroRuntime() {
  const context = useContext(BlockHeroRuntimeContext);

  if (!context) {
    throw new Error('useBlockHeroRuntime must be used inside BlockHeroRuntimeProvider');
  }

  return context;
}
