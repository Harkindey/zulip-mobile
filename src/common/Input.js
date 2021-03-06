/* @flow */
import React, { PureComponent } from 'react';
import { TextInput } from 'react-native';
import { FormattedMessage } from 'react-intl';

import type { LocalizableText, StyleObj } from '../types';
import { nullFunction } from '../nullObjects';
import { HALF_COLOR } from '../styles';

export default class Input extends PureComponent {
  static contextTypes = {
    styles: () => null,
  };

  textInput: TextInput;
  props: {
    style?: StyleObj,
    restProps?: any[],
    placeholder?: LocalizableText,
    clearButton?: boolean,
    onChangeText?: (text: string) => void,
    textInputRef?: (component: TextInput) => void,
  };

  static defaultProps = {
    placeholder: {},
  };

  static defaultProps = {
    restProps: [],
    textInputRef: nullFunction,
  };

  handleClear = () => {
    const { onChangeText } = this.props;
    if (onChangeText) {
      onChangeText('');
    }
    this.textInput.clear();
  };

  render() {
    const { styles } = this.context;
    const { style, placeholder, textInputRef, ...restProps } = this.props;
    const placeholderMessage = placeholder.text || placeholder;

    return (
      <FormattedMessage
        id={placeholderMessage}
        defaultMessage={placeholderMessage}
        values={placeholder.values}
      >
        {text => (
          <TextInput
            style={[styles.input, style]}
            placeholder={text}
            placeholderTextColor={HALF_COLOR}
            ref={component => {
              this.textInput = component;
              if (textInputRef) textInputRef(component);
            }}
            {...restProps}
          />
        )}
      </FormattedMessage>
    );
  }
}
