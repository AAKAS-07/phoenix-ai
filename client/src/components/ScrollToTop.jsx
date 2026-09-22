import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function scrollToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'instant'
  });

  if (document.documentElement) {
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }

  if (document.body) {
    document.body.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }

  const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.querySelector('.auth-split-right');
  if (mainContent) {
    mainContent.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }
}

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    scrollToTop();
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
