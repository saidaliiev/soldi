/**
 * Jars tab route — mounts JarListScreen + JarCreateBottomSheet.
 *
 * The sheet is mounted here (not in root app/_layout.tsx) to avoid
 * root-layout ownership conflict with plan 04-03.
 */

import React from 'react';

import { JarListScreen } from '@/src/features/jars/JarListScreen';
import { JarCreateBottomSheet } from '@/src/features/jars/JarCreateBottomSheet';

export default function JarsTab(): React.JSX.Element {
  return (
    <>
      <JarListScreen />
      <JarCreateBottomSheet />
    </>
  );
}
