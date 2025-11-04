import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'small' | 'medium' | 'large';
}

export default function CustomButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
}: CustomButtonProps) {
  const handlePress = () => {
    console.log('🔘 CustomButton pressed:', title, 'disabled:', disabled, 'loading:', loading);
    if (!disabled && !loading && onPress) {
      try {
        onPress();
        console.log('✅ CustomButton onPress called successfully for:', title);
      } catch (error) {
        console.error('❌ CustomButton onPress error for:', title, error);
      }
    } else {
      console.log('⚠️ CustomButton press blocked - disabled:', disabled, 'loading:', loading, 'onPress:', !!onPress);
    }
  };

  const buttonStyle = [
    styles.baseButton,
    styles[`${variant}Button`],
    styles[`${size}Button`],
    disabled && styles.disabledButton,
    style,
  ];

  const buttonTextStyle = [
    styles.baseText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'link' ? '#3498db' : 'white'} 
          size="small" 
        />
      ) : (
        <Text style={buttonTextStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Variants
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#27ae60',
  },
  linkButton: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  
  // Sizes
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  largeButton: {
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  
  // Disabled state
  disabledButton: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Text styles
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  linkText: {
    color: '#3498db',
  },
  
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  disabledText: {
    color: '#7f8c8d',
  },
});