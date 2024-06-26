import React, { PureComponent } from 'react';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { StoreState } from 'app/types';
import { NavModel } from '@grafana/data';
import { getNavModel } from 'app/core/selectors/navModel';
import { UserProvider } from 'app/core/utils/UserProvider';
import Page from 'app/core/components/Page/Page';
import { ChangePasswordForm } from './ChangePasswordForm';
import { withTranslation } from 'react-i18next';

export interface Props {
  navModel: NavModel;
}

export class ChangePasswordPage extends PureComponent<Props> {
  render() {
    // @ts-ignore
    const { navModel, t } = this.props;
    return (
      <Page navModel={navModel}>
        <UserProvider>
          {({ changePassword }, states) => (
            <Page.Contents>
              <h3 className="page-sub-heading">{t('text.change.pass')}</h3>
              <ChangePasswordForm onChangePassword={changePassword} isSaving={states.changePassword} />
            </Page.Contents>
          )}
        </UserProvider>
      </Page>
    );
  }
}

function mapStateToProps(state: StoreState) {
  return {
    navModel: getNavModel(state.navIndex, `change-password`),
  };
}

const mapDispatchToProps = {};

export default withTranslation()(hot(module)(connect(mapStateToProps, mapDispatchToProps)(ChangePasswordPage)));
