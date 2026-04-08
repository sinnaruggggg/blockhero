import {useEffect, useState} from 'react';
import {
  getCachedCreatorConfigSnapshot,
  subscribeCreatorConfig,
  type CreatorConfigSnapshot,
} from '../services/creatorService';

export function useCreatorConfig() {
  const [snapshot, setSnapshot] = useState<CreatorConfigSnapshot>(
    getCachedCreatorConfigSnapshot(),
  );

  useEffect(() => subscribeCreatorConfig(setSnapshot), []);

  return snapshot;
}
