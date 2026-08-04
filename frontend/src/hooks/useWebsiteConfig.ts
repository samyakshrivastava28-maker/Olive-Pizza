import { useWebsiteConfigStore } from '../stores/websiteConfigStore';

export function useWebsiteConfig() {
  const homepage = useWebsiteConfigStore((state) => state.homepage);
  const theme = useWebsiteConfigStore((state) => state.theme);
  const navigation = useWebsiteConfigStore((state) => state.navigation);
  const isLoading = useWebsiteConfigStore((state) => state.isLoading);
  const campaigns = useWebsiteConfigStore((state) => state.campaigns);
  const activeAnnouncement = useWebsiteConfigStore((state) => state.activeAnnouncement);

  return {
    homepage,
    sections: homepage?.sections || [],
    theme,
    navigation,
    campaigns,
    activeAnnouncement,
    isLoading,
  };
}
