import React from 'react';
import config from 'app/core/config';

import { updateLocation } from 'app/core/actions';
import { connect } from 'react-redux';
import { StoreState } from 'app/types';
import { PureComponent } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { hot } from 'react-hot-loader';
import appEvents from 'app/core/app_events';
import { AppEvents } from '@grafana/data';
import * as CryptoJS from 'crypto-js';

const isOauthEnabled = () => {
  return !!config.oauth && Object.keys(config.oauth).length > 0;
};

export interface FormModel {
  user: string;
  password: string;
  email: string;
}

export class LoginModel {
  sphinxsmticketaux: string;
}

interface Props {
  routeParams?: any;
  updateLocation?: typeof updateLocation;
  children: (props: {
    loginSM: (data: FormModel) => void;
    isLoggingIn: boolean;
    changePassword: (pw: string) => void;
    isChangingPassword: boolean;
    skipPasswordChange: Function;
    login: (data: FormModel) => void;
    disableLoginForm: boolean;
    ldapEnabled: boolean;
    authProxyEnabled: boolean;
    disableUserSignUp: boolean;
    isOauthEnabled: boolean;
    loginHint: string;
    passwordHint: string;
  }) => JSX.Element;
}

interface State {
  isLoggingIn: boolean;
  isChangingPassword: boolean;
}

export class LoginCtrl extends PureComponent<Props, State> {
  result: any = {};
  constructor(props: Props) {
    super(props);
    this.state = {
      isLoggingIn: false,
      isChangingPassword: false,
    };

    if (config.loginError) {
      appEvents.emit(AppEvents.alertWarning, ['Login Failed', config.loginError]);
    }
  }

  changePassword = (password: string) => {
    const pw = {
      newPassword: password,
      confirmNew: password,
      oldPassword: 'admin',
    };
    if (!this.props.routeParams.code) {
      getBackendSrv()
        .put('/api/user/password', pw)
        .then(() => {
          this.toGrafana();
        })
        .catch((err: any) => console.error(err));
    }

    const resetModel = {
      code: this.props.routeParams.code,
      newPassword: password,
      confirmPassword: password,
    };

    getBackendSrv()
      .post('/api/user/password/reset', resetModel)
      .then(() => {
        this.toGrafana();
      });
  };

