import { appEnv } from '../constants/env';

const request = async (path: string, payload: unknown) => {
  const endpoint = appEnv.notificationEndpoint;

  if (!endpoint) {
    return;
  }

  try {
    await fetch(`${endpoint}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn(`Notification request failed for ${path}:`, error);
  }
};

export const notifyFriendCheckin = async (payload: {
  tokens: string[];
  parkId?: string;
  parkName?: string;
}) => {
  await request('/notify/friend-checkin', payload);
};

export const notifyFriendEvent = async (payload: {
  tokens: string[];
  parkId?: string;
  parkName?: string;
  title?: string;
  scheduledAt?: number;
}) => {
  await request('/notify/event', payload);
};
