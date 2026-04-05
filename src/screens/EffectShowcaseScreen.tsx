import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
  TouchableOpacity,
} from 'react-native';

const {width: W} = Dimensions.get('window');
const CELL = (W - 48) / 3;

// ─── Helper: create N animated values ───
function useAnims(n: number, init = 0) {
  const ref = useRef<Animated.Value[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({length: n}, () => new Animated.Value(init));
  }
  return ref.current;
}

// ─── Each effect component ───

function PulseGlow() {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 600, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.3, duration: 600, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.View
      style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#818cf8', opacity: a, shadowColor: '#818cf8', shadowRadius: 15, shadowOpacity: 0.8, elevation: 10}}
    />
  );
}

function ScaleBounce() {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(a, {toValue: 1.2, friction: 3, tension: 80, useNativeDriver: true}),
        Animated.spring(a, {toValue: 0.5, friction: 3, tension: 80, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.View
      style={{width: 30, height: 30, borderRadius: 6, backgroundColor: '#f59e0b', transform: [{scale: a}]}}
    />
  );
}

function SpinBlock() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  const spin = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  return (
    <Animated.View
      style={{width: 30, height: 30, borderRadius: 4, backgroundColor: '#ef4444', transform: [{rotateZ: spin}]}}
    />
  );
}

function FadeInOut() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 800, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.View
      style={{width: 35, height: 35, borderRadius: 6, backgroundColor: '#22c55e', opacity: a}}
    />
  );
}

function ShakeEffect() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 50, useNativeDriver: true}),
        Animated.timing(a, {toValue: -1, duration: 50, useNativeDriver: true}),
        Animated.timing(a, {toValue: 1, duration: 50, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 50, useNativeDriver: true}),
        Animated.delay(800),
      ]),
    ).start();
  }, [a]);
  const tx = a.interpolate({inputRange: [-1, 1], outputRange: [-8, 8]});
  return (
    <Animated.View
      style={{width: 30, height: 30, borderRadius: 4, backgroundColor: '#e11d48', transform: [{translateX: tx}]}}
    />
  );
}

function RippleEffect() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 1500, useNativeDriver: true}),
    ).start();
  }, [a]);
  const scale = a.interpolate({inputRange: [0, 1], outputRange: [0.3, 2]});
  const opacity = a.interpolate({inputRange: [0, 1], outputRange: [0.8, 0]});
  return (
    <View style={{alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View
        style={{width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#3b82f6', opacity, transform: [{scale}], position: 'absolute'}}
      />
      <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6'}} />
    </View>
  );
}

function DoubleRipple() {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(a1, {toValue: 1, duration: 1500, useNativeDriver: true})).start();
    setTimeout(() => {
      Animated.loop(Animated.timing(a2, {toValue: 1, duration: 1500, useNativeDriver: true})).start();
    }, 750);
  }, [a1, a2]);
  const s1 = a1.interpolate({inputRange: [0, 1], outputRange: [0.3, 2]});
  const o1 = a1.interpolate({inputRange: [0, 1], outputRange: [0.8, 0]});
  const s2 = a2.interpolate({inputRange: [0, 1], outputRange: [0.3, 2]});
  const o2 = a2.interpolate({inputRange: [0, 1], outputRange: [0.8, 0]});
  return (
    <View style={{alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={{width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#a78bfa', opacity: o1, transform: [{scale: s1}], position: 'absolute'}} />
      <Animated.View style={{width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#c084fc', opacity: o2, transform: [{scale: s2}], position: 'absolute'}} />
      <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#a78bfa'}} />
    </View>
  );
}

function StarBurst() {
  const anims = useAnims(6, 0);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.stagger(50, anims.map(a => Animated.timing(a, {toValue: 1, duration: 500, useNativeDriver: true}))),
        Animated.delay(300),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}))),
        Animated.delay(200),
      ]),
    ).start();
  }, [anims]);
  return (
    <View style={{width: 50, height: 50, alignItems: 'center', justifyContent: 'center'}}>
      {anims.map((a, i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const tx = a.interpolate({inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 20]});
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 20]});
        const op = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, 1, 0.3]});
        return <Animated.View key={i} style={{position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24', opacity: op, transform: [{translateX: tx}, {translateY: ty}]}} />;
      })}
    </View>
  );
}

