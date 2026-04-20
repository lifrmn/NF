// src/components/CustomButton.tsx
/* ==================================================================================
 * 🎨 CUSTOM BUTTON COMPONENT - REUSABLE BUTTON WITH VARIANTS

* ==================================================================================
 * 
 * Tujuan Component:
 * Component ini adalah reusable button dengan berbagai variant dan size.
 * Digunakan di seluruh aplikasi untuk consistency UI dan reduce code duplication.
 * 
 * Features:
 * 1. Variants: Primary (blue), Secondary (green), Link (transparent/no background)
 * 2. Sizes: Small, Medium, Large (different padding and font size)
 * 3. States: Normal, Disabled, Loading (with spinner)
 * 4. Accessibility: accessibilityRole, accessibilityLabel, hitSlop
 * 5. Error Handling: Try-catch untuk prevent app crash jika onPress error
 * 6. Debug Logging: Console logs untuk track button interactions
 * 
 * Props:
 * - title: string - Text yang ditampilkan di button
 * - onPress: () => void - Function yang dipanggil saat button di-tap
 * - style: ViewStyle (optional) - Custom style untuk override default
 * - textStyle: TextStyle (optional) - Custom text style
 * - disabled: boolean (optional) - Disable button (gray out, tidak bisa di-tap)
 * - loading: boolean (optional) - Show loading spinner instead of text
 * - variant: 'primary' | 'secondary' | 'link' (default: 'primary')
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 * 
 * Usage Examples:
 * ```tsx
 * // Primary button (default)
 * <CustomButton title="Login" onPress={handleLogin} />
 * 
 * // Secondary button with loading state
 * <CustomButton 
 *   title="Register" 
 *   onPress={handleRegister}
 *   variant="secondary"
 *   loading={isRegistering}
 * />
 * 
 * // Link button (no background, for secondary actions)
 * <CustomButton 
 *   title="Forgot Password?" 
 *   onPress={handleForgotPassword}
 *   variant="link"
 *   size="small"
 * />
 * 
 * // Disabled button
 * <CustomButton 
 *   title="Submit" 
 *   onPress={handleSubmit}
 *   disabled={!isFormValid}
 * />
 * ```
 * 
 * ==================================================================================
 */

import React from 'react';
import {
  TouchableOpacity,  // Pressable component dengan opacity animation
  Text,              // Text display component
  StyleSheet,        // Style definition utility
  ViewStyle,         // TypeScript type untuk View styling
  TextStyle,         // TypeScript type untuk Text styling
  ActivityIndicator, // Loading spinner component
} from 'react-native';

/* ==================================================================================
 * INTERFACE: CustomButtonProps
 * ==================================================================================
 * TypeScript interface untuk define props yang diterima component.
 * 
 * Interface Benefits:
 * - Type Safety: Error jika pass wrong prop type
 * - Autocomplete: IDE suggest available props
 * - Documentation: Self-documenting code
 * ==================================================================================
 */
interface CustomButtonProps {
  title: string;                      // Button text (REQUIRED)
  onPress: () => void;                // Callback function saat button di-tap (REQUIRED)
  style?: ViewStyle;                  // Custom container style (optional)
  textStyle?: TextStyle;              // Custom text style (optional)
  disabled?: boolean;                 // Disable button (default: false)
  loading?: boolean;                  // Show loading spinner (default: false)
  variant?: 'primary' | 'secondary' | 'link';  // Button variant (default: 'primary')
  size?: 'small' | 'medium' | 'large';         // Button size (default: 'medium')
}

/* ==================================================================================
 * COMPONENT: CustomButton
 * ==================================================================================
 * Functional component menggunakan React hooks pattern.
 * Export default untuk simplicity (import tanpa curly braces).
 * ==================================================================================
 */
