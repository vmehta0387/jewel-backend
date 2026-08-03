import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const SignupScreen = () => {
  const { signUp } = useAuth();
  const navigation = useNavigation<any>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !loading;

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      setSuccessVisible(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessOk = () => {
    setSuccessVisible(false);
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.brandRow}>
              <Image
                source={require('../../assets/login-logo.png')}
                style={styles.loginLogo}
              />
            </View>

            <View style={styles.cardContainer}>
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Create Account</Text>
                  <Text style={styles.formSubtitle}>Enter your details to register</Text>
                </View>

                {/* First Name & Last Name */}
                <View style={styles.row}>
                  <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>FIRST NAME *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="John"
                      placeholderTextColor="#A8A29A"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>LAST NAME *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Doe"
                      placeholderTextColor="#A8A29A"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>EMAIL *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="john.doe@example.com"
                    placeholderTextColor="#A8A29A"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                {/* Phone */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>PHONE (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor="#A8A29A"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                {/* Password */}
                <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                  <Text style={styles.label}>PASSWORD * (MIN 8 CHARS)</Text>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={[styles.input, styles.inputWithIcon]}
                      placeholder="**********"
                      placeholderTextColor="#A8A29A"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleSignup}
                    />
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#8D8780"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={styles.signUpTouch}
                  onPress={handleSignup}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                >
                  <View style={[styles.signUpBtn, !canSubmit && styles.signUpBtnDisabled]}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Ionicons name="flash-sharp" size={16} color="#D2A85B" style={styles.btnFlashIcon} />
                        <Text style={styles.signUpButtonText}>SignUp Now</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.bottomLinkContainer}>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.bottomLinkText}>
                      <Text style={styles.bottomLinkMuted}>Already have an account? </Text>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={30} color="#2F7D4E" />
            </View>
            <Text style={styles.successTitle}>Registration Successful</Text>
            <Text style={styles.successMessage}>
              Thank you for joining BLITZ NYC. Your registration has been received successfully.
              Login access will be enabled shortly after approval by an administrator.
            </Text>
            <TouchableOpacity style={styles.successButton} onPress={handleSuccessOk} activeOpacity={0.9}>
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 26, 21, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DED4',
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  successIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EAF5EE',
    borderWidth: 1,
    borderColor: '#CBE5D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    color: '#211812',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  successMessage: {
    marginTop: 10,
    color: '#6E6258',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  successButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#1F1712',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 40,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loginLogo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E9E6E0',
  },
  formContainer: {
    width: '100%',
  },
  formHeader: {
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 21,
    lineHeight: 24,
    color: '#171717',
    fontWeight: '700',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8E877F',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E877F',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: '#FCFBF9',
    borderWidth: 1,
    borderColor: '#D9D5CF',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    color: '#111111',
    fontSize: 15,
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
  signUpTouch: {
    marginTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 7,
  },
  signUpBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#111111',
  },
  signUpBtnDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnFlashIcon: {
    marginRight: 6,
  },
  signUpButtonText: {
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
    marginTop: 20,
    alignItems: 'center',
  },
  bottomLinkText: {
    color: '#97723F',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomLinkMuted: {
    color: '#8E877F',
  },
});

export default SignupScreen;
