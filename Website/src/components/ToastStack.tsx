
interface ToastStackProps {
  toasts: {
    id: string;
    borderColor: string;
    bg: string;
    title: string;
    message: string;
  }[];
  onDismiss: (id: string) => void;
}

import { ToastCard } from './ToastCard';

export const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
  return (
    <div className="fixed flex flex-col gap-2" style={{ bottom: 20, right: 20, zIndex: 300, width: 310 }}>
      {toasts.map(t => <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
};