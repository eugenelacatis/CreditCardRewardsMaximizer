import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function FadeInView({ children, duration = 600, delay = 0, style }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
}

export function SlideInView({
  children,
  direction = 'up', // up, down, left, right
  duration = 600,
  delay = 0,
  distance = 50,
  style,
}) {
  const slideAnim = useRef(new Animated.Value(distance)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim, duration, delay]);

  const getTransform = () => {
    switch (direction) {
      case 'up':
        return { translateY: slideAnim };
      case 'down':
        return { translateY: Animated.multiply(slideAnim, -1) };
      case 'left':
        return { translateX: slideAnim };
      case 'right':
        return { translateX: Animated.multiply(slideAnim, -1) };
      default:
        return { translateY: slideAnim };
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [getTransform()],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function ScaleInView({ children, duration = 400, delay = 0, style }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim, duration, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default { FadeInView, SlideInView, ScaleInView };