function Explosion() {
  const anims = useAnims(8, 0);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true}))),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}))),
        Animated.delay(400),
      ]),
    ).start();
  }, [anims]);
  const colors = ['#ef4444', '#f59e0b', '#fbbf24', '#ef4444', '#f97316', '#fbbf24', '#ef4444', '#f59e0b'];
  return (
    <View style={{width: 50, height: 50, alignItems: 'center', justifyContent: 'center'}}>
      {anims.map((a, i) => {
        const angle = (i * 45) * (Math.PI / 180);
        const dist = 18 + (i % 3) * 4;
        const tx = a.interpolate({inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist]});
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist]});
        const op = a.interpolate({inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0]});
        const sc = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 1.3, 0.3]});
        return <Animated.View key={i} style={{position: 'absolute', width: 7, height: 7, borderRadius: 2, backgroundColor: colors[i], opacity: op, transform: [{translateX: tx}, {translateY: ty}, {scale: sc}]}} />;
      })}
    </View>
  );
}

function Confetti() {
  const anims = useAnims(10, 0);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 1, duration: 1200, useNativeDriver: true}))),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}))),
        Animated.delay(300),
      ]),
    ).start();
  }, [anims]);
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#eab308'];
  const angles = [30, 75, 120, 150, 200, 250, 290, 330, 60, 170];
  return (
    <View style={{width: 50, height: 50, alignItems: 'center', justifyContent: 'center'}}>
      {anims.map((a, i) => {
        const rad = angles[i] * (Math.PI / 180);
        const tx = a.interpolate({inputRange: [0, 1], outputRange: [0, Math.cos(rad) * 22]});
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [0, Math.sin(rad) * 22]});
        const op = a.interpolate({inputRange: [0, 0.8, 1], outputRange: [1, 0.6, 0]});
        const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', `${360 + i * 40}deg`]});
        return <Animated.View key={i} style={{position: 'absolute', width: 5, height: 8, borderRadius: 1, backgroundColor: colors[i], opacity: op, transform: [{translateX: tx}, {translateY: ty}, {rotateZ: rot}]}} />;
      })}
    </View>
  );
}

function FloatUp() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 1200, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  const ty = a.interpolate({inputRange: [0, 1], outputRange: [10, -20]});
  const op = a.interpolate({inputRange: [0, 0.3, 1], outputRange: [0, 1, 0]});
  const sc = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.8]});
  return (
    <Animated.Text style={{color: '#fbbf24', fontSize: 18, fontWeight: '900', opacity: op, transform: [{translateY: ty}, {scale: sc}]}}>
      +100
    </Animated.Text>
  );
}

function ComboText() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 400, easing: Easing.out(Easing.back(3)), useNativeDriver: true}),
        Animated.delay(600),
        Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0, 1], outputRange: [0, 1]});
  return (
    <Animated.Text style={{color: '#f97316', fontSize: 16, fontWeight: '900', letterSpacing: 2, transform: [{scale: sc}]}}>
      COMBO!
    </Animated.Text>
  );
}

function RainbowPulse() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false}),
    ).start();
  }, [a]);
  const bg = a.interpolate({
    inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
    outputRange: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'],
  });
  return (
    <Animated.View style={{width: 35, height: 35, borderRadius: 8, backgroundColor: bg}} />
  );
}

function ElectricSpark() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 100, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.2, duration: 80, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.9, duration: 60, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 100, useNativeDriver: true}),
        Animated.delay(600),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.Text style={{fontSize: 28, opacity: a}}>⚡</Animated.Text>
  );
}

function HeartBeat() {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1.3, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 1, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 1.3, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 1, duration: 150, useNativeDriver: true}),
        Animated.delay(600),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.Text style={{fontSize: 24, transform: [{scale: a}]}}>❤️</Animated.Text>
  );
}

