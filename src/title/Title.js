/* @flow */
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';

import {
  isHomeNarrow,
  isPrivateNarrow,
  isGroupNarrow,
  isSpecialNarrow,
  isStreamNarrow,
  isTopicNarrow,
} from '../utils/narrow';
import { getCurrentRealm } from '../selectors';

import TitleHome from './TitleHome';
import TitlePrivate from './TitlePrivateContainer';
import TitleGroup from './TitleGroupContainer';
import TitleSpecial from './TitleSpecialContainer';
import TitleStream from './TitleStreamContainer';
import TitlePlain from './TitlePlain';

const titles = [
  { isFunc: isHomeNarrow, component: TitleHome },
  { isFunc: isSpecialNarrow, component: TitleSpecial },
  { isFunc: isStreamNarrow, component: TitleStream },
  { isFunc: isTopicNarrow, component: TitleStream },
  { isFunc: isPrivateNarrow, component: TitlePrivate },
  { isFunc: isGroupNarrow, component: TitleGroup },
];

class Title extends PureComponent {
  render() {
    const { narrow, editMessage, color } = this.props;
    const titleType = titles.find(x => x.isFunc(narrow));
    if (editMessage != null) {
      return <TitlePlain text="Edit message" color={color} />;
    }
    if (!titleType) return null;

    return <titleType.component color={color} />;
  }
}

export default connect(state => ({
  realm: getCurrentRealm(state),
  narrow: state.chat.narrow,
  users: state.users,
  subscriptions: state.subscriptions,
  streams: state.streams,
  editMessage: state.app.editMessage,
}))(Title);
