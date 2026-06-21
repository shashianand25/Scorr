const React = require('react');
const { Svg, Path } = require('react-native-svg');

const CustomChartIcon = ({ size = 24, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 20h16 M8 16v4 M12 6v14 M16 11v9" />
  </Svg>
);