function FlipCard() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.delay(400),
        Animated.timing(a, {toValue: 0, duration: 800, useNativeDriver: true}),
        Animated.delay(400),
      ]),
    ).start();
  }, [a]);
  const rotY = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']});
  return (
    <Animated.View
      style={{width: 30, height: 40, borderRadius: 4, backgroundColor: '#6366f1', transform: [{perspective: 300}, {rotateY: rotY}]}}
    />
  );
}

function WaveBlocks() {
  const anims = useAnims(5, 0);
  useEffect(() => {
    Animated.loop(
      Animated.stagger(100, anims.map(a =>
        Animated.sequence([
          Animated.timing(a, {toValue: 1, duration: 300, useNativeDriver: true}),
          Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}),
        ]),
      )),
    ).start();
  }, [anims]);
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
  return (
    <View style={{flexDirection: 'row', gap: 3}}>
      {anims.map((a, i) => {
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [0, -12]});
        return <Animated.View key={i} style={{width: 8, height: 8, borderRadius: 2, backgroundColor: colors[i], transform: [{translateY: ty}]}} />;
      })}
    </View>
  );
}

function MorphSquareCircle() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 800, useNativeDriver: false}),
        Animated.delay(200),
        Animated.timing(a, {toValue: 0, duration: 800, useNativeDriver: false}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  const br = a.interpolate({inputRange: [0, 1], outputRange: [4, 20]});
  const bg = a.interpolate({inputRange: [0, 1], outputRange: ['#3b82f6', '#ec4899']});
  return (
    <Animated.View style={{width: 40, height: 40, borderRadius: br, backgroundColor: bg}} />
  );
}

function GlowRing() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  return (
    <Animated.View style={{width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent', borderTopColor: '#a78bfa', borderRightColor: '#818cf8', transform: [{rotateZ: rot}]}} />
  );
}

function ShrinkDisappear() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
        Animated.delay(500),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0, 1], outputRange: [1, 0]});
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']});
  const op = a.interpolate({inputRange: [0, 0.8, 1], outputRange: [1, 0.5, 0]});
  return (
    <Animated.View style={{width: 30, height: 30, borderRadius: 4, backgroundColor: '#14b8a6', opacity: op, transform: [{scale: sc}, {rotateZ: rot}]}} />
  );
}

function DropBounce() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 500, easing: Easing.bounce, useNativeDriver: true}),
        Animated.delay(600),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const ty = a.interpolate({inputRange: [0, 1], outputRange: [-20, 10]});
  return (
    <Animated.View style={{width: 25, height: 25, borderRadius: 4, backgroundColor: '#f97316', transform: [{translateY: ty}]}} />
  );
}

function SlideIn() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        Animated.delay(600),
        Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  const tx = a.interpolate({inputRange: [0, 1], outputRange: [-30, 0]});
  const op = a.interpolate({inputRange: [0, 1], outputRange: [0, 1]});
  return (
    <Animated.View style={{width: 30, height: 10, borderRadius: 3, backgroundColor: '#8b5cf6', opacity: op, transform: [{translateX: tx}]}} />
  );
}

function BreathingOrb() {
  const a = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1.2, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.8, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.View style={{width: 35, height: 35, borderRadius: 18, backgroundColor: '#06b6d4', transform: [{scale: a}], shadowColor: '#06b6d4', shadowRadius: 10, shadowOpacity: 0.6, elevation: 8}} />
  );
}

function BlockClear() {
  const anims = useAnims(4, 1);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.stagger(80, anims.map(a =>
          Animated.parallel([
            Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}),
          ]),
        )),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 1, duration: 1, useNativeDriver: true}))),
        Animated.delay(200),
      ]),
    ).start();
  }, [anims]);
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  return (
    <View style={{flexDirection: 'row', gap: 3}}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{width: 10, height: 10, borderRadius: 2, backgroundColor: colors[i], opacity: a, transform: [{scale: a}]}} />
      ))}
    </View>
  );
}

