import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
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

const FinalizeDesignScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'FinalizeDesign'>>();

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
  const steps = ['Metal', 'Stone', 'Review'];
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

  const goNext = () => setStep((current) => Math.min(current + 1, steps.length - 1));
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
    <Screen>
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenHeader title="Finalize Design" subtitle={design.designNo} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.stepper}>
            {steps.map((label, index) => (
              <View key={label} style={[styles.stepChip, index <= step ? styles.stepChipActive : null]}>
                <Text style={[styles.stepChipText, index <= step ? styles.stepChipTextActive : null]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / steps.length) * 100}%` }]} />
          </View>

          {step === 0 ? (
            <Card>
              <Text style={styles.sectionTitle}>Step 1: Select Metal</Text>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Metal Karat</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedMetalKarat} onValueChange={setSelectedMetalKarat}>
                      {selectedMetalKarat ? null : <Picker.Item label="Select" value="" />}
                      {uniqueValues(
                        design.metals?.map((metal) => metal.metalCaratage || metal.goldColour || null) || [],
                      ).map((karat) => (
                        <Picker.Item key={karat} label={karat} value={karat} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Metal Color</Text>
                  <TextInput style={styles.input} value={selectedMetalColor} onChangeText={setSelectedMetalColor} />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Ring Size</Text>
                  <TextInput style={styles.input} value={selectedRingSize} onChangeText={setSelectedRingSize} />
                </View>
              </View>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <Text style={styles.sectionTitle}>Step 2: Stone Details</Text>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Stone Shape</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedStoneShape} onValueChange={setSelectedStoneShape}>
                      {selectedStoneShape ? null : <Picker.Item label="Select" value="" />}
                      {uniqueValues(design.gemstones?.map((gem) => gem.shape) || []).map((shape) => (
                        <Picker.Item key={shape} label={shape} value={shape} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Stone Spread</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedStoneSpread} onValueChange={setSelectedStoneSpread}>
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
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Setting Type</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedSettingType} onValueChange={setSelectedSettingType}>
                      {selectedSettingType ? null : <Picker.Item label="Select" value="" />}
                      {uniqueValues(design.gemstones?.map((gem) => gem.stoneType) || []).map((setting) => (
                        <Picker.Item key={setting} label={setting} value={setting} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Carat Weight</Text>
                  <TextInput style={styles.input} value={selectedCaratWeight} editable={false} />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldBlock, styles.half]}>
                  <Text style={styles.fieldLabel}>Diamond Quality</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedQuality} onValueChange={setSelectedQuality}>
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
              <Card>
                <Text style={styles.sectionTitle}>Step 3: Review</Text>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldBlock, styles.half]}>
                    <Text style={styles.fieldLabel}>Estimated Shipping</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="dd-mm-yyyy"
                      value={deliveryDate}
                      onChangeText={setDeliveryDate}
                    />
                  </View>
                  <View style={[styles.fieldBlock, styles.half]}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldBlock, styles.half]}>
                    <Text style={styles.fieldLabel}>Selected Metal</Text>
                    <Text style={styles.reviewValue}>{selectedMetalKarat || '—'} {selectedMetalColor || ''}</Text>
                  </View>
                  <View style={[styles.fieldBlock, styles.half]}>
                    <Text style={styles.fieldLabel}>Ring Size</Text>
                    <Text style={styles.reviewValue}>{selectedRingSize || '—'}</Text>
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldBlock, styles.half]}>
                    <Text style={styles.fieldLabel}>Stone</Text>
                    <Text style={styles.reviewValue}>{selectedStoneShape || '—'} • {selectedQuality || '—'}</Text>
                  </View>
                  <View style={[styles.fieldBlock, styles.half]}>
                    <Text style={styles.fieldLabel}>Spread</Text>
                    <Text style={styles.reviewValue}>{selectedStoneSpread || '—'}</Text>
                  </View>
                </View>
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>Summary</Text>
                <View style={styles.statsRow}>
                  <StatCard label="Polished Wt" value={`${formatNumber(derived.polishedWt, 3)} g`} />
                  <StatCard label="Melee CT" value={`${formatNumber(derived.meleeCt, 3)} ct`} />
                </View>
                <View style={styles.statsRow}>
                  <StatCard label="Total Price" value={formatCurrency(displayPrice)} />
                </View>
              </Card>
            </>
          ) : null}

          <View style={styles.stepActions}>
            {step > 0 ? (
              <Button title="Back" variant="ghost" onPress={goBack} style={styles.actionButton} />
            ) : null}
            {step < steps.length - 1 ? (
              <Button title="Next" onPress={goNext} style={styles.actionButton} />
            ) : (
              <Button title={saving ? 'Saving...' : 'Create Order'} onPress={handleCreateOrder} disabled={saving} style={styles.actionButton} />
            )}
          </View>
        </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
  stepper: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  stepChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepChipTextActive: {
    color: colors.primaryDark,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldBlock: {
    marginBottom: spacing.sm,
  },
  half: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: '#fff',
  },
  reviewValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

export default FinalizeDesignScreen;
