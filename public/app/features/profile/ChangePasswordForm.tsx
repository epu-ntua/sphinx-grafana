import React, { FC } from 'react';
import config from 'app/core/config';
import { Button, LinkButton, Form, Field, Input, HorizontalGroup } from '@grafana/ui';
import { ChangePasswordFields } from 'app/core/utils/UserProvider';
import { css } from 'emotion';
import { useTranslation } from 'react-i18next';

export interface Props {
  isSaving: boolean;
  onChangePassword: (payload: ChangePasswordFields) => void;
}

export const ChangePasswordForm: FC<Props> = ({ onChangePassword, isSaving }) => {
  const { ldapEnabled, authProxyEnabled } = config;
  const { t } = useTranslation();

  if (ldapEnabled || authProxyEnabled) {
    return <p>You cannot change password when ldap or auth proxy authentication is enabled.</p>;
  }
  return (
    <div
      className={css`
        max-width: 400px;
      `}
    >
      <Form onSubmit={onChangePassword}>
        {({ register, errors, getValues }) => {
          return (
            <>
              <Field
                label={t('welcome.banner.old.pass')}
                invalid={!!errors.oldPassword}
                error={errors?.oldPassword?.message}
              >
                <Input type="password" name="oldPassword" ref={register({ required: 'Old password is required' })} />
              </Field>

              <Field
                label={t('welcome.banner.new.passwor')}
                invalid={!!errors.newPassword}
                error={errors?.newPassword?.message}
              >
                <Input
                  type="password"
                  name="newPassword"
                  ref={register({
                    required: 'New password is required',
                    validate: {
                      confirm: v => v === getValues().confirmNew || 'Passwords must match',
                      old: v => v !== getValues().oldPassword || `New password can't be the same as the old one.`,
                    },
                  })}
                />
              </Field>

              <Field
                label={t('welcome.banner.confirm.pass')}
                invalid={!!errors.confirmNew}
                error={errors?.confirmNew?.message}
              >
                <Input
                  type="password"
                  name="confirmNew"
                  ref={register({
                    required: 'New password confirmation is required',
                    validate: v => v === getValues().newPassword || 'Passwords must match',
                  })}
                />
              </Field>
              <HorizontalGroup>
                <Button variant="primary" disabled={isSaving}>
                  {t('welcome.banner.change.pass')}
                </Button>
                <LinkButton variant="secondary" href={`${config.appSubUrl}/profile`}>
                  {t('welcome.banner.cancel')}
                </LinkButton>
              </HorizontalGroup>
            </>
          );
        }}
      </Form>
    </div>
  );
};
