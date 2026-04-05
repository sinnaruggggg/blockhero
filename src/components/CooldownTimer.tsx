import React, {useState, useEffect} from 'react';
import {Text} from 'react-native';
import {formatCooldown} from '../constants/raidConfig';

interface CooldownTimerProps {
  expiresAt: number; // timestamp ms
  style?: any;
  onExpire?: () => void;
}

export default function CooldownTimer({expiresAt, style, onExpire}: CooldownTimerProps) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (remaining <= 0) return null;

  return <Text style={style}>{formatCooldown(remaining)}</Text>;
}
