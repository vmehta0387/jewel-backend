import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

type WaveBand = {
  id: string;
  top: number;
  shift: number;
  height: number;
  rotate: number;
  opacity: number;
  fill: string;
  border: string;
  sheen: string;
  lowlight: string;
};

const WAVE_BANDS: WaveBand[] = [
  {
    id: '1',
    top: 0.28,
    shift: -0.08,
    height: 0.084,
    rotate: -28,
    opacity: 0.8,
    fill: 'rgba(249, 236, 220, 0.62)',
    border: 'rgba(255, 255, 255, 0.42)',
    sheen: 'rgba(255, 255, 255, 0.34)',
    lowlight: 'rgba(241, 214, 182, 0.16)',
  },
  {
    id: '2',
    top: 0.35,
    shift: -0.03,
    height: 0.09,
    rotate: -28,
    opacity: 0.82,
    fill: 'rgba(248, 232, 214, 0.68)',
    border: 'rgba(255, 255, 255, 0.46)',
    sheen: 'rgba(255, 255, 255, 0.38)',
    lowlight: 'rgba(239, 205, 170, 0.18)',
  },
  {
    id: '3',
    top: 0.43,
    shift: 0.01,
    height: 0.096,
    rotate: -28,
    opacity: 0.84,
    fill: 'rgba(246, 225, 205, 0.72)',
    border: 'rgba(255, 255, 255, 0.48)',
    sheen: 'rgba(255, 255, 255, 0.4)',
    lowlight: 'rgba(235, 198, 160, 0.2)',
  },
  {
    id: '4',
    top: 0.52,
    shift: 0.06,
    height: 0.102,
    rotate: -28,
    opacity: 0.82,
    fill: 'rgba(244, 220, 197, 0.74)',
    border: 'rgba(255, 255, 255, 0.44)',
    sheen: 'rgba(255, 255, 255, 0.34)',
    lowlight: 'rgba(233, 191, 151, 0.18)',
  },
];

const AppBackground = () => {
  const { width, height } = useWindowDimensions();
  const waveWidth = width * 1.9;
  const waveLeft = -width * 0.58;

  return (
    <View pointerEvents="none" style={styles.canvas}>
      <View style={styles.baseWash} />

      <View
        style={[
          styles.topSheet,
          {
            width: width * 1.58,
            height: height * 0.25,
            left: -width * 0.22,
            top: -height * 0.03,
          },
        ]}
      />
      <View
        style={[
          styles.topVeil,
          {
            width: width * 1.34,
            height: height * 0.16,
            left: -width * 0.08,
            top: height * 0.065,
          },
        ]}
      />
      <View
        style={[
          styles.cornerGlow,
          {
            width: width * 0.82,
            height: height * 0.2,
            right: -width * 0.12,
            top: height * 0.04,
          },
        ]}
      />
      <View
        style={[
          styles.centerMist,
          {
            width: width * 1.24,
            height: height * 0.18,
            left: -width * 0.1,
            top: height * 0.31,
          },
        ]}
      />

      {WAVE_BANDS.map((band, index) => {
        const bandHeight = height * band.height;

        return (
          <View
            key={band.id}
            style={[
              styles.waveBand,
              {
                top: height * band.top,
                left: waveLeft + width * band.shift,
                width: waveWidth,
                height: bandHeight,
                opacity: band.opacity,
                backgroundColor: band.fill,
                borderColor: band.border,
                transform: [{ rotate: `${band.rotate}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.waveSheen,
                {
                  top: bandHeight * 0.11,
                  height: bandHeight * 0.24,
                  backgroundColor: band.sheen,
                },
              ]}
            />
            <View
              style={[
                styles.waveCore,
                {
                  top: bandHeight * 0.44,
                  height: bandHeight * 0.28,
                  backgroundColor: band.lowlight,
                },
              ]}
            />
            <View
              style={[
                styles.waveRim,
                {
                  bottom: bandHeight * 0.1,
                  height: bandHeight * 0.16,
                  backgroundColor:
                    index % 2 === 0 ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)',
                },
              ]}
            />
          </View>
        );
      })}

      <View
        style={[
          styles.bottomBloom,
          {
            width: width * 1.12,
            height: height * 0.22,
            left: -width * 0.05,
            bottom: -height * 0.03,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f6ead9',
    overflow: 'hidden',
  },
  baseWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f6ead9',
  },
  topSheet: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 999,
    transform: [{ rotate: '-20deg' }],
  },
  topVeil: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    transform: [{ rotate: '-18deg' }],
  },
  cornerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    transform: [{ rotate: '14deg' }],
  },
  centerMist: {
    position: 'absolute',
    backgroundColor: 'rgba(249, 234, 216, 0.4)',
    borderRadius: 999,
    transform: [{ rotate: '-9deg' }],
  },
  waveBand: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  waveSheen: {
    position: 'absolute',
    left: '2%',
    right: '2%',
    borderRadius: 999,
  },
  waveCore: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    borderRadius: 999,
  },
  waveRim: {
    position: 'absolute',
    left: '6%',
    right: '12%',
    borderRadius: 999,
  },
  bottomBloom: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 222, 194, 0.22)',
    borderRadius: 999,
    transform: [{ rotate: '7deg' }],
  },
});

export default AppBackground;