function LineSweep() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.delay(400),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  const tx = a.interpolate({inputRange: [0, 1], outputRange: [-25, 25]});
  const op = a.interpolate({inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0]});
  return (
    <Animated.View style={{width: 4, height: 35, borderRadius: 2, backgroundColor: '#fbbf24', opacity: op, transform: [{translateX: tx}]}} />
  );
}

function RotateScale() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  const sc = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.5]});
  return (
    <Animated.View style={{width: 25, height: 25, borderRadius: 4, backgroundColor: '#a855f7', transform: [{rotateZ: rot}, {scale: sc}]}} />
  );
}

function DiamondSpin() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['45deg', '405deg']});
  return (
    <Animated.View style={{width: 25, height: 25, backgroundColor: '#06b6d4', transform: [{rotateZ: rot}]}} />
  );
}

function FireFlicker() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.4, duration: 100, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.9, duration: 120, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.3, duration: 130, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0, 1], outputRange: [0.8, 1.1]});
  return (
    <Animated.Text style={{fontSize: 26, opacity: a, transform: [{scale: sc}]}}>🔥</Animated.Text>
  );
}

function ShieldPop() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(a, {toValue: 1, friction: 3, tension: 100, useNativeDriver: true}),
        Animated.delay(800),
        Animated.timing(a, {toValue: 0, duration: 200, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.Text style={{fontSize: 26, transform: [{scale: a}]}}>🛡️</Animated.Text>
  );
}

function CrownFloat() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const ty = a.interpolate({inputRange: [0, 1], outputRange: [5, -8]});
  return (
    <Animated.Text style={{fontSize: 26, transform: [{translateY: ty}]}}>👑</Animated.Text>
  );
}

function GemSparkle() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.5, duration: 200, useNativeDriver: true}),
        Animated.timing(a, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.3, duration: 500, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0.3, 1], outputRange: [0.9, 1.15]});
  return (
    <Animated.Text style={{fontSize: 26, opacity: a, transform: [{scale: sc}]}}>💎</Animated.Text>
  );
}

function SwordSlash() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 200, useNativeDriver: true}),
        Animated.delay(700),
      ]),
    ).start();
  }, [a]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['-45deg', '45deg']});
  const sc = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.8, 1.2, 1]});
  return (
    <Animated.Text style={{fontSize: 26, transform: [{rotateZ: rot}, {scale: sc}]}}>⚔️</Animated.Text>
  );
}

function MagicOrb() {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true}),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(b, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.timing(b, {toValue: 0.5, duration: 800, useNativeDriver: true}),
      ]),
    ).start();
  }, [a, b]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  return (
    <View style={{alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={{position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#c084fc', borderStyle: 'dashed', transform: [{rotateZ: rot}], opacity: b}} />
      <Text style={{fontSize: 22}}>🔮</Text>
    </View>
  );
}

function LevelUp() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 600, easing: Easing.out(Easing.back(2)), useNativeDriver: true}),
        Animated.delay(800),
        Animated.timing(a, {toValue: 0, duration: 400, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  const ty = a.interpolate({inputRange: [0, 1], outputRange: [15, -5]});
  return (
    <Animated.Text style={{color: '#fbbf24', fontSize: 14, fontWeight: '900', opacity: a, transform: [{translateY: ty}], letterSpacing: 2}}>
      LEVEL UP!
    </Animated.Text>
  );
}

function PerfectClear() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 500, easing: Easing.out(Easing.back(4)), useNativeDriver: true}),
        Animated.delay(1000),
        Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}),
        Animated.delay(300),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.Text style={{color: '#a78bfa', fontSize: 12, fontWeight: '900', opacity: a, transform: [{scale: a}], letterSpacing: 1}}>
      PERFECT!
    </Animated.Text>
  );
}

function CrossFadeBlocks() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  const o1 = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 0, 1]});
  const o2 = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, 1, 0]});
  return (
    <View style={{width: 30, height: 30}}>
      <Animated.View style={{position: 'absolute', width: 30, height: 30, borderRadius: 4, backgroundColor: '#3b82f6', opacity: o1}} />
      <Animated.View style={{position: 'absolute', width: 30, height: 30, borderRadius: 4, backgroundColor: '#ef4444', opacity: o2}} />
    </View>
  );
}

