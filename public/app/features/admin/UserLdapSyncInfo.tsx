import React, { PureComponent } from 'react';
import { dateTimeFormat } from '@grafana/data';
import { SyncInfo, UserDTO } from 'app/types';
import { Button, LinkButton } from '@grafana/ui';

interface Props {
  ldapSyncInfo: SyncInfo;
  user: UserDTO;
  onUserSync: () => void;
}

interface State {}

const format = 'dddd YYYY-MM-DD HH:mm zz';
const debugLDAPMappingBaseURL = '/admin/ldap';

export class UserLdapSyncInfo extends PureComponent<Props, State> {
  onUserSync = () => {
    this.props.onUserSync();
  };

  render() {
    const { ldapSyncInfo, user } = this.props;
    const prevSyncSuccessful = ldapSyncInfo && ldapSyncInfo.prevSync;
    const nextSyncSuccessful = ldapSyncInfo && ldapSyncInfo.nextSync;
    const nextSyncTime = nextSyncSuccessful ? dateTimeFormat(ldapSyncInfo.nextSync, { format }) : '';
    const prevSyncTime = prevSyncSuccessful ? dateTimeFormat(ldapSyncInfo.prevSync!.started, { format }) : '';
    const debugLDAPMappingURL = `${debugLDAPMappingBaseURL}?user=${user && user.login}`;

    return (
      <>
        <h3 className="page-heading">LDAP Synchronisation</h3>
        <div className="gf-form-group">
          <div className="gf-form">
            <table className="filter-table form-inline">
              <tbody>
                <tr>
                  <td>External sync</td>
                  <td>User synced via LDAP – some changes must be done in LDAP or mappings.</td>
                  <td>
                    <span className="label label-tag">LDAP</span>
                  </td>
                </tr>
                <tr>
                  {ldapSyncInfo.enabled ? (
                    <>
                      <td>Next scheduled synchronisation</td>
                      <td colSpan={2}>{nextSyncTime}</td>
                    </>
                  ) : (
                    <>
                      <td>Next scheduled synchronisation</td>
                      <td colSpan={2}>Not enabled</td>
                    </>
                  )}
                </tr>
                <tr>
                  {prevSyncSuccessful ? (
                    <>
                      <td>Last synchronisation</td>
                      <td>{prevSyncTime}</td>
                      <td>Successful</td>
                    </>
                  ) : (
                    <td colSpan={3}>Last synchronisation</td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="gf-form-button-row">
            <Button variant="secondary" onClick={this.onUserSync}>
              Sync user
            </Button>
            <LinkButton variant="secondary" href={debugLDAPMappingURL}>
              Debug LDAP Mapping
            </LinkButton>
          </div>
        </div>
      </>
    );
  }
}
