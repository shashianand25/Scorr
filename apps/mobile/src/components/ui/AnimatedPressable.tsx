import React from "react";
import { Pressable, Animated, StyleSheet } from "react-native";

/**
 * AnimatedPressable — a drop-in Pressable replacement with a smooth spring
 * press animation (scale + opacity). Subtle and modern, never jarring.
 */
export function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  disabled,
  scaleTo = 0.96,
  ...rest
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  [key: string]: any;
}) {
  const anim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(anim, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 3 }).start();
  };

  const flat = style ? StyleSheet.flatten(style) : {};

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale: anim }] }, flat ? { alignItems: flat.alignItems, justifyContent: flat.justifyContent, gap: flat.gap, flexDirection: flat.flexDirection } : null]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