function OrbitalDots() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  return (
    <View style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
      <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#818cf8'}} />
      {[0, 1, 2].map(i => {
        const rot = Animated.add(a, new Animated.Value(i / 3)).interpolate({inputRange: [0, 1, 1.33], outputRange: ['0deg', '360deg', '480deg']});
        return (
          <Animated.View key={i} style={{position: 'absolute', width: 44, height: 44, alignItems: 'center', transform: [{rotateZ: rot}]}}>
            <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: ['#f59e0b', '#22c55e', '#ec4899'][i]}} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function ProgressBar() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false}),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: false}),
        Animated.delay(300),
      ]),
    ).start();
  }, [a]);
  const w = a.interpolate({inputRange: [0, 1], outputRange: [0, 50]});
  const bg = a.interpolate({inputRange: [0, 0.5, 1], outputRange: ['#ef4444', '#f59e0b', '#22c55e']});
  return (
    <View style={{width: 50, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden'}}>
      <Animated.View style={{height: '100%', borderRadius: 4, backgroundColor: bg, width: w}} />
    </View>
  );
}

function TripleBounce() {
  const anims = useAnims(3, 0);
  useEffect(() => {
    Animated.loop(
      Animated.stagger(150, anims.map(a =>
        Animated.sequence([
          Animated.timing(a, {toValue: 1, duration: 300, useNativeDriver: true}),
          Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}),
        ]),
      )),
    ).start();
  }, [anims]);
  return (
    <View style={{flexDirection: 'row', gap: 5}}>
      {anims.map((a, i) => {
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [0, -10]});
        return <Animated.View key={i} style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#a78bfa', transform: [{translateY: ty}]}} />;
      })}
    </View>
  );
}

function NumberCount() {
  const [num, setNum] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setNum(n => (n >= 999 ? 0 : n + 13));
    }, 50);
    return () => clearInterval(id);
  }, []);
  return (
    <Text style={{color: '#22c55e', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums']}}>
      {num}
    </Text>
  );
}

function Sparkles() {
  const anims = useAnims(5, 0);
  useEffect(() => {
    anims.forEach((a, i) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(a, {toValue: 1, duration: 400, useNativeDriver: true}),
            Animated.timing(a, {toValue: 0, duration: 400, useNativeDriver: true}),
            Animated.delay(Math.random() * 500),
          ]),
        ).start();
      }, i * 200);
    });
  }, [anims]);
  const positions = [{x: 0, y: -15}, {x: 12, y: -5}, {x: 8, y: 10}, {x: -10, y: 8}, {x: -12, y: -8}];
  return (
    <View style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
      {anims.map((a, i) => (
        <Animated.Text key={i} style={{position: 'absolute', fontSize: 10, opacity: a, transform: [{translateX: positions[i].x}, {translateY: positions[i].y}, {scale: a}]}}>✦</Animated.Text>
      ))}
    </View>
  );
}

function ExpandContract() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: false}),
        Animated.timing(a, {toValue: 0, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: false}),
      ]),
    ).start();
  }, [a]);
  const w = a.interpolate({inputRange: [0, 1], outputRange: [10, 45]});
  return (
    <Animated.View style={{width: w, height: 10, borderRadius: 5, backgroundColor: '#f97316'}} />
  );
}

function DamageNumber() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
        Animated.delay(400),
      ]),
    ).start();
  }, [a]);
  const ty = a.interpolate({inputRange: [0, 1], outputRange: [5, -20]});
  const sc = a.interpolate({inputRange: [0, 0.2, 0.5, 1], outputRange: [0.3, 1.3, 1, 0.8]});
  const op = a.interpolate({inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0]});
  return (
    <Animated.Text style={{color: '#ef4444', fontSize: 20, fontWeight: '900', opacity: op, transform: [{translateY: ty}, {scale: sc}]}}>
      -50
    </Animated.Text>
  );
}

