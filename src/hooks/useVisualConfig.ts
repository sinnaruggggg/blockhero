import {useEffect, useState} from 'react';
import {subscribeVisualConfig, getCachedVisualConfigSnapshot, type VisualConfigSnapshot} from '../services/visualConfigService';

export function useVisualConfig() {
  const [snapshot, setSnapshot] = useState<VisualConfigSnapshot>(
    getCachedVisualConfigSnapshot(),
  );

  useEffect(() => subscribeVisualConfig(setSnapshot), []);

  return snapshot;
}
