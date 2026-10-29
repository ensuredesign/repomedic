import React from 'react';
import { Composition } from 'remotion';
import { RepoMedicDemo, TOTAL_DURATION_FRAMES } from './RepoMedicDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RepoMedicDemo"
        component={RepoMedicDemo}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
