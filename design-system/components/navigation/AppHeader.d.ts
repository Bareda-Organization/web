import * as React from 'react';

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;
  /** 호차·매니저 등 메타 한 줄 */
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  /** 오른쪽 IconButton들 */
  actions?: React.ReactNode;
  /** brand=크롬 면(오프화이트 + 하단 선, 다크에선 딥) · plain=본문과 같은 바탕 */
  tone?: 'brand' | 'plain';
}
export function AppHeader(props: AppHeaderProps): JSX.Element;
