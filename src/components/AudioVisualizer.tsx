import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '../theme';

interface AudioVisualizerProps {
  level: number; // 0.0 to 1.0
  barCount?: number;
}

const AudioBar: React.FC<{ level: number, index: number, barCount: number; color: string }> = ({ level, index, barCount, color }) => {
  const height = useSharedValue(0.2);

  useEffect(() => {
    // Create wave effect across the bars
    const waveEffect = Math.sin((index / (barCount - 1)) * Math.PI);
    // Base height 0.2, multiply by level, ensure smoothly scales
    const targetHeight = Math.max(0.15, level * waveEffect * 1.5);
    
    height.value = withSpring(Math.min(targetHeight, 1.0), { 
      damping: 12, 
      stiffness: 150 
    });
  }, [level, index, barCount, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value * 100}%`,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  level,
  barCount = 7,
}) => {
  const { colors } = useAppTheme();
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View style={styles.container}>
      {bars.map((index) => (
        <AudioBar key={index} level={level} index={index} barCount={barCount} color={colors.accentViolet} />
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