function HealNumber() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
        Animated.delay(300),
      ]),
    ).start();
  }, [a]);
  const ty = a.interpolate({inputRange: [0, 1], outputRange: [8, -18]});
  const op = a.interpolate({inputRange: [0, 0.3, 0.8, 1], outputRange: [0, 1, 1, 0]});
  return (
    <Animated.Text style={{color: '#22c55e', fontSize: 18, fontWeight: '900', opacity: op, transform: [{translateY: ty}]}}>
      +30
    </Animated.Text>
  );
}

function CriticalHit() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 200, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 600, useNativeDriver: true}),
        Animated.delay(500),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0, 1], outputRange: [2, 1]});
  return (
    <Animated.Text style={{color: '#fbbf24', fontSize: 14, fontWeight: '900', opacity: a, transform: [{scale: sc}]}}>
      CRIT!
    </Animated.Text>
  );
}

function PulseRing() {
  const a = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1.3, duration: 500, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.8, duration: 500, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.View style={{width: 35, height: 35, borderRadius: 18, borderWidth: 3, borderColor: '#22c55e', transform: [{scale: a}]}} />
  );
}

function ZigZag() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 0.25, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.5, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0.75, duration: 150, useNativeDriver: true}),
        Animated.timing(a, {toValue: 1, duration: 150, useNativeDriver: true}),
        Animated.delay(400),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const tx = a.interpolate({inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 10, -10, 10, 0]});
  const ty = a.interpolate({inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-15, -5, 5, 15, 20]});
  const op = a.interpolate({inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0]});
  return (
    <Animated.View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b', opacity: op, transform: [{translateX: tx}, {translateY: ty}]}} />
  );
}

function SquareAssemble() {
  const anims = useAnims(4, 0);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.stagger(100, anims.map(a => Animated.spring(a, {toValue: 1, friction: 4, tension: 80, useNativeDriver: true}))),
        Animated.delay(600),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 0, duration: 300, useNativeDriver: true}))),
        Animated.delay(200),
      ]),
    ).start();
  }, [anims]);
  const offsets = [{x: -15, y: -15}, {x: 15, y: -15}, {x: -15, y: 15}, {x: 15, y: 15}];
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  return (
    <View style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
      {anims.map((a, i) => {
        const tx = a.interpolate({inputRange: [0, 1], outputRange: [offsets[i].x, offsets[i].x * 0.35]});
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [offsets[i].y, offsets[i].y * 0.35]});
        return <Animated.View key={i} style={{position: 'absolute', width: 12, height: 12, borderRadius: 2, backgroundColor: colors[i], opacity: a, transform: [{translateX: tx}, {translateY: ty}]}} />;
      })}
    </View>
  );
}

function TetrisLine() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 400, useNativeDriver: true}),
        Animated.delay(200),
        Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
        Animated.delay(600),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 0]});
  const op = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 1, 0]});
  return (
    <Animated.View style={{flexDirection: 'row', gap: 2, opacity: op, transform: [{scaleY: sc}]}}>
      {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].map((c, i) => (
        <View key={i} style={{width: 8, height: 8, borderRadius: 1, backgroundColor: c}} />
      ))}
    </Animated.View>
  );
}

function ChainLightning() {
  const anims = useAnims(4, 0);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.stagger(80, anims.map(a =>
          Animated.sequence([
            Animated.timing(a, {toValue: 1, duration: 100, useNativeDriver: true}),
            Animated.timing(a, {toValue: 0.3, duration: 150, useNativeDriver: true}),
          ]),
        )),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 0, duration: 200, useNativeDriver: true}))),
        Animated.delay(500),
      ]),
    ).start();
  }, [anims]);
  return (
    <View style={{flexDirection: 'row', gap: 4, alignItems: 'center'}}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#60a5fa', opacity: a, transform: [{scale: a}]}} />
      ))}
    </View>
  );
}

function PowerUp() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 800, easing: Easing.out(Easing.back(2)), useNativeDriver: true}),
        Animated.delay(400),
        Animated.timing(a, {toValue: 0, duration: 400, useNativeDriver: true}),
        Animated.delay(200),
      ]),
    ).start();
  }, [a]);
  return (
    <Animated.Text style={{fontSize: 26, transform: [{scale: a}], opacity: a}}>⬆️</Animated.Text>
  );
}

