import { useEffect, useState } from 'react';
import PizzaLoader from './ui/PizzaLoader';

export default function GlobalLoader() {
  // Only show the loader on initial app load
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide it after a short delay to simulate initial app load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200); // 1.2 second loading simulation

    return () => clearTimeout(timer);
  }, []); // Empty dependency array ensures this runs strictly once

  if (!isLoading) return null;

  return <PizzaLoader message="Freshly baking your experience..." />;
}
