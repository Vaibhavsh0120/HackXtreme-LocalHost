import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PrivacyBadgeProps {
  /** Short context label, e.g. "Chat", "Voice", "Speech" */
  label?: string;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ label }) => {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        🛡️ {label ? `${label} · ` : ''}Fully offline · Private & secure
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#10B98115',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#10B98130',
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
    letterSpacing: 0.2,
  },
});
