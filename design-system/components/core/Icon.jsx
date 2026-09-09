import React from 'react';

const LUCIDE_BASE = 'https://unpkg.com/lucide-static@0.428.0/icons/';

/** 브랜드 전용 아이콘 자산을 제공받지 못해 Lucide(2px stroke, round cap)를 표준으로 씁니다.
 *  CSS mask로 그려서 색은 항상 currentColor를 따릅니다. */
export function Icon({ name, size = 20, style, ...rest }) {
  const url = LUCIDE_BASE + name + '.svg';
  return (
    <span
      aria-hidden="true"
      {...rest}
      style={{
        display: 'inline-block', width: size, height: size, flex: 'none',
        background: 'currentColor',
        WebkitMaskImage: 'url(' + url + ')', maskImage: 'url(' + url + ')',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        ...style,
      }}
    />
  );
}
