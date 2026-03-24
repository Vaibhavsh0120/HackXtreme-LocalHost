import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme';

interface AudioVisualizerProps {
  level: number; // 0.0 to 1.0
  barCount?: number;
  color?: string;
}

const AudioBar: React.FC<{
  amplitude: SharedValue<number>;
  motion: SharedValue<number>;
  index: number;
  barCount: number;
  color: string;
}> = ({ amplitude, motion, index, barCount, color }) => {
  const envelope = barCount <= 1 ? 1 : Math.sin(((index + 1) / (barCount + 1)) * Math.PI);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${(
      0.16 +
      amplitude.value * envelope * (0.35 + 0.65 * Math.abs(Math.sin(motion.value + index * 0.55)))
    ) * 100}%`,
    opacity: 0.35 + amplitude.value * 0.65,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  level,
  barCount = 9,
  color,
}) => {
  const { colors } = useAppTheme();
  const amplitude = useSharedValue(0);
  const motion = useSharedValue(0);
  const bars = Array.from({ length: barCount }, (_, i) => i);

  useEffect(() => {
    amplitude.value = withTiming(Math.max(0, Math.min(level, 1)), {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  }, [amplitude, level]);

  useEffect(() => {
    motion.value = 0;
    motion.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 780,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(motion);
    };
  }, [motion]);

  return (
    <View style={styles.container}>
      {bars.map((index) => (
        <AudioBar
          key={index}
          amplitude={amplitude}
          motion={motion}
          index={index}
          barCount={barCount}
          color={color ?? colors.accentViolet}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 6,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    minHeight: 12,
  },
});
