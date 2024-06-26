import React, { FunctionComponent } from 'react';
import { SvgProps } from './types';

export const Favorite: FunctionComponent<SvgProps> = ({ size, ...rest }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} {...rest}>
      <path d="M17.56249,21.55957a.99941.99941,0,0,1-.46581-.11523L12,18.76465,6.90332,21.44434a.9999.9999,0,0,1-1.45117-1.05372l.97363-5.67578-4.124-4.01953a.99965.99965,0,0,1,.55469-1.70508l5.69824-.82812,2.54883-5.16406a1.04012,1.04012,0,0,1,1.793,0l2.54883,5.16406,5.69824.82812a.99965.99965,0,0,1,.55469,1.70508l-4.124,4.01953.97363,5.67578a1.00024,1.00024,0,0,1-.98536,1.169Z" />
    </svg>
  );
};
