import React from 'react';
import {
  AppState,
} from 'react-native';
import { connect } from 'react-redux';

import boundActions from '../boundActions';
import { getAuth } from '../account/accountSelectors';
import MainScreen from './MainScreen';

class MainScreenContainer extends React.Component {

  state: {
    currentAppState: boolean,
  }

  handleAppStateChange = (currentAppState) => {
    if (currentAppState === 'active') {
      this.props.appActivity();
    }
  }

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
    const { auth, narrow } = this.props;

    this.props.getEvents(auth);

    // We use requestAnimationFrame to force this to happen in the next
    // iteration of the event loop. This ensures that the last action ends
    // before the new action begins and makes the debug output clearer.
    requestAnimationFrame(() => {
      this.props.sendInitialGetUsers(auth);
      this.props.appActivity(auth);
      this.props.sendGetMessages(auth, Number.MAX_SAFE_INTEGER, 10, 10, narrow);
    });
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  render() {
    return (
      <MainScreen {...this.props} />
    );
  }
}

const mapStateToProps = (state) => ({
  auth: getAuth(state),
  isOnline: state.app.get('isOnline'),
  subscriptions: state.subscriptions,
  messages: state.messages.messages,
  fetching: state.messages.fetching,
  narrow: state.messages.narrow,
  pointer: state.messages.pointer,
  caughtUp: state.messages.caughtUp,
  streamlistOpened: state.nav.opened,
});

export default connect(mapStateToProps, boundActions)(MainScreenContainer);