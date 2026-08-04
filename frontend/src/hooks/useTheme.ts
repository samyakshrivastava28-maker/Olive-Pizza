import { useWebsiteConfigStore } from '../stores/websiteConfigStore';

export function useTheme() {
  const theme = useWebsiteConfigStore((state) => state.theme);

  return {
    theme,
    colors: theme?.colors,
    fonts: theme?.fonts,
    borderRadius: theme?.borderRadius,
    effects: theme?.effects,
    mode: theme?.mode || 'dark',
    cardStyle: theme?.cardStyle || 'glass',
  };
}
