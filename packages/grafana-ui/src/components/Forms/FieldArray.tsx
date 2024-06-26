import { FC } from 'react';
import { useFieldArray, UseFieldArrayProps } from 'react-hook-form';
import { FieldArrayApi } from '../../types';

export interface FieldArrayProps extends UseFieldArrayProps {
  children: (api: FieldArrayApi) => JSX.Element;
}

export const FieldArray: FC<FieldArrayProps> = ({ name, control, children }) => {
  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
    control,
    name,
  });
  return children({ fields, append, prepend, remove, swap, move, insert });
};
