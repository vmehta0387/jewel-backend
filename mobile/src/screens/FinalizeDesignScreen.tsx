import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchDesign } from '../api/designs';
import { createOrder, fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, formatNumber } from '../utils/format';

const uniqueValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));

const finalizeSteps = [
  {
    label: 'Metal',
    title: 'Select Metal',
    description: 'Choose the metal finish and sizing details that will carry into the order.',
  },
  {
    label: 'Stone',
    title: 'Stone Details',
    description: 'Review the stone shape, spread, setting, and quality before final approval.',
  },
  {
    label: 'Review',
    title: 'Review & Submit',
    description: 'Confirm shipping, quantity, and selections before creating the order.',
  },
] as const;

const FinalizeDesignScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'FinalizeDesign'>>();
  const { width: screenWidth } = useWindowDimensions();

  const [design, setDesign] = useState<Design | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStoneShape, setSelectedStoneShape] = useState('');
  const [selectedStoneSpread, setSelectedStoneSpread] = useState('');
  const [selectedSettingType, setSelectedSettingType] = useState('');
  const [selectedCaratWeight, setSelectedCaratWeight] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedMetalKarat, setSelectedMetalKarat] = useState('');
  const [selectedMetalColor, setSelectedMetalColor] = useState('');
  const [selectedRingSize, setSelectedRingSize] = useState('');
  const [step, setStep] = useState(0);

  const loadDesign = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await fetchDesign(token, route.params.designId);
      setDesign(data);
      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);
      if (shouldApplyPricing) {
        try {
          const preview = await fetchPricePreview(token, data.id, user?.companyId as string, user?.branchId as string);
          setDisplayPrice(preview.finalPrice ?? data.totalValue ?? 0);
        } catch {
          setDisplayPrice(data.totalValue ?? 0);
        }
      } else {
        setDisplayPrice(data.totalValue ?? 0);
      }

      const shapes = uniqueValues(data.gemstones?.map((gem) => gem.shape) || []);
      const qualities = uniqueValues(data.gemstones?.map((gem) => gem.quality) || []);
      const colors = uniqueValues(data.gemstones?.map((gem) => gem.color) || []);
      const settings = uniqueValues(data.gemstones?.map((gem) => gem.stoneType) || []);
      const caratWeight = data.gemstones
        ? formatNumber(
            data.gemstones.reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0),
            3,
          )
        : '';

      const metalKaratValues = uniqueValues(
        data.metals?.map((metal) => metal.metalCaratage || metal.goldColour || null) || [],
      );

      setSelectedStoneShape(shapes[0] || '');
      setSelectedQuality(qualities[0] || '');
      setSelectedMetalKarat(metalKaratValues[0] || '');
      setSelectedMetalColor(data.goldColour || colors[0] || '');
      setSelectedStoneSpread(data.diamondSpread || '');
      setSelectedSettingType(settings[0] || '');
      setSelectedCaratWeight(caratWeight);
      setSelectedRingSize(data.jewelrySize || '');
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [route.params.designId, token, user?.role, user?.companyId, user?.branchId]);

  useFocusEffect(
    useCallback(() => {
      loadDesign();
    }, [loadDesign]),
  );

  const derived = useMemo(() => {
    if (!design) return { polishedWt: 0, meleeCt: 0 };
    const polishedWt = design.metals?.reduce((sum, metal) => sum + Number(metal.netWt || 0), 0) || 0;
    const meleeCt = design.gemstones?.reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0) || 0;
    return { polishedWt, meleeCt };
  }, [design]);

  const isCompactLayout = screenWidth < 520;
  const currentStep = finalizeSteps[step];
  const fieldWidthStyle = isCompactLayout ? styles.fullWidth : styles.half;
  const progressPercent = ((step + 1) / finalizeSteps.length) * 100;

  const goNext = () => setStep((current) => Math.min(current + 1, finalizeSteps.length - 1));
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const handleCreateOrder = async () => {
    if (!token || !design) return;
    if (!user?.companyId || !user?.branchId) {
      setError('Company and branch must be assigned to create an order.');
      return;
    }

    const qty = Number(quantity) || 1;
    setSaving(true);
    setError(null);

    const selection = {
      stoneShape: selectedStoneShape,
      stoneSpread: selectedStoneSpread,
      settingType: selectedSettingType,
      caratWeight: selectedCaratWeight,
      quality: selectedQuality,
      metalKarat: selectedMetalKarat,
      metalColor: selectedMetalColor,
      ringSize: selectedRingSize,
    };

    const shortDescription = `Metal: ${selection.metalKarat || '-'} ${selection.metalColor || ''} | Size: ${selection.ringSize || '-'} | Spread: ${selection.stoneSpread || '-'}`;

    try {
      await createOrder(token, {
        companyId: user.companyId,
        branchId: user.branchId,
        designId: design.id,
        quantity: qty,
        deliveryDate: deliveryDate || undefined,
        shortDescription,
        notes: JSON.stringify({ selection }),
      });
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || 'Unable to create order');
    } finally {
      setSaving(false);
    }
  };

  if (!design) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.muted}>{error || 'Loading design...'}</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.headerCard, isCompactLayout ? styles.headerCardStacked : null]}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.88} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerEyebrow}>Design Checkout</Text>
            <Text style={styles.headerTitle}>Finalize Design</Text>
            <Text style={styles.headerSubtitle}>{design.designNo}</Text>
          </View>

          <View style={[styles.priceBadge, isCompactLayout ? styles.priceBadgeStacked : null]}>
            <Text style={styles.priceBadgeLabel}>Estimated price</Text>
            <Text style={styles.priceBadgeValue}>{formatCurrency(displayPrice)}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.stepOverview}>
          <View style={styles.stepOverviewHeader}>
            <View style={styles.stepHeadingBlock}>
              <Text style={styles.stepEyebrow}>Step {step + 1} of {finalizeSteps.length}</Text>
              <Text style={styles.stepOverviewTitle}>{currentStep.title}</Text>
            </View>
            <Text style={styles.stepCounter}>
              {step + 1}/{finalizeSteps.length}
            </Text>
          </View>

          <Text style={styles.stepOverviewDescription}>{currentStep.description}</Text>

          <View style={styles.stepper}>
            {finalizeSteps.map((item, index) => {
              const isActive = index === step;
              const isComplete = index < step;

              return (
                <View
                  key={item.label}
                  style={[
                    styles.stepChip,
                    isActive ? styles.stepChipActive : null,
                    isComplete ? styles.stepChipComplete : null,
                  ]}
                >
                  <View
                    style={[
                      styles.stepChipBadge,
                      isActive ? styles.stepChipBadgeActive : null,
                      isComplete ? styles.stepChipBadgeComplete : null,
                    ]}
                  >
                    {isComplete ? (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    ) : (
                      <Text
                        style={[
                          styles.stepChipBadgeText,
                          isActive ? styles.stepChipBadgeTextActive : null,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepChipText,
                      isActive || isComplete ? styles.stepChipTextActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {step === 0 ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Step 1</Text>
              <Text style={styles.sectionTitle}>{finalizeSteps[0].title}</Text>
              <Text style={styles.sectionHint}>
                Keep the base material choices aligned here before moving on to the stone settings.
              </Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldBlock, fieldWidthStyle]}>
                <Text style={styles.fieldLabel}>Metal Karat</Text>
                <View style={styles.pickerWrapper}>
                  <Picker style={styles.picker} selectedValue={selectedMetalKarat} onValueChange={setSelectedMetalKarat}>
                    {selectedMetalKarat ? null : <Picker.Item label="Select" value="" />}
                    {uniqueValues(
                      design.metals?.map((metal) => metal.metalCaratage || metal.goldColour || null) || [],
                    ).map((karat) => (
                      <Picker.Item key={karat} label={karat} value={karat} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.fieldBlock, fieldWidthStyle]}>
                <Text style={styles.fieldLabel}>Metal Color</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter metal color"
                  placeholderTextColor={colors.textMuted}
                  value={selectedMetalColor}
                  onChangeText={setSelectedMetalColor}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldBlock, styles.fullWidth]}>
                <Text style={styles.fieldLabel}>Ring Size</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter ring size"
                  placeholderTextColor={colors.textMuted}
                  value={selectedRingSize}
                  onChangeText={setSelectedRingSize}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Step 2</Text>
              <Text style={styles.sectionTitle}>{finalizeSteps[1].title}</Text>
              <Text style={styles.sectionHint}>
                Review the stone specifications so the final order reflects the correct details.
              </Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldBlock, fieldWidthStyle]}>
                <Text style={styles.fieldLabel}>Stone Shape</Text>
                <View style={styles.pickerWrapper}>
                  <Picker style={styles.picker} selectedValue={selectedStoneShape} onValueChange={setSelectedStoneShape}>
                    {selectedStoneShape ? null : <Picker.Item label="Select" value="" />}
                    {uniqueValues(design.gemstones?.map((gem) => gem.shape) || []).map((shape) => (
                      <Picker.Item key={shape} label={shape} value={shape} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.fieldBlock, fieldWidthStyle]}>
                <Text style={styles.fieldLabel}>Stone Spread</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    style={styles.picker}
                    selectedValue={selectedStoneSpread}
                    onValueChange={setSelectedStoneSpread}
                  >
                    {design.diamondSpread ? (
                      <Picker.Item label={design.diamondSpread} value={design.diamondSpread} />
                    ) : (
                      <Picker.Item label="Select" value="" />
                    )}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldBlock, fieldWidthStyle]}>
                <Text style={styles.fieldLabel}>Setting Type</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    style={styles.picker}
                    selectedValue={selectedSettingType}
                    onValueChange={setSelectedSettingType}
                  >
                    {selectedSettingType ? null : <Picker.Item label="Select" value="" />}
                    {uniqueValues(design.gemstones?.map((gem) => gem.stoneType) || []).map((setting) => (
                      <Picker.Item key={setting} label={setting} value={setting} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.fieldBlock, fieldWidthStyle]}>
                <Text style={styles.fieldLabel}>Carat Weight</Text>
                <TextInput style={[styles.input, styles.inputReadOnly]} value={selectedCaratWeight} editable={false} />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldBlock, styles.fullWidth]}>
                <Text style={styles.fieldLabel}>Diamond Quality</Text>
                <View style={styles.pickerWrapper}>
                  <Picker style={styles.picker} selectedValue={selectedQuality} onValueChange={setSelectedQuality}>
                    {selectedQuality ? null : <Picker.Item label="Select" value="" />}
                    {uniqueValues(design.gemstones?.map((gem) => gem.quality) || []).map((quality) => (
                      <Picker.Item key={quality} label={quality} value={quality} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </Card>
        ) : null}

        {step === 2 ? (
          <>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Step 3</Text>
                <Text style={styles.sectionTitle}>{finalizeSteps[2].title}</Text>
                <Text style={styles.sectionHint}>
                  Final details go here, followed by a quick visual review of everything selected.
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, fieldWidthStyle]}>
                  <Text style={styles.fieldLabel}>Estimated Shipping</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="dd-mm-yyyy"
                    placeholderTextColor={colors.textMuted}
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                  />
                </View>

                <View style={[styles.fieldBlock, fieldWidthStyle]}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, fieldWidthStyle]}>
                  <Text style={styles.fieldLabel}>Selected Metal</Text>
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewValue}>{selectedMetalKarat || '—'} {selectedMetalColor || ''}</Text>
                  </View>
                </View>

                <View style={[styles.fieldBlock, fieldWidthStyle]}>
                  <Text style={styles.fieldLabel}>Ring Size</Text>
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewValue}>{selectedRingSize || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, fieldWidthStyle]}>
                  <Text style={styles.fieldLabel}>Stone</Text>
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewValue}>{selectedStoneShape || '—'} • {selectedQuality || '—'}</Text>
                  </View>
                </View>

                <View style={[styles.fieldBlock, fieldWidthStyle]}>
                  <Text style={styles.fieldLabel}>Spread</Text>
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewValue}>{selectedStoneSpread || '—'}</Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Summary</Text>
                <Text style={styles.sectionTitle}>Order Snapshot</Text>
                <Text style={styles.sectionHint}>
                  A quick view of the core metrics before you create the order.
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCardWrap, fieldWidthStyle]}>
                  <StatCard label="Polished Wt" value={`${formatNumber(derived.polishedWt, 3)} g`} />
                </View>
                <View style={[styles.statCardWrap, fieldWidthStyle]}>
                  <StatCard label="Melee CT" value={`${formatNumber(derived.meleeCt, 3)} ct`} />
                </View>
                <View style={[styles.statCardWrap, styles.fullWidth]}>
                  <StatCard label="Total Price" value={formatCurrency(displayPrice)} />
                </View>
              </View>
            </Card>
          </>
        ) : null}

        <View style={styles.stepActions}>
          {step > 0 ? (
            <Button title="Back" variant="secondary" onPress={goBack} style={styles.actionButton} />
          ) : (
            <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} style={styles.actionButton} />
          )}

          {step < finalizeSteps.length - 1 ? (
            <Button title="Next" onPress={goNext} style={styles.actionButton} />
          ) : (
            <Button
              title="Create Order"
              onPress={handleCreateOrder}
              loading={saving}
              disabled={saving}
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  headerCardStacked: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 180,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  priceBadge: {
    minWidth: 136,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#D4E2EE',
    backgroundColor: '#F7FBFF',
  },
  priceBadgeStacked: {
    width: '100%',
  },
  priceBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  priceBadgeValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#F0C6C6',
    backgroundColor: '#FFF4F4',
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  stepOverview: {
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.9)',
    gap: spacing.md,
  },
  stepOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepHeadingBlock: {
    flex: 1,
  },
  stepEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  stepOverviewTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stepCounter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepOverviewDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepChip: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  stepChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FBFE',
  },
  stepChipComplete: {
    borderColor: '#BCD1E3',
    backgroundColor: '#EEF5FB',
  },
  stepChipBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1F4',
  },
  stepChipBadgeActive: {
    backgroundColor: colors.primary,
  },
  stepChipBadgeComplete: {
    backgroundColor: colors.primaryDark,
  },
  stepChipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepChipBadgeTextActive: {
    color: '#ffffff',
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepChipTextActive: {
    color: colors.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E6EDF4',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  sectionCard: {
    padding: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldBlock: {
    marginBottom: spacing.xs,
  },
  half: {
    flexGrow: 1,
    flexBasis: 220,
  },
  fullWidth: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    paddingLeft: 2,
  },
  pickerWrapper: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  picker: {
    height: 54,
    color: colors.text,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  inputReadOnly: {
    backgroundColor: '#F7FAFC',
    color: colors.textMuted,
  },
  reviewBox: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
  },
  reviewValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCardWrap: {
    flexGrow: 1,
    flexBasis: 220,
  },
  stepActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
  },
});

export default FinalizeDesignScreen;
