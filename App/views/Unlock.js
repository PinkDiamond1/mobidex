import React, { Component } from 'react';
import reactMixin from 'react-mixin';
import { Input, Text } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { connect } from 'react-redux';
import TimerMixin from 'react-timer-mixin';
import { generateWallet, lock, unlock } from '../../thunks';
import LongButton from '../components/LongButton';
import LongInput from '../components/LongInput';
import BigCenter from '../components/BigCenter';

@reactMixin.decorate(TimerMixin)
class Unlock extends Component {
  constructor(props) {
    super(props);

    this.state = {
      password: '',
      passwordError: false
    };
  }

  onSetPassword = value => {
    this.setState({ password: value, passwordError: false });
  };

  unlock = () => {
    this.requestAnimationFrame(async () => {
      try {
        await this.props.dispatch(unlock(this.state.password));
      } catch (err) {
        this.setState({ passwordError: true });
        return;
      }

      if (this.props.onFinish) await this.props.onFinish();
    });
  };

  render() {
    return (
      <BigCenter>
        <LongInput
          secureTextEntry={true}
          placeholder="Password"
          onChangeText={this.onSetPassword}
          errorMessage={
            this.state.passwordError
              ? 'Wrong or poorly formatted password. Passwords must be at least 6 characters long and must contain both numbers and letters.'
              : null
          }
          errorStyle={{ color: 'red' }}
          leftIcon={<Icon name="person" size={24} color="black" />}
          containerStyle={{ marginBottom: 10 }}
        />
        <LongButton large title="Unlock" onPress={this.unlock} />
      </BigCenter>
    );
  }
}

export default connect(state => ({}), dispatch => ({ dispatch }))(Unlock);