function ShieldBreak() {
  const anims = useAnims(4, 0);
  useEffect(() => {
    Animated.loop(
        Animated.sequence([
          Animated.delay(500),
        Animated.parallel(anims.map(a => {
          return Animated.timing(a, {toValue: 1, duration: 400, useNativeDriver: true});
        })),
        Animated.parallel(anims.map(a => Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}))),
        Animated.delay(300),
      ]),
    ).start();
  }, [anims]);
  const offsets = [{x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}];
  return (
    <View style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
      {anims.map((a, i) => {
        const tx = a.interpolate({inputRange: [0, 1], outputRange: [0, offsets[i].x * 12]});
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [0, offsets[i].y * 12]});
        const op = a.interpolate({inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0]});
        const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', `${offsets[i].x * offsets[i].y * 30}deg`]});
        return <Animated.View key={i} style={{position: 'absolute', width: 12, height: 12, borderRadius: 2, backgroundColor: '#94a3b8', opacity: op, transform: [{translateX: tx}, {translateY: ty}, {rotateZ: rot}]}} />;
      })}
    </View>
  );
}

function Vortex() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true}),
    ).start();
  }, [a]);
  return (
    <View style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
      {[0, 1, 2].map(i => {
        const size = 15 + i * 10;
        const rot = Animated.add(a, new Animated.Value(i * 0.33)).interpolate({inputRange: [0, 1, 1.33], outputRange: ['0deg', '360deg', '480deg']});
        return (
          <Animated.View key={i} style={{position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: `rgba(139, 92, 246, ${1 - i * 0.3})`, borderLeftColor: 'transparent', transform: [{rotateZ: rot}]}} />
        );
      })}
    </View>
  );
}

function Meteors() {
  const anims = useAnims(3, 0);
  useEffect(() => {
    anims.forEach((a, i) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(a, {toValue: 1, duration: 500, useNativeDriver: true}),
            Animated.timing(a, {toValue: 0, duration: 1, useNativeDriver: true}),
            Animated.delay(400 + i * 200),
          ]),
        ).start();
      }, i * 300);
    });
  }, [anims]);
  return (
    <View style={{width: 44, height: 44}}>
      {anims.map((a, i) => {
        const tx = a.interpolate({inputRange: [0, 1], outputRange: [-10, 25]});
        const ty = a.interpolate({inputRange: [0, 1], outputRange: [-10, 25]});
        const op = a.interpolate({inputRange: [0, 0.3, 1], outputRange: [0, 1, 0]});
        return <Animated.View key={i} style={{position: 'absolute', top: i * 8, width: 12, height: 3, borderRadius: 2, backgroundColor: '#f97316', opacity: op, transform: [{translateX: tx}, {translateY: ty}, {rotateZ: '45deg'}]}} />;
      })}
    </View>
  );
}

function Freeze() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  const op = a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5]});
  return (
    <Animated.Text style={{fontSize: 26, transform: [{rotateZ: rot}], opacity: op}}>❄️</Animated.Text>
  );
}

function Poison() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 600, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 600, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const sc = a.interpolate({inputRange: [0, 1], outputRange: [0.9, 1.15]});
  return (
    <Animated.Text style={{fontSize: 24, transform: [{scale: sc}]}}>☠️</Animated.Text>
  );
}

function TimeWarp() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 1000, easing: Easing.linear, useNativeDriver: true}),
      ]),
    ).start();
  }, [a]);
  const rot = a.interpolate({inputRange: [0, 1], outputRange: ['0deg', '720deg']});
  return (
    <Animated.Text style={{fontSize: 24, transform: [{rotateZ: rot}]}}>⏰</Animated.Text>
  );
}