export default function CustomButton({
  // STEP 1: Destructure props dengan default values
  title,
  onPress,
  style,
  textStyle,
  disabled = false,      // Default: button enabled
  loading = false,       // Default: not loading
  variant = 'primary',   // Default: blue button
  size = 'medium',       // Default: medium size
}: CustomButtonProps) {
  
  /* ================================================================================
   * HANDLER: handlePress()
   * ================================================================================
   * TUJUAN:
   * Wrapper untuk onPress callback dengan error handling dan logging.
   * 
   * FLOW:
   * 1. Check apakah button disabled atau loading
   * 2. Jika tidak, call onPress callback
   * 3. Wrap dalam try-catch untuk prevent app crash
   * 4. Log success/error untuk debugging
   * 
   * KENAPA PERLU WRAPPER?
   * - Error Handling: onPress bisa throw error, kita catch untuk prevent crash
   * - Debugging: Log semua button interactions untuk troubleshooting
   * - Validation: Ensure onPress hanya dipanggil jika button active
   * ================================================================================
   */
  const handlePress = () => {
    // STEP 1: Log button press untuk debugging
    console.log('🔘 CustomButton pressed:', title, 'disabled:', disabled, 'loading:', loading);
    
    // STEP 2: Validate apakah button bisa di-press
    // Button tidak bisa di-press jika:
    // - disabled = true (button manually disabled)
    // - loading = true (sedang loading)
    // - onPress undefined (no callback provided)
    if (!disabled && !loading && onPress) {
      try {
        // STEP 3: Call onPress callback
        onPress();
        
        // STEP 4: Log success
        console.log('✅ CustomButton onPress called successfully for:', title);
        
      } catch (error) {
        // STEP 5: Catch errors untuk prevent app crash
        // Log error tapi don't crash app
        console.error('❌ CustomButton onPress error for:', title, error);
      }
    } else {
      // STEP 6: Log blocked press untuk debugging
      // Membantu troubleshooting kenapa button tidak respond
      console.log('⚠️ CustomButton press blocked - disabled:', disabled, 'loading:', loading, 'onPress:', !!onPress);
    }
  };

  /* ================================================================================
   * STYLE COMPOSITION
   * ================================================================================
   * TUJUAN:
   * Combine multiple styles berdasarkan props (variant, size, disabled).
   * 
   * STYLE STRATEGY:
   * - Base Style: Always applied (baseButton)
   * - Variant Style: primaryButton, secondaryButton, atau linkButton
   * - Size Style: smallButton, mediumButton, atau largeButton
   * - State Style: disabledButton jika disabled = true
   * - Custom Style: style prop (override any defaults)
   * 
   * ARRAY OF STYLES:
   * React Native merges styles dari kiri ke kanan.
   * Style di kanan override style di kiri jika ada conflict.
   * ================================================================================
   */
  const buttonStyle = [
    styles.baseButton,                   // Base styling (border radius, shadow)
    styles[`${variant}Button`],          // Variant-specific (background color)
    styles[`${size}Button`],             // Size-specific (padding)
    disabled && styles.disabledButton,   // Disabled state (gray out)
    style,                               // Custom style (highest priority)
  ];

  const buttonTextStyle = [
    styles.baseText,                     // Base text styling (font weight, align)
    styles[`${variant}Text`],            // Variant-specific text color
    styles[`${size}Text`],               // Size-specific font size
    disabled && styles.disabledText,     // Disabled state text color
    textStyle,                           // Custom text style (highest priority)
  ];

  /* ================================================================================
   * RENDER
   * ================================================================================
   * Render TouchableOpacity dengan conditional content (loading spinner atau text).
   * ================================================================================
   */
  return (
    <TouchableOpacity
      // STEP 1: Apply combined styles
      style={buttonStyle}
      
      // STEP 2: Attach press handler
      onPress={handlePress}
      
      // STEP 3: Disable touch jika button disabled atau loading
      // disabled prop prevent onPress from firing
      disabled={disabled || loading}
      
      // STEP 4: Set opacity animation (0.7 = 70% opacity saat pressed)
      // Memberikan visual feedback ke user bahwa button di-tap
      activeOpacity={0.7}
      
      // STEP 5: Increase touch target area (accessibility)
      // hitSlop membuat area touch lebih besar dari visual button
      // Bagus untuk usability (easier to tap, especially untuk small buttons)
      // 15 pixels extra di semua sisi
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      
      // STEP 6: Accessibility props (for screen readers)
      // accessibilityRole: Tell screen reader this is a button
      // accessibilityLabel: Text yang dibaca oleh screen reader
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* STEP 7: Conditional rendering - loading spinner OR text */}
      {loading ? (
        // Show loading spinner jika loading = true
        <ActivityIndicator 
          // Spinner color: white untuk primary/secondary, blue untuk link
          color={variant === 'link' ? '#3498db' : 'white'} 
          size="small"  // Size: 'small' atau 'large'
        />
      ) : (
        // Show button text jika tidak loading
        <Text style={buttonTextStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

/* ==================================================================================
 * STYLES - STYLING DEFINITIONS DENGAN STYLESHEET API
 * ==================================================================================
 * 
 * StyleSheet.create() Benefits:
 * 1. Performance: Styles di-optimize oleh React Native
 * 2. Validation: Error jika style invalid
 * 3. Autocomplete: IDE dapat suggest valid style properties
 * 
 * Style Organization:
 * - Base Styles: Applied to all buttons
 * - Variant Styles: primaryButton, secondaryButton, linkButton
 * - Size Styles: smallButton, mediumButton, largeButton
 * - State Styles: disabledButton, disabledText
 * - Text Styles: Corresponding text styles untuk each variant/size
 * 
 * ==================================================================================
 */
const styles = StyleSheet.create({
  /* ================================================================================
   * BASE BUTTON STYLE - APPLIED TO ALL BUTTONS
   * ================================================================================
   */
  baseButton: {
    borderRadius: 12,                    // Rounded corners (modern design)
    alignItems: 'center',                // Center content horizontally
    justifyContent: 'center',            // Center content vertically
    
    // Shadow properties (iOS style shadow)
    shadowColor: '#000',                 // Black shadow
    shadowOffset: {
      width: 0,                          // Horizontal offset
      height: 2,                         // Vertical offset (shadow below button)
    },
    shadowOpacity: 0.25,                 // 25% opacity (subtle shadow)
    shadowRadius: 3.84,                  // Blur radius (soft shadow)
    
    // Elevation (Android style shadow)
    elevation: 5,                        // Higher = more shadow
  },
  
  /* ================================================================================
   * VARIANT STYLES - DIFFERENT BUTTON TYPES
   * ================================================================================
   */
  
  // Primary Button: Blue background (main actions)
  // Use case: Login, Submit, Confirm
  primaryButton: {
    backgroundColor: '#3498db',          // Blue color (Flat UI color palette)
  },
  
  // Secondary Button: Green background (secondary actions)
  // Use case: Register, Save, Add
  secondaryButton: {
    backgroundColor: '#27ae60',          // Green color (success/positive)
  },
  
  // Link Button: Transparent background (tertiary actions)
  // Use case: Cancel, Back, Forgot Password
  linkButton: {
    backgroundColor: 'transparent',      // No background
    shadowOpacity: 0,                    // No shadow
    elevation: 0,                        // No elevation
    paddingVertical: 12,                 // Less padding (text-like appearance)
    paddingHorizontal: 16,
  },
  
  /* ================================================================================
   * SIZE STYLES - DIFFERENT BUTTON SIZES
   * ================================================================================
   */
  
  // Small Button: Less padding, compact appearance
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  
  // Medium Button: Default size, balanced appearance
  mediumButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  
  // Large Button: More padding, prominent appearance
  largeButton: {
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  
  /* ================================================================================
   * STATE STYLES - DISABLED STATE
   * ================================================================================
   */
  
  // Disabled Button: Gray background, no shadow
  disabledButton: {
    backgroundColor: '#bdc3c7',          // Light gray (indicates disabled)
    shadowOpacity: 0,                    // Remove shadow
    elevation: 0,                        // Remove elevation
  },
  
  /* ================================================================================
   * TEXT STYLES - BUTTON TEXT STYLING
   * ================================================================================
   */
  
  // Base Text Style: Applied to all button text
  baseText: {
    fontWeight: '600',                   // Semi-bold (readable)
    textAlign: 'center',                 // Center align
  },
  
  // Primary Button Text: White color
  primaryText: {
    color: 'white',
  },
  
  // Secondary Button Text: White color
  secondaryText: {
    color: 'white',
  },
  
  // Link Button Text: Blue color (matches primary button)
  linkText: {
    color: '#3498db',
  },
  
  // Text Size Variants
  smallText: {
    fontSize: 14,                        // Smaller text
  },
  mediumText: {
    fontSize: 16,                        // Default text size
  },
  largeText: {
    fontSize: 18,                        // Larger text
  },
  
  // Disabled Text: Gray color
  disabledText: {
    color: '#7f8c8d',                    // Dark gray (low contrast = disabled)
  },
});