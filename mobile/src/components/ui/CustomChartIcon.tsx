import React from "react";
import Svg, { Path } from "react-native-svg";

export const CustomChartIcon = ({ size = 24, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 14v6 M12 6v14 M18 10v10" />
  </Svg>
);
