import {Alert, type AlertButton, type AlertOptions} from 'react-native';

export type GameDialogVariant = 'notice' | 'confirm' | 'success' | 'error';

export interface GameDialogRequest {
  id: number;
  title: string;
  message: string;
  buttons: AlertButton[];
  options?: AlertOptions;
  variant: GameDialogVariant;
  imageUrl?: string | null;
}

type Listener = (request: GameDialogRequest | null) => void;

let nextDialogId = 1;
let activeDialog: GameDialogRequest | null = null;
const dialogQueue: GameDialogRequest[] = [];
const listeners = new Set<Listener>();
let alertBridgeInstalled = false;

function notifyListeners() {
  listeners.forEach(listener => listener(activeDialog));
}

function pumpQueue() {
  if (activeDialog || dialogQueue.length === 0) {
    return;
  }

  activeDialog = dialogQueue.shift() ?? null;
  notifyListeners();
}

function inferDialogVariant(
  title?: string,
  message?: string,
  buttons?: AlertButton[],
): GameDialogVariant {
  if (buttons?.some(button => button.style === 'destructive')) {
    return 'error';
  }

  const combined = `${title ?? ''} ${message ?? ''}`.toLowerCase();
  if (
    combined.includes('오류') ||
    combined.includes('실패') ||
    combined.includes('잠금') ||
    combined.includes('삭제')
  ) {
    return 'error';
  }

  if (
    combined.includes('완료') ||
    combined.includes('보상') ||
    combined.includes('성공')
  ) {
    return 'success';
  }

  return buttons && buttons.length > 1 ? 'confirm' : 'notice';
}

export function subscribeGameDialog(listener: Listener) {
  listeners.add(listener);
  listener(activeDialog);
  return () => {
    listeners.delete(listener);
  };
}

export function openGameDialog({
  title = '',
  message = '',
  buttons,
  options,
  variant,
  imageUrl,
}: {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  variant?: GameDialogVariant;
  imageUrl?: string | null;
}) {
  const normalizedButtons =
    buttons && buttons.length > 0 ? buttons : [{text: '확인'}];
  const request: GameDialogRequest = {
    id: nextDialogId++,
    title,
    message,
    buttons: normalizedButtons,
    options,
    variant: variant ?? inferDialogVariant(title, message, normalizedButtons),
    imageUrl: imageUrl ?? null,
  };

  dialogQueue.push(request);
  pumpQueue();
  return request.id;
}

export function closeActiveGameDialog(buttonIndex: number | null = null) {
  const request = activeDialog;
  activeDialog = null;
  notifyListeners();

  if (request && buttonIndex !== null) {
    request.buttons[buttonIndex]?.onPress?.();
  }

  pumpQueue();
}

export function installGameAlertBridge() {
  if (alertBridgeInstalled) {
    return;
  }

  alertBridgeInstalled = true;
  const originalAlert = Alert.alert.bind(Alert);

  (Alert as typeof Alert & {
    __blockheroOriginalAlert?: typeof Alert.alert;
  }).__blockheroOriginalAlert = originalAlert;

  (Alert as any).alert = (
    title?: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) => {
    openGameDialog({
      title: title ?? '',
      message: message ?? '',
      buttons,
      options,
    });
  };
}

export function showGameConfirm({
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'confirm',
}: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: GameDialogVariant;
}) {
  return new Promise<boolean>(resolve => {
    openGameDialog({
      title,
      message,
      variant,
      buttons: [
        {
          text: cancelText,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmText,
          onPress: () => resolve(true),
        },
      ],
    });
  });
}
