import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const {
    signIn,
    biometricAvailable,
    biometricEnabled,
    biometricPrompted,
    setBiometricPreference,
    biometricSignIn,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    try {
      await biometricSignIn();
    } catch (err: any) {
      setError(err?.message || 'Biometric authentication failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Gradient Background echoing the warm "champagne" look */}
      <LinearGradient 
        colors={['#FBF9F6', '#F5EEE6', '#EAD6C3']} 
        style={StyleSheet.absoluteFillObject} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          
          {/* Brand Header */}
          <View style={styles.brandRow}>
             {/* Gold Lightning Bolt */}
             <Ionicons name="flash-sharp" size={42} color="#C59A39" style={styles.brandIcon} />
            
            <Text style={styles.brandTitle}>BLITZ</Text>
            <Text style={styles.brandSubtitle}>NEW YORK CITY</Text>
            <View style={styles.tinyLine} />
          </View>

          {/* Floating Neumorphic Card */}
          <View style={styles.cardContainer}>
            <View style={styles.formContainer}>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#A8A29A"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, styles.passwordInputFocus]}
                    placeholder="••••••••••"
                    placeholderTextColor="#A8A29A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((prev) => !prev)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#A8A29A" />
                  </TouchableOpacity>
                </View>

                {biometricAvailable && biometricEnabled ? (
                  <TouchableOpacity style={styles.forgotBtn} onPress={handleBiometricLogin}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="finger-print" size={14} color="#A48252" style={{ marginRight: 4 }} />
                      <Text style={styles.forgotText}>Unlock with biometrics</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* Gradient Gold Sign In Button */}
              <TouchableOpacity 
                style={[styles.signInTouch, loading && styles.signInDisabled]} 
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#D8AB52', '#C6973F', '#A37728']}
                  start={{ x: 0, y: 0.2 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                     <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Ionicons name="flash-sharp" size={16} color="#FFF" style={styles.btnFlashIcon} />
                      <Text style={styles.signInButtonText}>Sign in instantly</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.bottomLinkContainer}>
                <Text style={styles.bottomLinkText}>Need access? Contact your admin</Text>
              </View>

            </View>
          </View>
          
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F6', 
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 26,
    paddingBottom: 40,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  iconGradientWrapper: {
    // optional gradient wrapper for the icon background if needed, here just transparent
    backgroundColor: 'transparent',
  },
  brandIcon: {
    marginBottom: 4,
    textShadowColor: 'rgba(197, 154, 57, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1816',
    letterSpacing: 4.5,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#A98858',
    letterSpacing: 3,
    marginBottom: 16,
  },
  tinyLine: {
    width: 24,
    height: 1.5,
    backgroundColor: '#A98858',
    opacity: 0.6,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FAF7F3', // Light Ivory Card
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    // Neumorphic floating shadow
    shadowColor: '#AFA191',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
    // Inner light border wrapper for 3D effect
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A0978C',
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: '#FCFCFB',
    borderWidth: 1,
    borderColor: '#E8E1D7',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    color: '#1C1916',
    fontSize: 15,
  },
  passwordInputFocus: {
    borderColor: '#D4B886', // Giving password input a slight golden warmth border similar to image
  },
  inputGroup: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  iconButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    color: '#A48252',
    fontSize: 13,
    fontWeight: '500',
  },
  signInTouch: {
    marginTop: 20,
    shadowColor: '#B88B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  signInDisabled: {
    opacity: 0.7,
  },
  gradientBtn: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnFlashIcon: {
    marginRight: 6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#D9534F',
    marginBottom: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  bottomLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  bottomLinkText: {
    color: '#B6AB9F',
    fontSize: 13,
    fontWeight: '400',
  },
});

export default LoginScreen;