// ─── Registry ───
const EFFECTS: {name: string; component: React.FC}[] = [
  {name: '펄스 글로우', component: PulseGlow},
  {name: '스케일 바운스', component: ScaleBounce},
  {name: '스핀 블록', component: SpinBlock},
  {name: '페이드 인아웃', component: FadeInOut},
  {name: '흔들기', component: ShakeEffect},
  {name: '리플', component: RippleEffect},
  {name: '더블 리플', component: DoubleRipple},
  {name: '별 폭발', component: StarBurst},
  {name: '폭발', component: Explosion},
  {name: '컨페티', component: Confetti},
  {name: '떠오르기 +100', component: FloatUp},
  {name: '콤보 텍스트', component: ComboText},
  {name: '레인보우', component: RainbowPulse},
  {name: '번개', component: ElectricSpark},
  {name: '하트비트', component: HeartBeat},
  {name: '카드 플립', component: FlipCard},
  {name: '웨이브 블록', component: WaveBlocks},
  {name: '모프 변환', component: MorphSquareCircle},
  {name: '글로우 링', component: GlowRing},
  {name: '축소 사라짐', component: ShrinkDisappear},
  {name: '드롭 바운스', component: DropBounce},
  {name: '슬라이드 인', component: SlideIn},
  {name: '숨쉬는 구슬', component: BreathingOrb},
  {name: '블록 클리어', component: BlockClear},
  {name: '라인 스윕', component: LineSweep},
  {name: '회전+스케일', component: RotateScale},
  {name: '다이아 스핀', component: DiamondSpin},
  {name: '불꽃', component: FireFlicker},
  {name: '방패 팝', component: ShieldPop},
  {name: '왕관 부유', component: CrownFloat},
  {name: '보석 반짝', component: GemSparkle},
  {name: '검 슬래시', component: SwordSlash},
  {name: '마법 오브', component: MagicOrb},
  {name: '레벨업!', component: LevelUp},
  {name: '퍼펙트!', component: PerfectClear},
  {name: '교차 페이드', component: CrossFadeBlocks},
  {name: '오비탈 점', component: OrbitalDots},
  {name: '진행 바', component: ProgressBar},
  {name: '트리플 점프', component: TripleBounce},
  {name: '숫자 카운트', component: NumberCount},
  {name: '스파클', component: Sparkles},
  {name: '늘었다줄었다', component: ExpandContract},
  {name: '데미지 -50', component: DamageNumber},
  {name: '힐 +30', component: HealNumber},
  {name: '크리티컬!', component: CriticalHit},
  {name: '펄스 링', component: PulseRing},
  {name: '지그재그', component: ZigZag},
  {name: '블록 조립', component: SquareAssemble},
  {name: '테트리스 라인', component: TetrisLine},
  {name: '체인 번개', component: ChainLightning},
  {name: '파워업', component: PowerUp},
  {name: '방패 파괴', component: ShieldBreak},
  {name: '소용돌이', component: Vortex},
  {name: '유성', component: Meteors},
  {name: '빙결', component: Freeze},
  {name: '독', component: Poison},
  {name: '시간왜곡', component: TimeWarp},
];

// ─── Main screen ───
export default function EffectShowcaseScreen() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>이펙트 쇼케이스</Text>
        <Text style={styles.subtitle}>
          {selected.size > 0 ? `${selected.size}개 선택됨` : '터치해서 선택하세요'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {EFFECTS.map(({name, component: Comp}) => {
          const isSel = selected.has(name);
          return (
            <TouchableOpacity
              key={name}
              style={[styles.cell, isSel && styles.cellSelected]}
              onPress={() => toggle(name)}
              activeOpacity={0.7}>
              <View style={styles.effectArea}>
                <Comp />
              </View>
              <Text style={[styles.label, isSel && styles.labelSelected]} numberOfLines={1}>
                {name}
              </Text>
              {isSel && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a2e',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#a5b4fc',
    fontSize: 13,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 40,
    gap: 8,
  },
  cell: {
    width: CELL,
    height: CELL,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cellSelected: {
    borderColor: '#818cf8',
    backgroundColor: 'rgba(129,140,248,0.1)',
  },
  effectArea: {
    height: CELL * 0.55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  labelSelected: {
    color: '#a5b4fc',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#818cf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
