import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import GamePanel from '../../components/GamePanel';
import MenuScreenFrame from '../../components/MenuScreenFrame';

const MODULES = [
  {
    route: 'UiStudio',
    title: 'UI 스튜디오',
    description: '화면 배치, 배경, 프리뷰를 조정합니다.',
  },
  {
    route: 'GameplayStudio',
    title: '사운드/드래그',
    description: '효과음, BGM, 드래그 감도를 한 곳에서 조정합니다.',
  },
  {
    route: 'CreatorStudio',
    title: '관리자 데이터',
    description: '레벨, 레이드, 적 템플릿, 보상과 시간 제한을 편집합니다.',
  },
  {
    route: 'BalanceStudio',
    title: '전투 밸런스',
    description: '몬스터, 보스, 캐릭터, 스킬 효과를 개별/퍼센트로 조정합니다.',
  },
  {
    route: 'AdminOps',
    title: '운영 관리',
    description: '유저, 보상, 공지, 운영용 데이터를 관리합니다.',
  },
];

export default function AdminHomeScreen({navigation}: any) {
  return (
    <MenuScreenFrame
      title="BlockHero Admin"
      subtitle="게임 앱과 분리된 관리자 전용 편집 앱입니다."
      onBack={() => navigation.goBack()}>
      <GamePanel>
        <Text style={styles.title}>빠른 이동</Text>
        <Text style={styles.description}>
          가로 모드에서는 각 편집기가 좌우 패널 방식으로 열립니다. 값 편집과 저장,
          배포 이력을 한 화면에서 처리하도록 구성했습니다.
        </Text>
      </GamePanel>

      <View style={styles.grid}>
        {MODULES.map(module => (
          <TouchableOpacity
            key={module.route}
            style={styles.card}
            onPress={() => navigation.navigate(module.route)}>
            <Text style={styles.cardTitle}>{module.title}</Text>
            <Text style={styles.cardDescription}>{module.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </MenuScreenFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#4f3118',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 8,
  },
  description: {
    color: '#7b5b39',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 245, 228, 0.96)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8a5e35',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#261409',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 6,
  },
  cardTitle: {
    color: '#4f3118',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardDescription: {
    color: '#7b5b39',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
