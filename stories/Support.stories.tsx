import * as React from 'react';
// @ts-ignore
import { storiesOf } from '@storybook/react';
// @ts-ignore
import { withInfo } from '@storybook/addon-info';
import { Support } from '@app/Support/Support';

const stories = storiesOf('Components', module);
stories.addDecorator(withInfo);
stories.add(
  'Support',
  () => <Support />,
  { info: { inline: true } }
);
