/**
 * Jar detail stack route — expo-router file-based routing resolves this
 * automatically from the file path. No app/_layout.tsx edit needed.
 *
 * Mounts JarDetailScreen which reads the `id` param via useLocalSearchParams.
 */

import React from 'react';

import { JarDetailScreen } from '@/src/features/jars/JarDetailScreen';

export default function JarDetailRoute(): React.JSX.Element {
  return <JarDetailScreen />;
}