  login = (formModel: FormModel) => {
    this.setState({
      isLoggingIn: true,
    });

    getBackendSrv()
      .post('/login', formModel)
      .then((result: any) => {
        this.result = result;
        let sphinxsmticketaux = formModel.user + ' ' + formModel.password + ' ' + formModel.email;
        var key = CryptoJS.enc.Utf8.parse('7061737323313233');
        var iv = CryptoJS.enc.Utf8.parse('7061737323313233');
        var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(sphinxsmticketaux), key, {
          keySize: 128 / 8,
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
        sessionStorage.setItem('sphinxsmaux', encrypted.toString());

        if (this.result.sphinx_sm_ticket) {
          // if there's a SPHNIX Service Manager ticket, it is make global
          sessionStorage.setItem('sphinx_sm_ticket', this.result.sphinx_sm_ticket);
          localStorage.setItem('sphinx_sm_ticket', this.result.sphinx_sm_ticket);
        }

        if (formModel.user !== 'admin' || config.ldapEnabled || config.authProxyEnabled) {
          this.toGrafana();
          return;
        } else {
          this.changeView();
        }
      })
      .catch(() => {
        this.setState({
          isLoggingIn: false,
        });
      });
  };

  // Sphinx SM Login
  loginSM = (formModel: FormModel) => {
    this.setState({
      isLoggingIn: true,
    });

    let loginModel: LoginModel = new LoginModel();
    if (sessionStorage.getItem('sphinxsmaux')! === null || sessionStorage.getItem('sphinxsmaux')! === undefined) {
      let sphinxsmticketaux = formModel.user + ' ' + formModel.password + ' ' + formModel.email;
      var key = CryptoJS.enc.Utf8.parse('7061737323313233');
      var iv = CryptoJS.enc.Utf8.parse('7061737323313233');
      var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(sphinxsmticketaux), key, {
        keySize: 128 / 8,
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      sessionStorage.setItem('sphinxsmaux', encrypted.toString());
      loginModel.sphinxsmticketaux = sessionStorage.getItem('sphinxsmaux')!;
    } else {
      loginModel.sphinxsmticketaux = sessionStorage.getItem('sphinxsmaux')!;
    }
    // var intervalID = setInterval(alert, 1000); // Will alert every second.
    // clearInterval(intervalID); // Will clear the timer.
    // setTimeout(alert, 1000); // Will alert once, after a second.
    // var interval = setInterval(function () { console.log('Testing'); }, 2000);
    getBackendSrv()
      .post('/loginSM', loginModel)
      .then((result: any) => {
        this.result = result;
        if (this.result.sphinx_sm_ticket) {
          // if there's a SPHNIX Service Manager ticket, it is make global
          sessionStorage.setItem('sphinx_sm_ticket', this.result.sphinx_sm_ticket);
          localStorage.setItem('sphinx_sm_ticket', this.result.sphinx_sm_ticket);
        }
        if (formModel.user !== 'admin' || config.ldapEnabled || config.authProxyEnabled) {
          this.toGrafana();
          return;
        } else {
          this.changeView();
        }
      })
      .catch(() => {
        this.setState({
          isLoggingIn: false,
        });
      });
  };

  changeView = () => {
    this.setState({
      isChangingPassword: true,
    });
  };

  toGrafana = () => {
    // Use window.location.href to force page reload
    if (this.result.redirectUrl) {
      if (config.appSubUrl !== '' && !this.result.redirectUrl.startsWith(config.appSubUrl)) {
        window.location.href = config.appSubUrl + this.result.redirectUrl;
      } else {
        window.location.href = this.result.redirectUrl;
      }
    } else {
      window.location.href = config.appSubUrl + '/';
    }
  };

  render() {
    const { children } = this.props;
    const { isLoggingIn, isChangingPassword } = this.state;
    const { login, loginSM, toGrafana, changePassword } = this;
    const { loginHint, passwordHint, disableLoginForm, ldapEnabled, authProxyEnabled, disableUserSignUp } = config;

    return (
      <>
        {children({
          loginSM,
          isOauthEnabled: isOauthEnabled(),
          loginHint,
          passwordHint,
          disableLoginForm,
          ldapEnabled,
          authProxyEnabled,
          disableUserSignUp,
          login,
          isLoggingIn,
          changePassword,
          skipPasswordChange: toGrafana,
          isChangingPassword,
        })}
      </>
    );
  }
}

export function loginSMCall() {
  // alert('hello');
  // LoginCtrl.prototype.setState!({
  //   isLoggingIn: true,
  // });
  let loginModel: LoginModel = new LoginModel();
  loginModel.sphinxsmticketaux = sessionStorage.getItem('sphinxsmaux')!;
  if (sessionStorage.getItem('sphinxsmaux')! === null || sessionStorage.getItem('sphinxsmaux')! === undefined) {
    return;
  } else {
    // alert(loginModel.sphinxsmticketaux)
    getBackendSrv()
      .post('/loginSM', loginModel)
      .then((result: any) => {
        result.message = '';
        if (result.sphinx_sm_ticket) {
          sessionStorage.setItem('sphinx_sm_ticket', result.sphinx_sm_ticket);
          localStorage.setItem('sphinx_sm_ticket', result.sphinx_sm_ticket);
        } else {
          localStorage.setItem('sphinx_sm_ticket', 'Ticket not provided ' + Math.floor(Math.random() * 100).toString());
          sessionStorage.setItem(
            'sphinx_sm_ticket',
            'Ticket not provided ' + Math.floor(Math.random() * 100).toString()
          );
        }
        return;
      })
      .catch(() => {
        localStorage.setItem(
          'sphinx_sm_ticket',
          'Error logging in to SM ' + Math.floor(Math.random() * 100).toString()
        );
        sessionStorage.setItem(
          'sphinx_sm_ticket',
          'Error logging in to SM ' + Math.floor(Math.random() * 100).toString()
        );
        // LoginCtrl.prototype.setState({
        //   isLoggingIn: false,
        // });
        return;
      });
  }
  return;
}

export const mapStateToProps = (state: StoreState) => ({
  routeParams: state.location.routeParams,
});

const mapDispatchToProps = { updateLocation };

export default hot(module)(connect(mapStateToProps, mapDispatchToProps)(LoginCtrl));
