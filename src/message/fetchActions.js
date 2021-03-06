/* @flow */
import type { Action, Narrow, Dispatch, GetState } from '../types';
import { getMessages, getStreams, getUsers, registerForEvents } from '../api';
import {
  getAuth,
  getFirstMessageId,
  getLastMessageId,
  getCaughtUpForActiveNarrow,
  getFetchingForActiveNarrow,
  getActiveNarrow,
  getPushToken,
} from '../selectors';
import config from '../config';
import {
  INITIAL_FETCH_COMPLETE,
  MESSAGE_FETCH_START,
  MESSAGE_FETCH_COMPLETE,
  MARK_MESSAGES_READ,
} from '../actionConstants';
import timing from '../utils/timing';
import { allPrivateNarrow } from '../utils/narrow';
import { tryUntilSuccessful } from '../utils/async';
import { refreshNotificationToken } from '../utils/notifications';
import { initStreams } from '../streams/streamsActions';
import { initUsers, sendFocusPing } from '../users/usersActions';
import { initNotifications, realmInit } from '../realm/realmActions';
import { trySendMessages } from '../outbox/outboxActions';
import { startEventPolling } from '../events/eventActions';

export const messageFetchStart = (narrow: Narrow, numBefore: number, numAfter: number): Action => ({
  type: MESSAGE_FETCH_START,
  narrow,
  numBefore,
  numAfter,
});

export const messageFetchComplete = (
  messages: any[],
  narrow: Narrow,
  anchor: number,
  numBefore: number,
  numAfter: number,
  replaceExisting: boolean = false,
): Action => ({
  type: MESSAGE_FETCH_COMPLETE,
  messages,
  narrow,
  anchor,
  numBefore,
  numAfter,
  replaceExisting,
});

export const backgroundFetchMessages = (
  anchor: number,
  numBefore: number,
  numAfter: number,
  narrow: Narrow,
  useFirstUnread: boolean = false,
): Action => async (dispatch: Dispatch, getState: GetState) => {
  const messages = await getMessages(
    getAuth(getState()),
    anchor,
    numBefore,
    numAfter,
    narrow,
    useFirstUnread,
  );

  dispatch(messageFetchComplete(messages, narrow, anchor, numBefore, numAfter));
};

export const fetchMessages = (
  anchor: number,
  numBefore: number,
  numAfter: number,
  narrow: Narrow,
  useFirstUnread: boolean = false,
): Action => async (dispatch: Dispatch) => {
  dispatch(messageFetchStart(narrow, numBefore, numAfter));
  dispatch(backgroundFetchMessages(anchor, numBefore, numAfter, narrow, useFirstUnread));
};

export const fetchMessagesAtFirstUnread = (narrow: Narrow): Action =>
  fetchMessages(0, config.messagesPerRequest, 0, narrow, true);

export const markMessagesRead = (messageIds: number[]): Action => ({
  type: MARK_MESSAGES_READ,
  messageIds,
});

export const fetchOlder = () => (dispatch: Dispatch, getState: GetState): Action => {
  const state = getState();
  const firstMessageId = getFirstMessageId(state);
  const caughtUp = getCaughtUpForActiveNarrow(state);
  const fetching = getFetchingForActiveNarrow(state);
  const { narrow } = state.chat;
  const { needsInitialFetch } = state.app;

  if (!needsInitialFetch && !fetching.older && !caughtUp.older && firstMessageId) {
    dispatch(fetchMessages(firstMessageId, config.messagesPerRequest, 0, narrow));
  }
};

export const fetchNewer = () => (dispatch: Dispatch, getState: GetState): Action => {
  const state = getState();
  const lastMessageId = getLastMessageId(state);
  const caughtUp = getCaughtUpForActiveNarrow(state);
  const fetching = getFetchingForActiveNarrow(state);
  const { narrow } = state.chat;
  const { needsInitialFetch } = state.app;

  if (!needsInitialFetch && !fetching.newer && !caughtUp.newer && lastMessageId) {
    dispatch(fetchMessages(lastMessageId + 1, 0, config.messagesPerRequest, narrow));
  }
};

export const initialFetchComplete = (): Action => ({
  type: INITIAL_FETCH_COMPLETE,
});

export const fetchEssentialInitialData = (): Action => async (
  dispatch: Dispatch,
  getState: GetState,
) => {
  const auth = getAuth(getState());
  const narrow = getActiveNarrow(getState());
  const halfCount = Math.trunc(config.messagesPerRequest / 2);

  timing.start('Essential server data');
  const [initData, messages] = await Promise.all([
    await tryUntilSuccessful(() => registerForEvents(auth)),
    await tryUntilSuccessful(() => getMessages(auth, 0, halfCount, halfCount, narrow, true)),
  ]);

  timing.end('Essential server data');

  dispatch(realmInit(initData));
  dispatch(messageFetchComplete(messages, narrow, 0, config.messagesPerRequest, halfCount, true));
  dispatch(initialFetchComplete());

  dispatch(startEventPolling(initData.queue_id, initData.last_event_id));
};

export const fetchRestOfInitialData = (): Action => async (
  dispatch: Dispatch,
  getState: GetState,
) => {
  const auth = getAuth(getState());
  const pushToken = getPushToken(getState());

  timing.start('Rest of server data');
  const [messages, streams, users] = await Promise.all([
    await tryUntilSuccessful(() =>
      getMessages(auth, Number.MAX_SAFE_INTEGER, 100, 0, allPrivateNarrow),
    ),
    await tryUntilSuccessful(() => getStreams(auth)),
    await tryUntilSuccessful(() => getUsers(auth)),
  ]);

  timing.end('Rest of server data');
  dispatch(messageFetchComplete(messages, allPrivateNarrow, 0, 0, 0, true));
  dispatch(initStreams(streams));
  dispatch(initUsers(users));

  if (auth.apiKey !== '' && pushToken === '') {
    refreshNotificationToken();
  }
  dispatch(trySendMessages());
};

export const doInitialFetch = (): Action => async (dispatch: Dispatch, getState: GetState) => {
  dispatch(fetchEssentialInitialData());
  dispatch(fetchRestOfInitialData());

  if (config.enableNotifications) {
    dispatch(initNotifications());
  }
  dispatch(sendFocusPing());
  setInterval(() => sendFocusPing(), 60 * 1000);
};
