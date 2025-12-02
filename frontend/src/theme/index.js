// Central theme export
import colors from './colors';
import { spacing, borderRadius, shadows, typography } from './spacing';

// Export individual items for direct imports
export { colors, spacing, borderRadius, shadows, typography };

// Also export as combined theme object
export const theme = {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
};

export default theme;
