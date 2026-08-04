import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useNotifStore } from './notif-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;
let reconnectAttempts = 0;

const NOTIFICATION_LABELS: Record<string, string> = {
  ASSIGNMENT: 'New assignment',
  DUE_TODAY: 'Due today',
  DELAYED: 'Delayed task',
  APPROVAL: 'Approval',
  COMMENT: 'New comment',
  MENTION: 'You were mentioned',
  TASK_UPDATE: 'Task update',
};

function notify(title: string, message?: string) {
  toast(title, { description: message });
}

function bumpNotifications() {
  useNotifStore.getState().bump();
}

function wireListeners(s: Socket) {
  s.on('task.created', () => notify('New task', 'A task has been created.'));
  s.on('task.updated', (p: { taskId?: string; status?: string } | undefined) => {
    notify('Task updated', p?.status ? `Status changed to ${p.status}.` : 'A task you follow has been updated.');
    bumpNotifications();
  });
  s.on('task.assigned', (p: { taskId?: string } | undefined) => {
    notify('Task assigned', 'A new task has been assigned to you.');
    bumpNotifications();
  });
  s.on('task.commented', (p: { taskId?: string } | undefined) => {
    notify('New comment', 'Someone commented on your task.');
    bumpNotifications();
  });
  s.on('client.created', (p: { name?: string } | undefined) => {
    notify('Client created', p?.name ? `${p.name} was added.` : 'A new client was added.');
  });
  s.on('stakeholder.changed', (p: { clientId?: string; role?: string } | undefined) => {
    notify('Stakeholder changed', p?.role ? `Your role is now ${p.role}.` : 'A stakeholder assignment was updated.');
    bumpNotifications();
  });
  s.on('notification', (p: { type?: string } | undefined) => {
    const label = (p?.type && NOTIFICATION_LABELS[p.type]) || 'Notification';
    notify(label, 'You have a new notification.');
    bumpNotifications();
  });
}

export function connectSocket(userId?: string) {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    query: userId ? { userId } : {},
    auth: userId ? { userId } : {},
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0,
  });
  socket.on('connect', () => {
    reconnectAttempts = 0;
  });
  socket.on('connect_error', () => {
    reconnectAttempts += 1;
    if (reconnectAttempts >= 3) socket?.disconnect();
  });
  wireListeners(socket);
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
