import {NativeModules, Platform} from 'react-native';

type Lang = 'ko' | 'en' | 'ja' | 'fr' | 'it' | 'zh';

const SUPPORTED: Lang[] = ['ko', 'en', 'ja', 'fr', 'it', 'zh'];

function getDeviceLocale(): Lang {
  try {
    let locale = '';
    if (Platform.OS === 'ios') {
      locale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        '';
    } else {
      // Android: try multiple sources
      locale =
        NativeModules.I18nManager?.localeIdentifier ||
        NativeModules.DeviceInfo?.locale ||
        '';
    }
    if (locale) {
      const lang = locale.replace(/-.*/, '').replace(/_.*/, '').toLowerCase();
      if (SUPPORTED.includes(lang as Lang)) return lang as Lang;
    }
  } catch {}
  return 'ko';
}

const currentLang: Lang = getDeviceLocale();

const translations: Record<string, Record<Lang, string>> = {
  // App
  'app.title': {ko: 'Cubricks', en: 'Cubricks', ja: 'Cubricks', fr: 'Cubricks', it: 'Cubricks', zh: 'Cubricks'},
  'app.subtitle': {ko: '큐브릭스', en: 'Cubricks', ja: 'キューブリックス', fr: 'Cubricks', it: 'Cubricks', zh: '魔方块'},

  // Auth
  'auth.loginTitle': {ko: '로그인하고 게임을 시작하세요', en: 'Sign in to start playing', ja: 'ログインしてゲームを始めよう', fr: 'Connectez-vous pour jouer', it: 'Accedi per giocare', zh: '登录开始游戏'},
  'auth.signupTitle': {ko: '새 계정을 만들어 시작하세요', en: 'Create a new account', ja: '新しいアカウントを作成', fr: 'Créez un nouveau compte', it: 'Crea un nuovo account', zh: '创建新账号'},
  'auth.email': {ko: '이메일', en: 'Email', ja: 'メールアドレス', fr: 'Email', it: 'Email', zh: '邮箱'},
  'auth.password': {ko: '비밀번호', en: 'Password', ja: 'パスワード', fr: 'Mot de passe', it: 'Password', zh: '密码'},
  'auth.confirmPassword': {ko: '비밀번호 확인', en: 'Confirm Password', ja: 'パスワード確認', fr: 'Confirmer mot de passe', it: 'Conferma password', zh: '确认密码'},
  'auth.nickname': {ko: '닉네임', en: 'Nickname', ja: 'ニックネーム', fr: 'Pseudo', it: 'Nickname', zh: '昵称'},
  'auth.login': {ko: '로그인', en: 'Login', ja: 'ログイン', fr: 'Connexion', it: 'Accedi', zh: '登录'},
  'auth.signup': {ko: '회원가입', en: 'Sign Up', ja: '新規登録', fr: 'Inscription', it: 'Registrati', zh: '注册'},
  'auth.noAccount': {ko: '계정이 없으신가요? 회원가입', en: "Don't have an account? Sign Up", ja: 'アカウントをお持ちでない方は新規登録', fr: "Pas de compte ? S'inscrire", it: 'Non hai un account? Registrati', zh: '没有账号？注册'},
  'auth.hasAccount': {ko: '이미 계정이 있으신가요? 로그인', en: 'Already have an account? Login', ja: '既にアカウントをお持ちの方はログイン', fr: 'Déjà un compte ? Connexion', it: 'Hai già un account? Accedi', zh: '已有账号？登录'},
  'auth.googleLogin': {ko: 'Google로 로그인', en: 'Sign in with Google', ja: 'Googleでログイン', fr: 'Se connecter avec Google', it: 'Accedi con Google', zh: '使用Google登录'},
  'auth.guestLogin': {ko: '게스트로 시작하기', en: 'Continue as Guest', ja: 'ゲストで始める', fr: 'Continuer en tant qu\'invité', it: 'Continua come ospite', zh: '游客模式'},
  'auth.fillFields': {ko: '이메일과 비밀번호를 입력해주세요', en: 'Please enter email and password', ja: 'メールアドレスとパスワードを入力してください', fr: 'Veuillez entrer email et mot de passe', it: 'Inserisci email e password', zh: '请输入邮箱和密码'},
  'auth.passwordMismatch': {ko: '비밀번호가 일치하지 않습니다', en: 'Passwords do not match', ja: 'パスワードが一致しません', fr: 'Les mots de passe ne correspondent pas', it: 'Le password non corrispondono', zh: '密码不匹配'},
  'auth.passwordTooShort': {ko: '비밀번호는 6자 이상이어야 합니다', en: 'Password must be at least 6 characters', ja: 'パスワードは6文字以上必要です', fr: 'Le mot de passe doit contenir au moins 6 caractères', it: 'La password deve essere di almeno 6 caratteri', zh: '密码至少6个字符'},
  'auth.enterNickname': {ko: '닉네임을 입력해주세요', en: 'Please enter a nickname', ja: 'ニックネームを入力してください', fr: 'Veuillez entrer un pseudo', it: 'Inserisci un nickname', zh: '请输入昵称'},
  'auth.signupSuccess': {ko: '회원가입 완료! 이메일을 확인해주세요.', en: 'Sign up complete! Please check your email.', ja: '登録完了！メールを確認してください。', fr: 'Inscription terminée ! Vérifiez votre email.', it: 'Registrazione completata! Controlla la tua email.', zh: '注册成功！请检查邮箱。'},
  'auth.logout': {ko: '로그아웃', en: 'Logout', ja: 'ログアウト', fr: 'Déconnexion', it: 'Esci', zh: '退出登录'},
  'auth.logoutConfirm': {ko: '로그아웃 하시겠습니까?', en: 'Are you sure you want to logout?', ja: 'ログアウトしますか？', fr: 'Voulez-vous vous déconnecter ?', it: 'Vuoi uscire?', zh: '确定退出登录？'},

  // Common
  'common.confirm': {ko: '확인', en: 'OK', ja: '確認', fr: 'OK', it: 'OK', zh: '确认'},
  'common.cancel': {ko: '취소', en: 'Cancel', ja: 'キャンセル', fr: 'Annuler', it: 'Annulla', zh: '取消'},
  'common.back': {ko: '뒤로', en: 'Back', ja: '戻る', fr: 'Retour', it: 'Indietro', zh: '返回'},
  'common.home': {ko: '← 홈', en: '← Home', ja: '← ホーム', fr: '← Accueil', it: '← Home', zh: '← 首页'},
  'common.exit': {ko: '나가기', en: 'Exit', ja: '終了', fr: 'Quitter', it: 'Esci', zh: '退出'},
  'common.backExit': {ko: '← 나가기', en: '← Exit', ja: '← 終了', fr: '← Quitter', it: '← Esci', zh: '← 退出'},
  'common.notice': {ko: '알림', en: 'Notice', ja: 'お知らせ', fr: 'Avis', it: 'Avviso', zh: '提示'},
  'common.error': {ko: '오류', en: 'Error', ja: 'エラー', fr: 'Erreur', it: 'Errore', zh: '错误'},
  'common.done': {ko: '완료', en: 'Done', ja: '完了', fr: 'Terminé', it: 'Fatto', zh: '完成'},
  'common.goHome': {ko: '홈으로', en: 'Home', ja: 'ホームへ', fr: 'Accueil', it: 'Home', zh: '回首页'},
  'common.player': {ko: '플레이어', en: 'Player', ja: 'プレイヤー', fr: 'Joueur', it: 'Giocatore', zh: '玩家'},

  // Home Screen
  'home.levelMode': {ko: '레벨 모드', en: 'Level Mode', ja: 'レベルモード', fr: 'Mode Niveau', it: 'Modalità Livello', zh: '关卡模式'},
  'home.levelDesc': {ko: '20개의 스테이지 도전', en: '20 stages to conquer', ja: '20ステージに挑戦', fr: '20 étapes à conquérir', it: '20 livelli da superare', zh: '20关挑战'},
  'home.endlessMode': {ko: '무한 모드', en: 'Endless Mode', ja: '無限モード', fr: 'Mode Infini', it: 'Modalità Infinita', zh: '无尽模式'},
  'home.endlessDesc': {ko: '끝없는 도전, 최고 기록 달성', en: 'Endless challenge, beat your best', ja: '終わりなき挑戦、最高記録を目指せ', fr: 'Défi sans fin, battez votre record', it: 'Sfida infinita, batti il record', zh: '无尽挑战，刷新最高分'},
  'home.battleMode': {ko: '대전 모드', en: 'Battle Mode', ja: 'バトルモード', fr: 'Mode Combat', it: 'Modalità Battaglia', zh: '对战模式'},
  'home.battleDesc': {ko: '실시간 1:1 배틀', en: 'Real-time 1v1 Battle', ja: 'リアルタイム1対1バトル', fr: 'Combat 1v1 en temps réel', it: 'Battaglia 1v1 in tempo reale', zh: '实时1v1对战'},
  'home.missions': {ko: '미션 & 업적', en: 'Missions & Achievements', ja: 'ミッション＆実績', fr: 'Missions & Succès', it: 'Missioni & Traguardi', zh: '任务与成就'},
  'home.missionsDesc': {ko: '일일 미션과 도전 과제', en: 'Daily missions and challenges', ja: 'デイリーミッションとチャレンジ', fr: 'Missions quotidiennes et défis', it: 'Missioni giornaliere e sfide', zh: '每日任务和挑战'},
  'home.raidMode': {ko: '레이드 모드', en: 'Raid Mode', ja: 'レイドモード', fr: 'Mode Raid', it: 'Modalità Raid', zh: '团战模式'},
  'home.raidDesc': {ko: '공개 예정', en: 'Coming Soon', ja: '近日公開', fr: 'Bientôt disponible', it: 'Prossimamente', zh: '即将开放'},
  'home.heartsFull': {ko: '하트가 이미 가득 찼습니다!', en: 'Hearts are already full!', ja: 'ハートは満タンです！', fr: 'Les coeurs sont pleins !', it: 'I cuori sono già pieni!', zh: '爱心已满！'},
  'home.refillHearts': {ko: '하트 충전', en: 'Refill Hearts', ja: 'ハート回復', fr: 'Recharger coeurs', it: 'Ricarica cuori', zh: '充值爱心'},
  'home.refillConfirm': {ko: '30 스타로 하트를 모두 충전하시겠습니까?', en: 'Refill all hearts for 30 stars?', ja: '30スターでハートを全回復しますか？', fr: 'Recharger tous les coeurs pour 30 étoiles ?', it: 'Ricaricare tutti i cuori per 30 stelle?', zh: '用30星充满所有爱心？'},
  'home.refill': {ko: '충전', en: 'Refill', ja: '回復', fr: 'Recharger', it: 'Ricarica', zh: '充值'},
  'home.notEnoughStars': {ko: '스타가 부족합니다!', en: 'Not enough stars!', ja: 'スターが足りません！', fr: 'Pas assez d\'étoiles !', it: 'Stelle insufficienti!', zh: '星星不足！'},

  // Levels Screen
  'levels.title': {ko: '레벨 선택', en: 'Select Level', ja: 'レベル選択', fr: 'Choisir niveau', it: 'Scegli livello', zh: '选择关卡'},
  'levels.locked': {ko: '잠김', en: 'Locked', ja: 'ロック', fr: 'Verrouillé', it: 'Bloccato', zh: '未解锁'},
  'levels.clearFirst': {ko: '이전 레벨을 먼저 클리어하세요!', en: 'Clear the previous level first!', ja: '前のレベルをクリアしてください！', fr: 'Terminez le niveau précédent !', it: 'Completa prima il livello precedente!', zh: '请先通过上一关！'},
  'levels.noHearts': {ko: '하트 부족', en: 'No Hearts', ja: 'ハート不足', fr: 'Plus de coeurs', it: 'Cuori esauriti', zh: '爱心不足'},
  'levels.noHeartsMsg': {ko: '하트가 없습니다. 충전해주세요!', en: 'No hearts left. Please refill!', ja: 'ハートがありません。回復してください！', fr: 'Plus de coeurs. Rechargez !', it: 'Nessun cuore. Ricarica!', zh: '没有爱心了，请充值！'},

  // Game Header
  'game.score': {ko: '점수', en: 'Score', ja: 'スコア', fr: 'Score', it: 'Punteggio', zh: '分数'},
  'game.combo': {ko: '콤보', en: 'Combo', ja: 'コンボ', fr: 'Combo', it: 'Combo', zh: '连击'},
  'game.lines': {ko: '라인', en: 'Lines', ja: 'ライン', fr: 'Lignes', it: 'Linee', zh: '行数'},
  'game.turns': {ko: '턴', en: 'Turns', ja: 'ターン', fr: 'Tours', it: 'Turni', zh: '回合'},
  'game.fever': {ko: '🔥 피버', en: '🔥 Fever', ja: '🔥 フィーバー', fr: '🔥 Fièvre', it: '🔥 Febbre', zh: '🔥 狂热'},
  'game.feverActive': {ko: '🔥 FEVER!', en: '🔥 FEVER!', ja: '🔥 FEVER!', fr: '🔥 FEVER!', it: '🔥 FEVER!', zh: '🔥 FEVER!'},
  'game.dragHint': {ko: '블록을 드래그하여 배치하세요', en: 'Drag blocks to place', ja: 'ブロックをドラッグして配置', fr: 'Glissez les blocs pour placer', it: 'Trascina i blocchi per posizionare', zh: '拖拽方块放置'},

  // Game Over / Results
  'game.gameOver': {ko: '게임 오버', en: 'Game Over', ja: 'ゲームオーバー', fr: 'Fin de partie', it: 'Fine partita', zh: '游戏结束'},
  'game.clear': {ko: '🎉 클리어!', en: '🎉 Cleared!', ja: '🎉 クリア！', fr: '🎉 Réussi !', it: '🎉 Completato!', zh: '🎉 通关！'},
  'game.failed': {ko: '😢 실패', en: '😢 Failed', ja: '😢 失敗', fr: '😢 Échoué', it: '😢 Fallito', zh: '😢 失败'},
  'game.highScore': {ko: '🏆 최고 기록!', en: '🏆 High Score!', ja: '🏆 ハイスコア！', fr: '🏆 Meilleur score !', it: '🏆 Record!', zh: '🏆 最高分！'},
  'game.tryAgain': {ko: '다시 도전해보세요!', en: 'Try again!', ja: 'もう一度挑戦！', fr: 'Réessayez !', it: 'Riprova!', zh: '再试一次！'},
  'game.exitConfirm': {ko: '진행 상황이 저장되지 않습니다.', en: 'Progress will not be saved.', ja: '進行状況は保存されません。', fr: 'La progression ne sera pas sauvegardée.', it: 'I progressi non saranno salvati.', zh: '进度将不会保存。'},
  'game.exitEndless': {ko: '현재 점수가 저장됩니다.', en: 'Your score will be saved.', ja: '現在のスコアが保存されます。', fr: 'Votre score sera sauvegardé.', it: 'Il punteggio sarà salvato.', zh: '当前分数将被保存。'},
  'game.levelNotFound': {ko: '레벨을 찾을 수 없습니다', en: 'Level not found', ja: 'レベルが見つかりません', fr: 'Niveau introuvable', it: 'Livello non trovato', zh: '未找到关卡'},
  'game.goBack': {ko: '← 돌아가기', en: '← Go Back', ja: '← 戻る', fr: '← Retour', it: '← Torna', zh: '← 返回'},

  // Items
  'item.hammer': {ko: '해머', en: 'Hammer', ja: 'ハンマー', fr: 'Marteau', it: 'Martello', zh: '锤子'},
  'item.bomb': {ko: '폭탄', en: 'Bomb', ja: 'ボム', fr: 'Bombe', it: 'Bomba', zh: '炸弹'},
  'item.refresh': {ko: '새로고침', en: 'Refresh', ja: 'リフレッシュ', fr: 'Rafraîchir', it: 'Aggiorna', zh: '刷新'},
  'item.addTurns': {ko: '+3턴', en: '+3 Turns', ja: '+3ターン', fr: '+3 Tours', it: '+3 Turni', zh: '+3回合'},
  'item.noRefresh': {ko: '새로고침 아이템이 없습니다!', en: 'No refresh items!', ja: 'リフレッシュアイテムがありません！', fr: 'Pas de rafraîchissement !', it: 'Nessun aggiornamento!', zh: '没有刷新道具！'},
  'item.noTurnLimit': {ko: '턴 제한이 없는 레벨입니다!', en: 'This level has no turn limit!', ja: 'ターン制限のないレベルです！', fr: 'Ce niveau n\'a pas de limite !', it: 'Questo livello non ha limiti!', zh: '此关卡无回合限制！'},
  'item.noAddTurns': {ko: '턴 추가 아이템이 없습니다!', en: 'No turn items!', ja: 'ターン追加アイテムがありません！', fr: 'Pas d\'ajout de tours !', it: 'Nessun turno aggiuntivo!', zh: '没有回合道具！'},
  'item.noItems': {ko: '아이템이 없습니다!', en: 'No items!', ja: 'アイテムがありません！', fr: 'Pas d\'objets !', it: 'Nessun oggetto!', zh: '没有道具！'},
  'item.useHammer': {ko: '보드를 터치하여 🔨 해머를 사용하세요', en: 'Tap the board to use 🔨 Hammer', ja: 'ボードをタップして🔨ハンマーを使用', fr: 'Touchez le plateau pour utiliser 🔨', it: 'Tocca il tabellone per usare 🔨', zh: '点击棋盘使用🔨锤子'},
  'item.useBomb': {ko: '보드를 터치하여 💣 폭탄을 사용하세요', en: 'Tap the board to use 💣 Bomb', ja: 'ボードをタップして💣ボムを使用', fr: 'Touchez le plateau pour utiliser 💣', it: 'Tocca il tabellone per usare 💣', zh: '点击棋盘使用💣炸弹'},

  // Goals
  'goal.score': {ko: '목표: {0}점', en: 'Goal: {0} pts', ja: '目標: {0}点', fr: 'Objectif : {0} pts', it: 'Obiettivo: {0} pts', zh: '目标: {0}分'},
  'goal.lines': {ko: '목표: {0}줄 클리어', en: 'Goal: Clear {0} lines', ja: '目標: {0}ライン消去', fr: 'Objectif : {0} lignes', it: 'Obiettivo: {0} linee', zh: '目标: 消除{0}行'},
  'goal.stone': {ko: '목표: 돌 {0}개 파괴', en: 'Goal: Destroy {0} stones', ja: '目標: 石{0}個破壊', fr: 'Objectif : {0} pierres', it: 'Obiettivo: {0} pietre', zh: '目标: 破坏{0}个石块'},
  'goal.ice': {ko: '목표: 얼음 {0}개 파괴', en: 'Goal: Break {0} ice', ja: '目標: 氷{0}個破壊', fr: 'Objectif : {0} glaces', it: 'Obiettivo: {0} ghiacci', zh: '目标: 打破{0}个冰块'},

  // Endless
  'endless.level': {ko: '무한 모드 - Lv.{0}', en: 'Endless - Lv.{0}', ja: '無限モード - Lv.{0}', fr: 'Infini - Nv.{0}', it: 'Infinita - Lv.{0}', zh: '无尽模式 - Lv.{0}'},
  'endless.nextLevel': {ko: '다음 레벨: {0}점', en: 'Next level: {0} pts', ja: '次のレベル: {0}点', fr: 'Prochain niveau : {0} pts', it: 'Prossimo livello: {0} pts', zh: '下一级: {0}分'},

  // Battle / Lobby
  'lobby.title': {ko: '⚔️ 대전 로비', en: '⚔️ Battle Lobby', ja: '⚔️ バトルロビー', fr: '⚔️ Lobby Combat', it: '⚔️ Lobby Battaglia', zh: '⚔️ 对战大厅'},
  'lobby.createRoom': {ko: '방 만들기', en: 'Create Room', ja: 'ルーム作成', fr: 'Créer salle', it: 'Crea stanza', zh: '创建房间'},
  'lobby.createDesc': {ko: '코드를 공유하여 친구와 대전', en: 'Share code to play with friends', ja: 'コードを共有して友達と対戦', fr: 'Partagez le code avec vos amis', it: 'Condividi il codice con gli amici', zh: '分享代码与好友对战'},
  'lobby.joinRoom': {ko: '방 참가', en: 'Join Room', ja: 'ルーム参加', fr: 'Rejoindre', it: 'Entra stanza', zh: '加入房间'},
  'lobby.joinDesc': {ko: '코드를 입력하여 참가', en: 'Enter code to join', ja: 'コードを入力して参加', fr: 'Entrez le code pour rejoindre', it: 'Inserisci il codice per entrare', zh: '输入代码加入'},
  'lobby.randomMatch': {ko: '랜덤 매칭', en: 'Random Match', ja: 'ランダムマッチ', fr: 'Match aléatoire', it: 'Partita casuale', zh: '随机匹配'},
  'lobby.randomDesc': {ko: '랜덤 상대와 즉시 대전', en: 'Instant match with random player', ja: 'ランダム対戦相手と即対戦', fr: 'Match instant avec joueur aléatoire', it: 'Partita istantanea con giocatore casuale', zh: '与随机玩家即时对战'},
  'lobby.waiting': {ko: '상대를 기다리는 중...', en: 'Waiting for opponent...', ja: '対戦相手を待っています...', fr: 'En attente d\'un adversaire...', it: 'In attesa dell\'avversario...', zh: '等待对手...'},
  'lobby.roomCode': {ko: '방 코드', en: 'Room Code', ja: 'ルームコード', fr: 'Code de salle', it: 'Codice stanza', zh: '房间代码'},
  'lobby.shareCode': {ko: '이 코드를 상대방에게 알려주세요', en: 'Share this code with your opponent', ja: 'このコードを対戦相手に共有', fr: 'Partagez ce code avec votre adversaire', it: 'Condividi questo codice con l\'avversario', zh: '将此代码告诉对手'},
  'lobby.enterCode': {ko: '방 코드 입력', en: 'Enter Room Code', ja: 'ルームコード入力', fr: 'Entrer le code', it: 'Inserisci codice', zh: '输入房间代码'},
  'lobby.join': {ko: '참가', en: 'Join', ja: '参加', fr: 'Rejoindre', it: 'Entra', zh: '加入'},
  'lobby.searching': {ko: '상대를 찾는 중...', en: 'Finding opponent...', ja: '対戦相手を探しています...', fr: 'Recherche d\'adversaire...', it: 'Cercando avversario...', zh: '寻找对手...'},
  'lobby.pleaseWait': {ko: '잠시만 기다려주세요', en: 'Please wait', ja: 'しばらくお待ちください', fr: 'Veuillez patienter', it: 'Attendere prego', zh: '请稍候'},
  'lobby.loadingPlayer': {ko: '플레이어 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', en: 'Loading player info. Please try again.', ja: 'プレイヤー情報を読み込み中です。もう一度お試しください。', fr: 'Chargement des infos joueur. Réessayez.', it: 'Caricamento info giocatore. Riprova.', zh: '正在加载玩家信息，请稍后再试。'},
  'lobby.createFail': {ko: '방 생성 실패: ', en: 'Room creation failed: ', ja: 'ルーム作成失敗: ', fr: 'Échec de création : ', it: 'Creazione fallita: ', zh: '创建房间失败: '},
  'lobby.createError': {ko: '방 만들기 실패: ', en: 'Failed to create room: ', ja: 'ルーム作成エラー: ', fr: 'Erreur de création : ', it: 'Errore creazione: ', zh: '创建房间出错: '},
  'lobby.enterCodeMsg': {ko: '4자리 코드를 입력하세요', en: 'Enter a 4-digit code', ja: '4桁のコードを入力してください', fr: 'Entrez un code à 4 chiffres', it: 'Inserisci un codice a 4 cifre', zh: '请输入4位代码'},
  'lobby.lookupFail': {ko: '방 조회 실패: ', en: 'Room lookup failed: ', ja: 'ルーム検索失敗: ', fr: 'Recherche échouée : ', it: 'Ricerca fallita: ', zh: '查询房间失败: '},
  'lobby.notFound': {ko: '방을 찾을 수 없습니다', en: 'Room not found', ja: 'ルームが見つかりません', fr: 'Salle introuvable', it: 'Stanza non trovata', zh: '未找到房间'},
  'lobby.joinFail': {ko: '방 참가 실패: ', en: 'Failed to join: ', ja: 'ルーム参加失敗: ', fr: 'Échec de rejoindre : ', it: 'Ingresso fallito: ', zh: '加入房间失败: '},
  'lobby.matchQueueFail': {ko: '매칭 대기열 참가 실패: ', en: 'Failed to enter queue: ', ja: 'マッチングキュー参加失敗: ', fr: 'Échec file d\'attente : ', it: 'Errore coda: ', zh: '匹配队列失败: '},
  'lobby.matchFail': {ko: '매칭 실패: ', en: 'Matching failed: ', ja: 'マッチング失敗: ', fr: 'Échec du match : ', it: 'Partita fallita: ', zh: '匹配失败: '},
  'lobby.unknownError': {ko: '알 수 없는 오류', en: 'Unknown error', ja: '不明なエラー', fr: 'Erreur inconnue', it: 'Errore sconosciuto', zh: '未知错误'},

  // Battle
  'battle.opponent': {ko: '상대방', en: 'Opponent', ja: '対戦相手', fr: 'Adversaire', it: 'Avversario', zh: '对手'},
  'battle.lines': {ko: '{0}줄', en: '{0}L', ja: '{0}列', fr: '{0}L', it: '{0}L', zh: '{0}行'},
  'battle.win': {ko: '🏆 승리!', en: '🏆 Victory!', ja: '🏆 勝利！', fr: '🏆 Victoire !', it: '🏆 Vittoria!', zh: '🏆 胜利！'},
  'battle.lose': {ko: '😢 패배', en: '😢 Defeat', ja: '😢 敗北', fr: '😢 Défaite', it: '😢 Sconfitta', zh: '😢 失败'},
  'battle.preparing': {ko: '게임 준비 중...', en: 'Preparing game...', ja: 'ゲーム準備中...', fr: 'Préparation...', it: 'Preparazione...', zh: '准备游戏中...'},
  'battle.connectionFail': {ko: '게임 연결 실패', en: 'Connection failed', ja: '接続失敗', fr: 'Connexion échouée', it: 'Connessione fallita', zh: '连接失败'},
  'battle.disconnected': {ko: '상대방 연결 끊김... 재접속 대기 ({0}초)', en: 'Opponent disconnected... Reconnecting ({0}s)', ja: '対戦相手が切断...再接続待ち ({0}秒)', fr: 'Adversaire déconnecté... Reconnexion ({0}s)', it: 'Avversario disconnesso... Riconnessione ({0}s)', zh: '对手断线... 重连等待 ({0}秒)'},

  // Missions
  'missions.title': {ko: '📋 미션 & 업적', en: '📋 Missions & Achievements', ja: '📋 ミッション＆実績', fr: '📋 Missions & Succès', it: '📋 Missioni & Traguardi', zh: '📋 任务与成就'},
  'missions.daily': {ko: '일일 미션', en: 'Daily Missions', ja: 'デイリーミッション', fr: 'Missions quotidiennes', it: 'Missioni giornaliere', zh: '每日任务'},
  'missions.achievements': {ko: '업적', en: 'Achievements', ja: '実績', fr: 'Succès', it: 'Traguardi', zh: '成就'},
  'missions.rewardClaimed': {ko: '보상 획득!', en: 'Reward Claimed!', ja: '報酬獲得！', fr: 'Récompense obtenue !', it: 'Ricompensa ottenuta!', zh: '已领取奖励！'},
  'missions.achievementClaimed': {ko: '업적 달성!', en: 'Achievement Unlocked!', ja: '実績達成！', fr: 'Succès débloqué !', it: 'Traguardo sbloccato!', zh: '成就解锁！'},
  'missions.starsEarned': {ko: '⭐ {0} 스타를 획득했습니다!', en: '⭐ {0} stars earned!', ja: '⭐ {0}スター獲得！', fr: '⭐ {0} étoiles gagnées !', it: '⭐ {0} stelle guadagnate!', zh: '⭐ 获得{0}星！'},

  // Level names
  'level.1': {ko: '시작!', en: 'Start!', ja: 'スタート！', fr: 'Début !', it: 'Inizio!', zh: '开始！'},
  'level.2': {ko: '워밍업', en: 'Warm Up', ja: 'ウォームアップ', fr: 'Échauffement', it: 'Riscaldamento', zh: '热身'},
  'level.3': {ko: '첫 도전', en: 'First Challenge', ja: '初挑戦', fr: 'Premier défi', it: 'Prima sfida', zh: '首次挑战'},
  'level.4': {ko: '줄 맞추기', en: 'Line Up', ja: 'ライン揃え', fr: 'Alignement', it: 'Allineamento', zh: '连线'},
  'level.5': {ko: '콤보 연습', en: 'Combo Practice', ja: 'コンボ練習', fr: 'Pratique combo', it: 'Pratica combo', zh: '连击练习'},
  'level.6': {ko: '돌 부수기', en: 'Break Stones', ja: '石を壊せ', fr: 'Casser pierres', it: 'Rompi pietre', zh: '碎石'},
  'level.7': {ko: '얼음 깨기', en: 'Break Ice', ja: '氷を割れ', fr: 'Briser glace', it: 'Rompi ghiaccio', zh: '破冰'},
  'level.8': {ko: '복합 도전', en: 'Mixed Challenge', ja: '複合チャレンジ', fr: 'Défi mixte', it: 'Sfida mista', zh: '综合挑战'},
  'level.9': {ko: '줄 마스터', en: 'Line Master', ja: 'ラインマスター', fr: 'Maître des lignes', it: 'Maestro linee', zh: '消行大师'},
  'level.10': {ko: '초원 보스', en: 'Meadow Boss', ja: '草原ボス', fr: 'Boss prairie', it: 'Boss prato', zh: '草原Boss'},
  'level.11': {ko: '뜨거운 시작', en: 'Hot Start', ja: '灼熱のスタート', fr: 'Début chaud', it: 'Inizio caldo', zh: '火热开始'},
  'level.12': {ko: '사막 폭풍', en: 'Desert Storm', ja: '砂漠の嵐', fr: 'Tempête désert', it: 'Tempesta deserto', zh: '沙漠风暴'},
  'level.13': {ko: '오아시스', en: 'Oasis', ja: 'オアシス', fr: 'Oasis', it: 'Oasi', zh: '绿洲'},
  'level.14': {ko: '신기루', en: 'Mirage', ja: '蜃気楼', fr: 'Mirage', it: 'Miraggio', zh: '海市蜃楼'},
  'level.15': {ko: '모래 폭풍', en: 'Sandstorm', ja: '砂嵐', fr: 'Tempête de sable', it: 'Tempesta di sabbia', zh: '沙暴'},
  'level.16': {ko: '피라미드', en: 'Pyramid', ja: 'ピラミッド', fr: 'Pyramide', it: 'Piramide', zh: '金字塔'},
  'level.17': {ko: '스핑크스', en: 'Sphinx', ja: 'スフィンクス', fr: 'Sphinx', it: 'Sfinge', zh: '狮身人面像'},
  'level.18': {ko: '사막의 밤', en: 'Desert Night', ja: '砂漠の夜', fr: 'Nuit du désert', it: 'Notte deserto', zh: '沙漠之夜'},
  'level.19': {ko: '최후 관문', en: 'Final Gate', ja: '最終関門', fr: 'Porte finale', it: 'Porta finale', zh: '最终关卡'},
  'level.20': {ko: '사막 보스', en: 'Desert Boss', ja: '砂漠ボス', fr: 'Boss désert', it: 'Boss deserto', zh: '沙漠Boss'},

  // World names
  'world.1': {ko: '초원', en: 'Meadow', ja: '草原', fr: 'Prairie', it: 'Prato', zh: '草原'},
  'world.2': {ko: '사막', en: 'Desert', ja: '砂漠', fr: 'Désert', it: 'Deserto', zh: '沙漠'},

  // Daily Missions
  'mission.play3': {ko: '게임 3판 플레이', en: 'Play 3 games', ja: '3ゲームプレイ', fr: 'Jouer 3 parties', it: 'Gioca 3 partite', zh: '玩3局'},
  'mission.score5000': {ko: '총 5,000점 획득', en: 'Score 5,000 total', ja: '合計5,000点獲得', fr: '5 000 points au total', it: '5.000 punti totali', zh: '总计得5000分'},
  'mission.lines10': {ko: '10줄 클리어', en: 'Clear 10 lines', ja: '10ラインクリア', fr: '10 lignes', it: '10 linee', zh: '消除10行'},
  'mission.combo5': {ko: '5콤보 달성', en: 'Reach 5 combo', ja: '5コンボ達成', fr: '5 combos', it: '5 combo', zh: '达成5连击'},
  'mission.level1': {ko: '레벨 1개 클리어', en: 'Clear 1 level', ja: '1レベルクリア', fr: '1 niveau', it: '1 livello', zh: '通过1关'},

  // Achievements
  'achieve.firstWin.title': {ko: '첫 승리', en: 'First Win', ja: '初勝利', fr: 'Première victoire', it: 'Prima vittoria', zh: '首胜'},
  'achieve.firstWin.desc': {ko: '첫 레벨 클리어', en: 'Clear first level', ja: '初レベルクリア', fr: 'Premier niveau', it: 'Primo livello', zh: '通过第一关'},
  'achieve.score10k.title': {ko: '만점 도전자', en: 'Score Hunter', ja: '万点チャレンジャー', fr: 'Chasseur de score', it: 'Cacciatore di punti', zh: '万分挑战者'},
  'achieve.score10k.desc': {ko: '무한 모드 10,000점', en: 'Endless 10,000 pts', ja: '無限モード10,000点', fr: '10 000 pts mode infini', it: '10.000 pts infinita', zh: '无尽模式10000分'},
  'achieve.score50k.title': {ko: '점수 마스터', en: 'Score Master', ja: 'スコアマスター', fr: 'Maître du score', it: 'Maestro punti', zh: '分数大师'},
  'achieve.score50k.desc': {ko: '무한 모드 50,000점', en: 'Endless 50,000 pts', ja: '無限モード50,000点', fr: '50 000 pts mode infini', it: '50.000 pts infinita', zh: '无尽模式50000分'},
  'achieve.lines100.title': {ko: '줄 클리어 100', en: '100 Lines', ja: '100ラインクリア', fr: '100 lignes', it: '100 linee', zh: '消除100行'},
  'achieve.lines100.desc': {ko: '총 100줄 클리어', en: 'Clear 100 lines total', ja: '合計100ライン消去', fr: '100 lignes au total', it: '100 linee totali', zh: '总计消除100行'},
  'achieve.lines500.title': {ko: '줄 클리어 500', en: '500 Lines', ja: '500ラインクリア', fr: '500 lignes', it: '500 linee', zh: '消除500行'},
  'achieve.lines500.desc': {ko: '총 500줄 클리어', en: 'Clear 500 lines total', ja: '合計500ライン消去', fr: '500 lignes au total', it: '500 linee totali', zh: '总计消除500行'},
  'achieve.combo10.title': {ko: '콤보 마스터', en: 'Combo Master', ja: 'コンボマスター', fr: 'Maître combo', it: 'Maestro combo', zh: '连击大师'},
  'achieve.combo10.desc': {ko: '10콤보 달성', en: 'Reach 10 combo', ja: '10コンボ達成', fr: '10 combos', it: '10 combo', zh: '达成10连击'},
  'achieve.levels10.title': {ko: '모험가', en: 'Adventurer', ja: '冒険家', fr: 'Aventurier', it: 'Avventuriero', zh: '冒险家'},
  'achieve.levels10.desc': {ko: '10레벨 클리어', en: 'Clear 10 levels', ja: '10レベルクリア', fr: '10 niveaux', it: '10 livelli', zh: '通过10关'},
  'achieve.levels20.title': {ko: '탐험가', en: 'Explorer', ja: '探検家', fr: 'Explorateur', it: 'Esploratore', zh: '探险家'},
  'achieve.levels20.desc': {ko: '20레벨 클리어', en: 'Clear 20 levels', ja: '20レベルクリア', fr: '20 niveaux', it: '20 livelli', zh: '通过20关'},
  'achieve.combo15.title': {ko: '콤보 달인', en: 'Combo Expert', ja: 'コンボ達人', fr: 'Expert combo', it: 'Esperto combo', zh: '连击达人'},
  'achieve.combo15.desc': {ko: '15콤보 달성', en: 'Reach 15 combo', ja: '15コンボ達成', fr: '15 combos', it: '15 combo', zh: '达成15连击'},
  'achieve.games50.title': {ko: '열정 플레이어', en: 'Passionate Player', ja: '情熱プレイヤー', fr: 'Joueur passionné', it: 'Giocatore appassionato', zh: '热情玩家'},
  'achieve.games50.desc': {ko: '50판 플레이', en: 'Play 50 games', ja: '50ゲームプレイ', fr: '50 parties', it: '50 partite', zh: '玩50局'},
  'achieve.endless5.title': {ko: '무한 도전', en: 'Endless Challenger', ja: '無限チャレンジ', fr: 'Défi infini', it: 'Sfida infinita', zh: '无尽挑战'},
  'achieve.endless5.desc': {ko: '무한 모드 레벨 5', en: 'Endless level 5', ja: '無限モードレベル5', fr: 'Niveau 5 infini', it: 'Livello 5 infinita', zh: '无尽模式5级'},
  'achieve.endless10.title': {ko: '무한 마스터', en: 'Endless Master', ja: '無限マスター', fr: 'Maître infini', it: 'Maestro infinito', zh: '无尽大师'},
  'achieve.endless10.desc': {ko: '무한 모드 레벨 10', en: 'Endless level 10', ja: '無限モードレベル10', fr: 'Niveau 10 infini', it: 'Livello 10 infinita', zh: '无尽模式10级'},

  // Result strings
  'result.score': {ko: '점수: {0}', en: 'Score: {0}', ja: 'スコア: {0}', fr: 'Score : {0}', it: 'Punteggio: {0}', zh: '分数: {0}'},
  'result.level': {ko: '레벨: {0}', en: 'Level: {0}', ja: 'レベル: {0}', fr: 'Niveau : {0}', it: 'Livello: {0}', zh: '等级: {0}'},
  'result.linesResult': {ko: '라인: {0}', en: 'Lines: {0}', ja: 'ライン: {0}', fr: 'Lignes : {0}', it: 'Linee: {0}', zh: '行数: {0}'},
  'result.maxCombo': {ko: '최대 콤보: {0}', en: 'Max Combo: {0}', ja: '最大コンボ: {0}', fr: 'Combo max : {0}', it: 'Combo max: {0}', zh: '最大连击: {0}'},
  'result.reward': {ko: '보상: ⭐ {0}', en: 'Reward: ⭐ {0}', ja: '報酬: ⭐ {0}', fr: 'Récompense : ⭐ {0}', it: 'Ricompensa: ⭐ {0}', zh: '奖励: ⭐ {0}'},
  'result.stars': {ko: '별: {0}', en: 'Stars: {0}', ja: '星: {0}', fr: 'Étoiles : {0}', it: 'Stelle: {0}', zh: '星: {0}'},
};

export function t(key: string, ...args: (string | number)[]): string {
  const entry = translations[key];
  if (!entry) return key;
  let text = entry[currentLang] || entry.en || key;
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, String(arg));
  });
  return text;
}

export function getLang(): Lang {
  return currentLang;
}
